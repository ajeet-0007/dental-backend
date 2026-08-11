const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

const WIN1252_HIGH = [
  0x20ac, 0xfffd, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021,
  0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0xfffd, 0x017d, 0xfffd,
  0xfffd, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
  0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0xfffd, 0x017e, 0x0178,
];

function decodeWin1252Byte(byte: number): string {
  if (byte < 0x80) return String.fromCharCode(byte);
  if (byte >= 0xa0) return String.fromCharCode(byte);
  const cp = WIN1252_HIGH[byte - 0x80];
  return cp === 0xfffd ? '\uFFFD' : String.fromCharCode(cp);
}

/**
 * Decodes an uploaded CSV buffer to a string, tolerating both UTF-8 and
 * Windows-1252/Latin-1 (the encoding Excel produces by default).
 *
 * Previously buffers were decoded with `buffer.toString('utf-8')`, which
 * silently turns every non-UTF-8 byte into U+FFFD (�), corrupting special
 * characters like bullet points (•), the multiplication sign (×), µm and °C.
 * This decoder walks the bytes, consuming valid UTF-8 sequences where present
 * and treating any remaining high byte as a Windows-1252 character.
 */
export function decodeCsvBuffer(buffer: Buffer): string {
  const buf = buffer.length >= 3 && buffer.subarray(0, 3).equals(UTF8_BOM)
    ? buffer.subarray(3)
    : buffer;

  const decoder = new TextDecoder('utf-8', { fatal: true });
  let out = '';
  let i = 0;

  while (i < buf.length) {
    const byte = buf[i];

    if (byte < 0x80) {
      out += String.fromCharCode(byte);
      i++;
      continue;
    }

    let len = 0;
    if (byte >= 0xc2 && byte <= 0xdf) len = 2;
    else if (byte >= 0xe0 && byte <= 0xef) len = 3;
    else if (byte >= 0xf0 && byte <= 0xf4) len = 4;

    if (len > 0 && i + len <= buf.length) {
      try {
        out += decoder.decode(buf.subarray(i, i + len));
        i += len;
        continue;
      } catch {
        // not a valid UTF-8 sequence — treat as Windows-1252
      }
    }

    out += decodeWin1252Byte(byte);
    i++;
  }

  return out;
}
