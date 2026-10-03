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
