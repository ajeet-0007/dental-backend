import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as mysql from 'mysql2/promise';

/**
 * Repairs product text fields corrupted by the bulk CSV import, which decoded
 * Windows-1252 uploads as UTF-8 and stored U+FFFD (�) in place of special
 * characters (bullet •, ×, µm, °C, en dash –, apostrophe ').
 *
 * Usage:
 *   npm run fix:fffd            # dry-run: compute + write diff report, no DB writes
 *   npm run fix:fffd -- --apply # apply the fixes
 */

const RICH_TEXT_COLUMNS = [
  'name',
  'description',
  'shortDescription',
  'features',
  'keySpecifications',
  'packaging',
  'directionToUse',
  'additionalInfo',
  'warranty',
];

function fixUfffd(str: string | null | undefined): string | null | undefined {
  if (!str) return str;

  let s = str;

  // 1. Bullet points at start of line: "� Plug & Scan" -> "• Plug & Scan"
  s = s.replace(/(^|\r?\n)[ \t]*\uFFFD/g, '$1•');

  // 1b. Bullet points lost as literal '?': "\n? Permanent" -> "\n• Permanent"
  s = s.replace(/(^|\r?\n)[ \t]*\? (?=[A-Z])/g, '$1• ');

  // 2. Degrees Celsius: "135�C", "24 �C", "135?�C." -> "135°C"
  //    `\b` after C keeps "1 � Charging" from being misread as "°C"
  s = s.replace(/(\d+)\s*\??\s*\uFFFD\s*C\b/gi, '$1°C');

  // 3. Minutes/seconds prime marks: "2�30\"" -> "2'30\""
  s = s.replace(/(\d)\uFFFD(\d{1,2}")/g, "$1'$2");

  // 4. Micrometers: "20 �m", "200 �m", "20\uFFFDm" -> "20 µm"
  s = s.replace(/(\d+)\s*\??\s*\uFFFD\s*m\b/gi, '$1 µm');

  // 5. Degrees Fahrenheit: "77.0 �F", "77.0\uFFFD F" -> "77.0 °F"
  s = s.replace(/(\d+)\s*\??\s*\uFFFD\s*F\b/gi, '$1 °F');

  // 5b. Micrometer/microsecond units lost as literal '?': "20 ?m" -> "20 µm", "5 ?s" -> "5 µs"
  s = s.replace(/(\d+)\s*\?\s*(?=[ms]\b)/gi, '$1 µ');

  // 5d. Square centimeters: "1470 mW/cm�" -> "1470 mW/cm²"
  s = s.replace(/(?<=\/cm)\uFFFD/g, '²');

  // 5c. Literal '?' that replaced a space between a number and a unit:
  //     "1.60?mm" -> "1.60 mm", "0.21?MPa" -> "0.21 MPa", "<65?dB" -> "<65 dB".
  //     Hex lookbehind excludes URL query strings like "0xab12?sa=X".
  s = s.replace(/(?<![0-9a-fA-F])(\d+)\?(?=[A-Za-z])/g, '$1 ');

  // 6. Program-mode ranges: "T1�T5" -> "T1–T5"
  s = s.replace(/(T\d)\uFFFD(?=T\d)/gi, '$1–');

  // 6b. Quantity + ratio (has a colon, not a range): "1 � 16:1" -> "1 × 16:1"
  s = s.replace(/(?<![0-9:])(\d+)\s*\uFFFD\s*(\d+:\d)/g, '$1 × $2');

  // 7. Numeric ranges: "100�240 V", "4�30 minutes" -> "100–240 V"
  s = s.replace(/(\d)\s*\uFFFD\s*(?=\d)/g, '$1–');

  // 8. Angle ranges with degree marks on both sides: "110��183�" -> "110°–183°"
  s = s.replace(/(\d+)\s*\uFFFD\s*\uFFFD\s*(\d+)\s*\uFFFD(?=[^A-Za-z0-9]|$)/g, '$1°–$2°');

  // 9. Number followed by a word: magnification ≤9 -> "×", angle >=10 -> "°"
  //    e.g. "3 � optical magnification" -> "3×", "48 � ergonomic angle" -> "48°"
  s = s.replace(/(\d+)\s*\uFFFD\s+(?=[A-Za-z])/g, (m, num: string) =>
    Number(num) <= 9 ? `${num} × ` : `${num}° `,
  );

  // 10. Trailing degree marks before punctuation: "300�;", "183�." -> "300°"
  s = s.replace(/(\d+)\uFFFD(?=[\s,.;:)"'\-])/g, '$1°');

  // 11. Known French legal suffix: "S�rl" -> "Sàrl"
  s = s.replace(/S\uFFFDrl/g, 'Sàrl');

  // 12. Apostrophes: "Moon�s", "it�s", "doesn�t" -> "'"
  s = s.replace(/(\w)\uFFFD(?=[stST])/g, "$1'");

  // 13. Any remaining degree-C-like context: "135?�C" -> "135?°C"
  s = s.replace(/\uFFFD\s*C\b/gi, '°C');

  // 14. Default: en dash (addresses, label separators, remaining ambiguous gaps)
  s = s.replace(/\uFFFD/g, '–');

  return s;
}

interface Change {
  table: string;
  id: string;
  column: string;
  before: string;
  after: string;
}

async function main() {
  const apply = process.argv.includes('--apply');

  const conn = await mysql.createConnection({
    host: process.env.MYSQL_DATABASE_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_DATABASE_PORT || '3306', 10),
    user: process.env.MYSQL_DATABASE_USER || 'root',
    password: process.env.MYSQL_DATABASE_PASSWORD || '',
    database: process.env.MYSQL_DATABASE_NAME || 'dentalkart',
    ssl: { rejectUnauthorized: false },
  });

  const changes: Change[] = [];

  const [products] = await conn.execute(
    `SELECT id, ${RICH_TEXT_COLUMNS.map((c) => `\`${c}\``).join(', ')} FROM \`products\``,
  );
  for (const p of products as any[]) {
    for (const col of RICH_TEXT_COLUMNS) {
      const fixed = fixUfffd(p[col]);
      if (fixed !== p[col]) {
        changes.push({ table: 'products', id: String(p.id), column: col, before: p[col] || '', after: fixed || '' });
      }
    }
  }

  const [orderItems] = await conn.execute(
    'SELECT id, `productName` FROM `order_items` WHERE `productName` LIKE ?',
    [`%${'\uFFFD'}%`],
  );
  for (const oi of orderItems as any[]) {
    const fixed = fixUfffd(oi.productName);
    if (fixed !== oi.productName) {
      changes.push({ table: 'order_items', id: String(oi.id), column: 'productName', before: oi.productName || '', after: fixed || '' });
    }
  }

  await conn.end();

  const rowCount = new Set(changes.map((c) => `${c.table}:${c.id}`)).size;
  const columnsAffected = new Set(changes.map((c) => `${c.table}.${c.column}`));

  console.log(`Total changed values: ${changes.length}`);
  console.log(`Affected rows: ${rowCount}`);
  console.log(`Affected columns: ${[...columnsAffected].join(', ')}`);

  if (changes.length === 0) {
    console.log('Nothing to fix.');
    return;
  }

  if (!apply) {
    const logDir = path.join(__dirname, '..', '..', 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    const reportPath = path.join(logDir, 'fffd-repair-report.txt');
    const lines = changes.map((c, i) => {
      const header = `[${i + 1}/${changes.length}] ${c.table}.${c.column} (id=${c.id})`;
      return `${header}\n  BEFORE: ${truncate(c.before)}\n  AFTER:  ${truncate(c.after)}\n`;
    });
    fs.writeFileSync(reportPath, lines.join('\n'));
    console.log(`Dry-run complete. Full diff written to ${reportPath}`);
    console.log('Run with --apply to write changes to the database.');
    return;
  }

  const conn2 = await mysql.createConnection({
    host: process.env.MYSQL_DATABASE_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_DATABASE_PORT || '3306', 10),
    user: process.env.MYSQL_DATABASE_USER || 'root',
    password: process.env.MYSQL_DATABASE_PASSWORD || '',
    database: process.env.MYSQL_DATABASE_NAME || 'dentalkart',
    ssl: { rejectUnauthorized: false },
  });

  await conn2.beginTransaction();
  try {
    const byColumn = new Map<string, Change[]>();
    for (const c of changes) {
      const key = `${c.table}.${c.column}`;
      if (!byColumn.has(key)) byColumn.set(key, []);
      byColumn.get(key)!.push(c);
    }
    for (const [key, group] of byColumn) {
      const [table, column] = key.split('.');
      const chunks: Change[][] = [];
      for (let i = 0; i < group.length; i += 200) chunks.push(group.slice(i, i + 200));
      for (const chunk of chunks) {
        const cases = chunk.map((c) => 'WHEN ? THEN ?').join(' ');
        const params: any[] = [];
        for (const c of chunk) params.push(c.id, c.after);
        await conn2.execute(
          `UPDATE \`${table}\` SET \`${column}\` = CASE \`id\` ${cases} END WHERE \`id\` IN (${chunk.map(() => '?').join(', ')})`,
          [...params, ...chunk.map((c) => c.id)],
        );
      }
    }
    await conn2.commit();
    console.log(`Applied ${changes.length} fixes across ${rowCount} rows.`);
  } catch (err) {
    await conn2.rollback();
    throw err;
  } finally {
    await conn2.end();
  }
}

function truncate(s: string, max = 400): string {
  const singleLine = s.replace(/\s+/g, ' ');
  return singleLine.length > max ? `${singleLine.slice(0, max)}...` : singleLine;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { fixUfffd };
