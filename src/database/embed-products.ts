import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import * as mysql from 'mysql2/promise';
import axios from 'axios';

async function embedAll() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const configService = app.get(ConfigService);

  const nvidiaApiKey = configService.get('NVIDIA_API_KEY');
  const nvidiaBaseUrl = 'https://integrate.api.nvidia.com/v1';
  const nvidiaEmbedModel = 'nvidia/llama-nemotron-embed-1b-v2';
  const supabaseUrl = configService.get('SUPABASE_URL');
  const supabaseKey = configService.get('SUPABASE_SERVICE_KEY');

  const mysqlConfig = {
    host: configService.get('MYSQL_DATABASE_HOST'),
    port: configService.get('MYSQL_DATABASE_PORT'),
    user: configService.get('MYSQL_DATABASE_USER'),
    password: configService.get('MYSQL_DATABASE_PASSWORD'),
    database: configService.get('MYSQL_DATABASE_NAME'),
  };

  const supabase = createClient(supabaseUrl!, supabaseKey!);
  const tableName = 'product_embeddings';

  console.log('Connecting to MySQL...');
  const conn = await mysql.createConnection(mysqlConfig);

  const embed = async (text: string): Promise<number[]> => {
    const res = await axios.post(`${nvidiaBaseUrl}/embeddings`, {
      model: nvidiaEmbedModel,
      input: text,
      input_type: 'query',
      dimensions: 1536,
    }, {
      headers: {
        'Authorization': `Bearer ${nvidiaApiKey}`,
        'Content-Type': 'application/json',
      },
    });
    const embedding = res.data.data[0]?.embedding || [];
    if (embedding.length !== 1536) {
      console.log(`  WARNING: Embedding dimension is ${embedding.length}, expected 1536`);
    }
    return embedding;
    return embedding;
  };

  const upsertEmbedding = async (
    id: number,
    content: string,
    embedding: number[],
    metadata: any,
  ) => {
    if (embedding.length === 0) {
      console.log(`  ERROR: Empty embedding for id ${id}`);
      return;
    }
    
    const { data, error } = await supabase.from(tableName).upsert(
      {
        product_id: id,
        content,
        embedding,
        metadata,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'product_id' },
    );
    
    if (error) {
      console.log(`  ERROR upserting id ${id}:`, error.message);
    }
    return { data, error };
  };

  // 1. EMBED PRODUCTS with full info
  console.log('\n=== EMBEDDING PRODUCTS ===');
  const [products] = await conn.execute(`
    SELECT p.id, p.name, p.slug, p.price, p.sellingPrice, p.brand,
           p.shortDescription, p.description,
           c.name as category
    FROM products p
    LEFT JOIN categories c ON p.categoryId = c.id
    WHERE p.isActive = 1
  `);

  const productArray = products as any[];
  console.log(`Found ${productArray.length} products`);

  for (let i = 0; i < productArray.length; i++) {
    const p = productArray[i];
    const content = [
      `Product: ${p.name}`,
      `Brand: ${p.brand || 'Generic'}`,
      `Category: ${p.category || 'Dental'}`,
      `Price: ₹${p.sellingPrice || p.price || 0}`,
      `Description: ${p.description || p.shortDescription || 'N/A'}`,
    ].filter(Boolean).join('\n');

    const embedding = await embed(content);
    await upsertEmbedding(p.id, content, embedding, {
      name: p.name,
      brand: p.brand,
      category: p.category,
      price: p.sellingPrice || p.price,
      slug: p.slug,
      type: 'product',
    });

    if ((i + 1) % 20 === 0) console.log(`  Progress: ${i + 1}/${productArray.length}`);
  }
  console.log(`✓ ${productArray.length} products embedded`);

  // 2. EMBED PRODUCT VARIANTS
  console.log('\n=== EMBEDDING VARIANTS ===');
  const [variants] = await conn.execute(`
    SELECT pv.id, pv.name, pv.sku, pv.price, pv.sellingPrice,
           pv.weight, pv.weightUnit, pv.color, pv.size, pv.flavor, pv.packQuantity,
           p.name as productName, p.slug as productSlug, p.brand, c.name as category
    FROM product_variants pv
    LEFT JOIN products p ON pv.productId = p.id
    LEFT JOIN categories c ON p.categoryId = c.id
    WHERE pv.isActive = 1 AND p.isActive = 1
  `);

  const variantArray = variants as any[];
  console.log(`Found ${variantArray.length} variants`);

  for (let i = 0; i < variantArray.length; i++) {
    const v = variantArray[i];
    const details = [
      v.weight ? `${v.weight}${v.weightUnit || 'g'}` : null,
      v.color ? `Color: ${v.color}` : null,
      v.size ? `Size: ${v.size}` : null,
      v.flavor ? `Flavor: ${v.flavor}` : null,
      v.packQuantity ? `Pack Qty: ${v.packQuantity}` : null,
    ].filter(Boolean).join(', ');

    const content = [
      `Variant: ${v.name}`,
      `Product: ${v.productName}`,
      `SKU: ${v.sku || 'N/A'}`,
      `Brand: ${v.brand || 'Generic'}`,
      `Category: ${v.category || 'Dental'}`,
      `Price: ₹${v.sellingPrice || v.price}`,
      details ? `Options: ${details}` : null,
    ].filter(Boolean).join('\n');

    const embedding = await embed(content);
    await upsertEmbedding(parseInt(v.id), content, embedding, {
      name: v.name,
      productName: v.productName,
      brand: v.brand,
      category: v.category,
      price: v.sellingPrice || v.price,
      slug: v.productSlug,
      type: 'variant',
      variantId: v.id,
      sku: v.sku,
    });

    if ((i + 1) % 10 === 0) console.log(`  Progress: ${i + 1}/${variantArray.length}`);
  }
  console.log(`✓ ${variantArray.length} variants embedded`);

  // 3. EMBED BRANDS
  console.log('\n=== EMBEDDING BRANDS ===');
  const [brands] = await conn.execute(`
    SELECT b.id, b.name, b.description,
           COUNT(p.id) as productCount
    FROM brands b
    LEFT JOIN products p ON p.brand = b.name AND p.isActive = 1
    GROUP BY b.id, b.name, b.description
    ORDER BY b.name
  `);

  const brandArray = brands as any[];
  console.log(`Found ${brandArray.length} brands`);

  for (let i = 0; i < brandArray.length; i++) {
    const b = brandArray[i];
    const content = [
      `Brand: ${b.name}`,
      `Description: ${b.description || 'Leading dental products manufacturer'}`,
      `Products: ${b.productCount} items available`,
      `Category: Dental Supplies Manufacturer`,
    ].join('\n');

    const embedding = await embed(content);
    await upsertEmbedding(b.id + 100000, content, embedding, {
      name: b.name,
      description: b.description,
      type: 'brand',
      productCount: b.productCount,
      brandId: b.id,
      slug: b.name.toLowerCase().replace(/\s+/g, '-'),
    });

    console.log(`  ✓ ${b.name}`);
  }
  console.log(`✓ ${brandArray.length} brands embedded`);

  // 4. EMBED CATEGORIES
  console.log('\n=== EMBEDDING CATEGORIES ===');
  const [categories] = await conn.execute(`
    SELECT c.id, c.name, c.description,
           COUNT(p.id) as productCount
    FROM categories c
    LEFT JOIN products p ON p.categoryId = c.id AND p.isActive = 1
    GROUP BY c.id, c.name, c.description
    ORDER BY c.name
  `);

  const categoryArray = categories as any[];
  console.log(`Found ${categoryArray.length} categories`);

  for (const cat of categoryArray) {
    const content = [
      `Category: ${cat.name}`,
      `Description: ${cat.description || 'Dental product category'}`,
      `Products: ${cat.productCount} items available`,
      `Type: Dental Product Category`,
    ].join('\n');

    const embedding = await embed(content);
    await upsertEmbedding(cat.id + 200000, content, embedding, {
      name: cat.name,
      description: cat.description,
      type: 'category',
      productCount: cat.productCount,
      categoryId: cat.id,
      slug: cat.name.toLowerCase().replace(/\s+/g, '-'),
    });

    console.log(`  ✓ ${cat.name}`);
  }
  console.log(`✓ ${categoryArray.length} categories embedded`);

  // 5. EMBED DEPARTMENTS
  console.log('\n=== EMBEDDING DEPARTMENTS ===');
  const [departments] = await conn.execute(`
    SELECT d.id, d.name, d.description
    FROM departments d
    ORDER BY d.name
  `);

  const deptArray = departments as any[];
  console.log(`Found ${deptArray.length} departments`);

  for (const d of deptArray) {
    const content = [
      `Department: ${d.name}`,
      `Description: ${d.description || 'Dental department'}`,
      `Type: Dental Department`,
    ].join('\n');

    const embedding = await embed(content);
    await upsertEmbedding(d.id + 300000, content, embedding, {
      name: d.name,
      description: d.description,
      type: 'department',
      departmentId: d.id,
      slug: d.name.toLowerCase().replace(/\s+/g, '-'),
    });

    console.log(`  ✓ ${d.name}`);
  }
  console.log(`✓ ${deptArray.length} departments embedded`);

  // Summary
  const { count } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  console.log(`\n✅ COMPLETE! Total embeddings: ${count}`);
  console.log(`  - ${productArray.length} products`);
  console.log(`  - ${variantArray.length} variants`);
  console.log(`  - ${brandArray.length} brands`);
  console.log(`  - ${categoryArray.length} categories`);
  console.log(`  - ${deptArray.length} departments`);

  await conn.end();
  await app.close();
}

embedAll().catch(console.error);