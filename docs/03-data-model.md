# Data Model - My Next Home POC

## Prisma Schema (SQLite - POC)

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model ShortlistedHome {
  id            String   @id @default(cuid())
  listingId     String
  listingJson   Json     // Denormalized Listing object
  scoreJson     Json     // Denormalized ScoreBreakdown object
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([listingId])
}
```

## Schema Explanation

### ShortlistedHome

Single table for POC simplicity. Stores JSON blobs to avoid complex joins.

**Fields**

| Field | Type | Purpose |
|-------|------|---------|
| `id` | CUID (string) | Primary key |
| `listingId` | String | Foreign key reference to listing (for queries) |
| `listingJson` | JSON | Full `Listing` object serialized |
| `scoreJson` | JSON | Full `ScoreBreakdown` object serialized |
| `createdAt` | DateTime | When shortlisted |
| `updatedAt` | DateTime | Auto-updated on changes |

**Index**

- `listingId`: Allows quick lookup by listing ID

## JSON Structures (In `listingJson` and `scoreJson`)

### Listing (stored in `listingJson`)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "addressMasked": "1234 *** St, Land O Lakes, FL",
  "city": "Land O Lakes",
  "state": "FL",
  "zip": "34639",
  "price": 450000,
  "beds": 3,
  "baths": 2,
  "sqft": 2000,
  "lotSqft": 7500,
  "yearBuilt": 2015,
  "propertyType": "SINGLE_FAMILY",
  "hoaMonthly": null,
  "taxesAnnualEstimate": 5400,
  "insuranceAnnualEstimate": 2700,
  "lat": 28.15,
  "lng": -82.45,
  "features": ["garage", "pool", "fenced yard"],
  "photos": ["/stock/home1.jpg"],
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### ScoreBreakdown (stored in `scoreJson`)

```json
{
  "listingId": "550e8400-e29b-41d4-a716-446655440000",
  "affordabilityScore": 85,
  "commuteScore": 92,
  "neighborhoodScore": 78,
  "propertyQualityScore": 75,
  "marketMomentumScore": 65,
  "overallScore": 79,
  "reasons": [
    "Monthly estimate fits budget comfortably",
    "Commute well under 30 minute target",
    "Strong schools and safety"
  ],
  "weights": {
    "affordability": 0.25,
    "commute": 0.2,
    "neighborhood": 0.25,
    "propertyQuality": 0.2,
    "marketMomentum": 0.1
  }
}
```

## Database Queries

### Get all shortlisted homes (ordered by creation)

```ts
const items = await prisma.shortlistedHome.findMany({
  orderBy: { createdAt: 'desc' },
});
```

### Delete from shortlist

```ts
await prisma.shortlistedHome.delete({
  where: { id: 'clj6f9b9s0000qz7d9q8q8q8q' },
});
```

### Check if home is shortlisted

```ts
const existing = await prisma.shortlistedHome.findFirst({
  where: { listingId: '550e8400-e29b-41d4-a716-446655440000' },
});
```

## Listing Data (Mock)

**Source**: `packages/core/src/listings-seed.ts`

Contains 150+ listings across Florida markets:

| City | ZIP | Count | Price Range | Description |
|------|-----|-------|-------------|-------------|
| Land O Lakes | 34639 | 20 | $350k-$550k | Suburban, family-friendly |
| Westchase | 33626 | 15 | $400k-$600k | Tampa metro, newer developments |
| Carrollwood | 33618 | 15 | $400k-$550k | Tampa metro, established |
| Winter Park | 32789 | 15 | $500k-$700k | Orlando metro, affluent |
| Maitland | 32751 | 15 | $350k-$450k | Orlando metro, diverse |
| Downtown Orlando | 32801 | 15 | $300k-$500k | Urban, condos |
| Coral Gables | 33134 | 15 | $600k-$800k | Miami metro, luxury |
| Downtown Miami | 33131 | 15 | $450k-$650k | Urban, high-rise |
| Other (random generation) | Mixed | 50+ | $300k-$700k | Various metros |

**Generation**: Deterministic based on seed function for reproducibility.

## Caching Strategy (POC vs. Production)

### POC (Current)

- No caching; all data computed on-demand
- Search filters 150 listings in-memory (~5ms)
- Scoring fetches mock signals deterministically
- Suitable for &lt; 100 concurrent users

### Production

**Recommended strategy**:

```text
User Search Request
    ↓
Redis Cache Check (1-hour TTL)
    ├─ Cache Hit → Return cached results
    └─ Cache Miss:
        ↓
    Call Listings Provider (MLS/RESO)
        ↓
    Call Signal Providers (parallel):
      ├─ Neighborhood Signals (Redis, 5-day TTL)
      ├─ Market Signals (Redis, 7-day TTL)
      └─ Commute Provider (Redis, 24-hour TTL)
        ↓
    Score Listings
        ↓
    Cache Results in Redis
        ↓
    Return to User
```

**Cache keys**:

```text
# Search results (1 hour TTL)
mynexthome:search:{hash(location,budget,beds,baths,mustHaves)}
→ { listings: [...], timestamp }

# Neighborhood signals (5 days TTL)
mynexthome:neighborhood:{zip}:{city}:{state}
→ { schoolRating, safetyIndex, walkability, timestamp }

# Market signals (7 days TTL)
mynexthome:market:{zip}:{city}:{state}
→ { daysOnMarket, yoyPriceChange, inventory, timestamp }

# Commute estimates (24 hours TTL)
mynexthome:commute:{fromLat}:{fromLng}:{toAddress}
→ { minutes, timestamp }
```

**Refresh strategy**:

```text
Nightly Cron Job (1 AM):
  ├─ For each popular ZIP/city:
  │   ├─ Fetch fresh neighborhood signals
  │   ├─ Fetch fresh market signals
  │   └─ Update Redis cache
  └─ For each popular search combination:
      ├─ Re-run search
      └─ Update Redis cache
```

## Migration Path: SQLite → PostgreSQL

### Step 1: Export current SQLite data

```bash
sqlite3 db.sqlite ".dump ShortlistedHome" > shortlist_backup.sql
```

### Step 2: Update Prisma schema for PostgreSQL

```prisma
datasource db {
  provider = "postgresql"  // Changed from sqlite
  url      = env("DATABASE_URL")
}

// Add normalized tables for production
model Listing {
  id               String   @id @default(uuid())
  addressMasked    String
  city             String
  state            String
  zip              String
  price            Decimal
  beds             Int
  baths            Decimal
  sqft             Int
  lotSqft          Int?
  yearBuilt        Int?
  propertyType     String
  hoaMonthly       Decimal?
  taxesAnnual      Decimal?
  insuranceAnnual  Decimal?
  lat              Float
  lng              Float
  features         String[]
  photos           String[]
  createdAt        DateTime @default(now())

  shortlists       ShortlistedHome[]
  scores           Score[]

  @@index([city, state, zip])
  @@index([price])
}

model NeighborhoodSignal {
  id          String   @id @default(uuid())
  zip         String
  city        String
  state       String
  schoolRating Float
  safetyIndex Float
  walkability Float
  lastUpdated DateTime @default(now())

  @@unique([zip, city, state])
}

model MarketSignal {
  id               String   @id @default(uuid())
  zip              String
  city             String
  state            String
  daysOnMarket     Int
  yoyPriceChange   Float
  inventoryLevel   String  // "LOW" | "MEDIUM" | "HIGH"
  lastUpdated      DateTime @default(now())

  @@unique([zip, city, state])
}

model Score {
  id                    String   @id @default(uuid())
  listingId             String
  listing               Listing  @relation(fields: [listingId], references: [id])
  affordabilityScore    Int
  commuteScore          Int
  neighborhoodScore     Int
  propertyQualityScore  Int
  marketMomentumScore   Int
  overallScore          Int
  reasons               String[]
  weightsJson           Json     // Store custom weights
  searchContextJson     Json     // Store search params that generated this score
  createdAt             DateTime @default(now())

  @@index([listingId])
  @@index([createdAt])
}

model ShortlistedHome {
  id          String   @id @default(cuid())
  listingId   String
  listing     Listing  @relation(fields: [listingId], references: [id], onDelete: Cascade)
  scoreId     String?
  score       Score?   @relation(fields: [scoreId], references: [id])
  createdAt   DateTime @default(now())

  @@index([listingId])
  @@index([createdAt])
}
```

### Step 3: Run migration

```bash
# Update .env
DATABASE_URL="postgresql://user:password@host:5432/mynexthome"

# Run Prisma migration
pnpm db:push

# Seed with normalized data
pnpm db:seed
```

### Step 4: Verify data integrity

```bash
# Check counts
psql -U user -d mynexthome -c "SELECT COUNT(*) FROM ShortlistedHome;"
```

## Performance Considerations

### Current (SQLite)

- Single file, local access
- No concurrent writes (blocking)
- Perfect for &lt; 100 total users
- ~5ms query time

### Scaling to Production (PostgreSQL)

| Bottleneck | Solution |
|------------|----------|
| Listing search | Add indexes on (city, state, zip, price) |
| Signals lookup | Maintain in-memory cache or Redis |
| Shortlist queries | Index on createdAt for pagination |
| Concurrent users | Add read replicas for GET operations |

**Target**: Sub-100ms response time for p95 requests

## Data Privacy & Masking

**Address masking** applied everywhere:

```text
Real: 123 Elm Street, Land O Lakes, FL 34639
Masked: 123 *** Street, Land O Lakes, FL 34639
```

**Why**: Avoid revealing exact properties in production.

**Implementation**: Masking happens in `listings-seed.ts` and is built into the `Listing` type.

**Unmasking**: To show exact address to shortlisted users, create a separate `exact_address` field:

```prisma
model ShortlistedHome {
  // ...
  exactAddress  String?  // Only populated for logged-in users
}
```

## Data Retention Policy (Future)

**Recommended for production**:

- **ShortlistedHome**: Keep indefinitely (user's own data)
- **Scores**: Keep 90 days (historical reference)
- **Cache**: As defined by TTLs above
- **Logs**: Keep 30 days (audit trail)

Implement with Prisma scheduled jobs:

```ts
// Delete old scores daily
const thirtyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
await prisma.score.deleteMany({
  where: { createdAt: { lt: thirtyDaysAgo } },
});
```
