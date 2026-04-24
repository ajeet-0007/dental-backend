import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import * as mysql from 'mysql2/promise';

async function embedProducts() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const configService = app.get(ConfigService);

  const ollamaHost = configService.get('OLLAMA_BASE_URL', 'https://ollama.com');
  const openaiApiKey = configService.get('OPENROUTER_API_KEY');
  const ollamaModel = configService.get('OLLAMA_MODEL', 'llama3.2');
  const ollamaEmbedModel = configService.get('OLLAMA_EMBED_MODEL', 'nomic-embed-text');

  const supabaseUrl = configService.get('SUPABASE_URL');
  const supabaseKey = configService.get('SUPABASE_SERVICE_KEY');

  const mysqlHost = configService.get('MYSQL_DATABASE_HOST');
  const mysqlPort = configService.get('MYSQL_DATABASE_PORT');
  const mysqlUser = configService.get('MYSQL_DATABASE_USER');
  const mysqlPassword = configService.get('MYSQL_DATABASE_PASSWORD');
  const mysqlDatabase = configService.get('MYSQL_DATABASE_NAME');

  const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: openaiApiKey,
    });

  const supabase = createClient(supabaseUrl!, supabaseKey!);
  const tableName = 'product_embeddings';

  console.log('Connecting to MySQL...');
  const mysqlConnection = await mysql.createConnection({
    host: mysqlHost,
    port: mysqlPort,
    user: mysqlUser,
    password: mysqlPassword,
    database: mysqlDatabase,
  });

  console.log('Fetching products from MySQL...');
  const [products] = await mysqlConnection.execute(`
    SELECT p.id, p.name, p.description, p.shortDescription, p.slug, 
           p.price, p.sellingPrice, p.brand
    FROM products p
    WHERE p.isActive = 1
    LIMIT 50
  `);

  console.log(`Found ${(products as any[]).length} products to embed`);

  for (let i = 0; i < (products as any[]).length; i++) {
    const product = (products as any[])[i];
    console.log(`Embedding product ${i + 1}/${(products as any[]).length}: ${product.name}`);

    const chunkText = `
Product Name: ${product.name}
Brand: ${product.brand || 'Unknown'}
Price: ₹${product.sellingPrice || product.price || 0}
Short Description: ${product.shortDescription || 'N/A'}
Description: ${product.description || 'N/A'}
    `.trim();

    try {
      const embeddingResponse = await openrouter.embeddings.create({
        model: 'openai/text-embedding-3-small',
        input: chunkText,
      });

      const { error } = await supabase
        .from(tableName)
        .upsert(
          {
            product_id: product.id,
            content: chunkText,
            embedding: embeddingResponse.data[0].embedding,
            metadata: {
              name: product.name,
              brand: product.brand,
              price: product.sellingPrice || product.price,
              slug: product.slug,
            },
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'product_id',
          }
        );

      if (error) {
        console.error(`  ✗ Error: ${error.message}`);
      } else {
        console.log(`  ✓ Embedded successfully`);
      }
    } catch (error: any) {
      console.error(`  ✗ Error embedding product: ${error.message}`);
    }
  }

  console.log('\n✅ Embedding complete!');

  const { count } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  console.log(`Total embeddings in database: ${count}`);

  await mysqlConnection.end();
  await app.close();
}

embedProducts().catch(console.error);