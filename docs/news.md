# News Module

**Location:** `src/modules/news/`

## Purpose

Fetches dental industry news via Tavily API on a scheduled cron job (daily at midnight). Serves latest news to the frontend.

---

## Flow Diagram

```
Schedule (Cron)                   NewsCronService                   External
  │                                    │                              │
  │ @Cron(EVERY_DAY_AT_MIDNIGHT)       │                              │
  │ ───────────────────────────────►   │                              │
  │                                    │  fetchDentalNews():          │
  │                                    │  Call Tavily API search      │
  │                                    │  query: "dental industry     │
  │                                    │    news India 2025"          │
  │                                    │ ──── Tavily ─────────────►  │
  │                                    │ ◄── articles ────────────── │
  │                                    │                              │
  │                                    │  Delete old news articles    │
  │                                    │  Insert new articles         │
  │                                    │  (title, content, excerpt,   │
  │                                    │   source, sourceUrl, image)  │
  │                                    │ ──── Database ────────────►  │
  │                                    │                              │
  │ POST /news/fetch (manual trigger)   │                              │
  │ ───────────────────────────────►   │                              │
  │                                    │  Same fetch + save           │
  │  ◄── { message, count } ───────── │                              │
```

---

## API Endpoints (Public)

| Method | Path | Description |
|---|---|---|
| GET | `/news/latest` | Get latest 10 news articles |
| POST | `/news/fetch` | Manually trigger news fetch |

---

## Service Layer

| Method | Description |
|---|---|
| `fetchDentalNews()` | Cron job: search Tavily, delete old, insert new |
| `getLatestNews()` | Return latest 10 articles |
| `triggerFetch()` | Manual trigger { message, count } |
| `truncateSummary(content, maxLength)` | Truncate long content |

---

## Entity

**News** (`news` table) — UUID PK, title, content (longtext), excerpt, image, source, sourceUrl, publishedAt, fetchedAt.

---

## Module Configuration

```
NewsModule
├── imports: [ConfigModule, TypeOrmModule.forFeature([News])]
├── controllers: [NewsController]
├── providers: [NewsCronService]
└── exports: [NewsCronService]
```

---

# AI Assistant Module

**Location:** `src/modules/ai-assistant/`

## Purpose

RAG (Retrieval-Augmented Generation) chatbot using NVIDIA API (Llama 3.3 70B) for LLM and Supabase pgvector for vector embeddings. Answers dental product questions with context-aware product suggestions.

---

## Flow Diagram

### RAG Chat Flow

```
Client                          ChatService/RagService              External
  │                                    │                              │
  │ POST /chat/message                  │                              │
  │ { message: "Which toothbrush       │                              │
  │   is best for sensitive gums?",    │                              │
  │   history: [...] }                 │                              │
  │ ───────────────────────────────►   │                              │
  │                                    │                              │
  │  ┌─────────────────────────────┐   │                              │
  │  │ RagService.chat()           │   │                              │
  │  │                            │   │                              │
  │  │ 1. Embed user query         │   │                              │
  │  │    → OllamaService.embed()  │   │                              │
  │  │    ── NVIDIA API ────────►  │   │                              │
  │  │    ◄── vector[1536] ─────── │   │                              │
  │  │                            │   │                              │
  │  │ 2. Vector similarity search │   │                              │
  │  │    → VectorService.search() │   │                              │
  │  │    ── Supabase pgvector ──► │   │                              │
  │  │    ◄── top 5 products ───── │   │                              │
  │  │    (with fallback to        │   │                              │
  │  │     text search if no       │   │                              │
  │  │     vector results)         │   │                              │
  │  │                            │   │                              │
  │  │ 3. Build context:           │   │                              │
  │  │    Product name, price,     │   │                              │
  │  │    description, features,   │   │                              │
  │  │    category for each match  │   │                              │
  │  │                            │   │                              │
  │  │ 4. LLM chat completion      │   │                              │
  │  │    → OllamaService.chat()   │   │                              │
  │  │    (system prompt +         │   │                              │
  │  │     context + history +     │   │                              │
  │  │     user message)           │   │                              │
  │  │    ── NVIDIA API ────────►  │   │                              │
  │  │    ◄── response text ────── │   │                              │
  │  │                            │   │                              │
  │  │ 5. Parse product IDs from   │   │                              │
  │  │    context → include in     │   │                              │
  │  │    response as suggestions  │   │                              │
  │  └─────────────────────────────┘   │                              │
  │                                    │                              │
  │  ◄── { reply, suggestions:         │                              │
  │        [{ productId, name,         │                              │
  │          price, image }] }         │                              │
```

### Embedding Products Flow

```
Admin                          Chat/VectorService                  External
  │                                    │                              │
  │ POST /chat/embed-products           │                              │
  │ { productId } or {} (all)          │                              │
  │ ───────────────────────────────►   │                              │
  │                                    │  Fetch product(s) from DB    │
  │                                    │                              │
  │                                    │  For each product:           │
  │                                    │    Build text: name + desc   │
  │                                    │      + features + category   │
  │                                    │                              │
  │                                    │    Embed via OllamaService   │
  │                                    │    ── NVIDIA API ─────────►  │
  │                                    │    ◄── vector[1536] ──────── │
  │                                    │                              │
  │                                    │    Upsert to Supabase        │
  │                                    │    pgvector table            │
  │                                    │    ── Supabase ────────────►  │
  │                                    │                              │
  │  ◄── { success, count } ───────── │                              │
```

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/chat/message` | Public | Send message, get AI response + product suggestions |
| POST | `/chat/embed-products` | Public | Embed product(s) into vector DB |
| GET | `/chat/stats` | Public | Embedding count + health status |
| GET | `/chat/clear` | Public | Clear all embeddings |

---

## Service Layer

| Service | Method | Description |
|---|---|---|
| **ChatService** | `sendMessage(dto)` | Orchestrates RAG pipeline |
| | `embedProducts(dto)` | Embed product(s) into vector DB |
| | `getEmbeddingStats()` | Count + status |
| | `clearEmbeddings()` | Truncate embedding table |
| **OllamaService** | `chat(messages, stream?)` | LLM chat completion (NVIDIA API) |
| | `embed(text)` | Single text → vector |
| | `embedBatch(texts)` | Batch texts → vectors |
| **VectorService** | `createEmbeddingTable()` | Create pgvector table |
| | `embedProduct(product)` | Embed single product |
| | `embedProducts(products)` | Embed multiple |
| | `search(query, topK)` | Vector similarity with fallback |
| | `getEmbeddingCount()` | Row count |
| **RagService** | `chat(userMessage, history)` | Full RAG pipeline |
| | `chatStream(userMessage, history)` | Streaming RAG |

---

## DTOs

| DTO | Fields |
|---|---|
| `SendMessageDto` | message (required), history[] (optional, [{ role, content }]) |
| `EmbedProductsDto` | productId?, productIds[]? (if empty → all) |

---

## Architecture

```
RagService
  ├── OllamaService (LLM: NVIDIA API / Llama 3.3 70B)
  │     └── embed(), chat(), generate()
  │
  ├── VectorService (Supabase pgvector)
  │     └── search(), embedProduct(), getEmbeddingCount()
  │
  └── ProductsService (for product data)
        └── findOne(), findAll()
```

---

## Module Configuration

```
AiAssistantModule
├── imports: [ProductsModule]
├── controllers: [ChatController]
├── providers: [ChatService, OllamaService, VectorService, RagService]
└── exports: [ChatService]
```
