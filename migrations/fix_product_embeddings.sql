-- Drop and recreate with HNSW index
DROP TABLE IF EXISTS product_embeddings;

CREATE TABLE public.product_embeddings (
  id uuid not null default gen_random_uuid (),
  product_id integer null,
  content text null,
  embedding public.vector(1536) null,
  metadata jsonb null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint product_embeddings_pkey primary key (id),
  constraint product_embeddings_product_id_key unique (product_id)
) TABLESPACE pg_default;

-- HNSW index (supports up to 1536 dims)
CREATE INDEX product_embeddings_embedding_idx 
ON public.product_embeddings USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64) TABLESPACE pg_default;