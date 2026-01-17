# Deployment Strategy - My Next Home POC

## Local Development

### Prerequisites

- Node.js 18+
- pnpm 8+
- (Optional) Docker for containerized development

### Quick Start

```bash
# Clone/extract repo
cd mynexthomepoc

# Install dependencies
pnpm i

# Create .env file
cp .env.example .env.local

# Initialize database
pnpm db:push

# Start dev server (all packages)
pnpm dev
```

Server runs on `http://localhost:3000`.

### Development Database

**SQLite** is used by default (file: `db.sqlite`).

- No external dependencies
- Auto-created on first `pnpm db:push`
- Perfect for POC and single-developer work

### Environment Variables (Local)

```bash
# .env.local
DATABASE_URL="file:./db.sqlite"
INTEGRATIONS_MODE=mock
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Vercel Deployment (POC)

### Step 1: Create Vercel Project

```bash
vercel link
# or via: https://vercel.com/new
```

### Step 2: Add Environment Variables

```bash
vercel env add DATABASE_URL
# Input: file:./db.sqlite

vercel env add INTEGRATIONS_MODE
# Input: mock

vercel env add NEXT_PUBLIC_APP_URL
# Input: https://<your-project>.vercel.app
```

### Step 3: Deploy

```bash
vercel deploy
# or via: git push (auto-deploy if configured)
```

### Step 4: Verify

```bash
vercel --prod logs
# Then test at https://<your-project>.vercel.app
```

### Limitations & Workarounds

**SQLite on Vercel**: SQLite works initially but is **ephemeral** (lost on redeploy).

**Workaround for POC**:
- Use Vercel Blob Storage for SQLite file (store `db.sqlite` as blob)
- Or migrate to PostgreSQL (see below)

**Better approach**: Use PostgreSQL from day 1 (see next section).

---

## Production Deployment (PostgreSQL)

### Architecture

```
GitHub (Push) → GitHub Actions (CI) → Vercel (Deploy)
                     ↓
                  pnpm build
                  pnpm test
                     ↓
              Deploy to Vercel
                     ↓
              Next.js Edge Functions
                     ↓
              API Routes (serverless)
                     ↓
         PostgreSQL (Supabase/Neon)
                     ↓
         Redis Cache (Upstash or similar)
```

### Step 1: Provision PostgreSQL Database

**Option A: Supabase** (Postgres + Auth + Realtime)

```bash
1. Go to https://supabase.com
2. Create new project
3. Get connection string from Project Settings → Database → Connection Pooling
4. Use "Node.js" connection string
```

**Option B: Neon** (Serverless Postgres)

```bash
1. Go to https://neon.tech
2. Create project
3. Get connection string from Quickstart
```

### Step 2: Update Prisma Schema

See [docs/03-data-model.md](03-data-model.md#migration-path-sqlite--postgresql) for normalized schema.

```bash
# Update .env
DATABASE_URL="postgresql://user:password@host/dbname?schema=public"

# Run migration
pnpm db:push

# Seed (optional)
pnpm db:seed
```

### Step 3: Deploy to Vercel

```bash
vercel env add DATABASE_URL
# Input: postgresql://...

vercel deploy --prod
```

### Step 4: Run Migrations on First Deploy

**Option 1: Manual**

```bash
vercel connect <project>
# SSH into build, run: pnpm db:push
```

**Option 2: Automatic (Recommended)**

Add to `package.json`:

```json
{
  "scripts": {
    "build": "pnpm db:push && next build",
    "postdeploy": "pnpm db:push"
  }
}
```

### Step 5: Monitor & Debug

```bash
vercel logs --prod
# Check for Prisma migration errors, API issues

# Direct DB queries:
psql $DATABASE_URL -c "SELECT COUNT(*) FROM ShortlistedHome;"
```

---

## Real Integrations (When Ready)

### Prerequisites

1. API keys/credentials for each service
2. Whitelisting of your domain/IP
3. Rate limit planning

### 1. Enable Real Listings Provider (MLS/RESO)

**Prerequisites**:
- Partnership with MLS or RESO data provider
- API key and base URL

**Implementation**:

```typescript
// packages/integrations/src/real.ts

export class RealListingsProvider implements ListingsProvider {
  constructor(
    private apiKey: string = process.env.RESO_API_KEY!,
    private apiBaseUrl: string = process.env.RESO_API_BASE_URL!
  ) {}

  async search(query: UserSearch): Promise<Listing[]> {
    // TODO: Build RESO/OData filter from query
    // TODO: Call RESO API
    // TODO: Map results to Listing schema
    // TODO: Implement pagination
    // TODO: Cache results (1-hour TTL)
    
    const filter = this.buildResoFilter(query);
    const response = await fetch(`${this.apiBaseUrl}/Search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter,
        select: ['ListingKey', 'Address', 'Price', 'Bedrooms', ...],
        top: 20
      })
    });

    const data = await response.json();
    return data.map(mls => this.mapMlsToListing(mls));
  }

  private buildResoFilter(query: UserSearch): string {
    // Build OData filter string
    // Example: "(ListPrice ge 350000 and ListPrice le 500000) and (BedroomsTotal ge 3)"
  }

  private mapMlsToListing(mls: any): Listing {
    // Map MLS fields to Listing schema
  }
}
```

**Integration Checklist**:
- [ ] Get API credentials from MLS
- [ ] Test API connection
- [ ] Handle pagination (MLS typically returns 500+ results)
- [ ] Implement error handling (API down, rate limit, etc.)
- [ ] Add caching layer (Redis, 1-hour TTL)
- [ ] Test address masking (privacy)
- [ ] Add unit tests with mock API responses

### 2. Enable Real Neighborhood Signals

**Prerequisites**:
- GreatSchools API key (if available)
- Access to public crime data (FBI UCR, city police)
- Walkability API (Mapbox or similar)

**Implementation** (overview):

```typescript
export class RealNeighborhoodSignalsProvider implements NeighborhoodSignalsProvider {
  async getSignals(zip: string, city: string, state: string) {
    const [schoolData, crimeData, walkability] = await Promise.all([
      this.fetchSchoolRating(city, state),      // GreatSchools API
      this.fetchCrimeIndex(zip, city, state),   // Public crime data
      this.fetchWalkabilityScore(city, state),  // Mapbox / Google
    ]);

    return {
      schoolRating: schoolData.avgRating,      // 1-10
      safetyIndex: 100 - crimeData.crimeRate,  // Invert: lower crime = higher score
      walkability: walkability.score,            // 1-100
    };
  }
}
```

**Integration Checklist**:
- [ ] Determine GreatSchools API availability (license-dependent)
- [ ] Integrate public crime datasets (FBI, city police, CrimeLabs)
- [ ] Setup Mapbox/Google for walkability
- [ ] Validate data accuracy for sample areas
- [ ] Implement caching (5-day TTL)
- [ ] Test error handling (API down, missing data)

### 3. Enable Real Market Signals

**Prerequisites**:
- Redfin Data Center access (free/paid tiers)
- FHFA (Federal Housing Finance Agency) data access (free, public)
- MLS market statistics (via MLS partner)

**Implementation** (overview):

```typescript
export class RealMarketSignalsProvider implements MarketSignalsProvider {
  async getSignals(zip: string, city: string, state: string) {
    const [redfin, fhfa, mlsStats] = await Promise.all([
      this.fetchRedfin(zip),       // Days on market, inventory
      this.fetchFHFA(state),        // HPI, price trends
      this.fetchMLSStats(zip, city) // Local market data
    ]);

    return {
      medianDaysOnMarket: redfin.daysOnMarket,
      yoyPriceChangePct: fhfa.priceChangePct + mlsStats.priceChangePct) / 2,
      inventoryLevel: this.classifyInventory(mlsStats.activeListings),
    };
  }
}
```

**Integration Checklist**:
- [ ] Sign up for Redfin Data Center (https://www.redfin.com/research/data-center)
- [ ] Integrate FRED API (https://fred.stlouisfed.org/) for economic data
- [ ] Get MLS market statistics from partnership
- [ ] Implement caching (7-day TTL)
- [ ] Validate trends against known markets

### 4. Enable Real Commute Time

**Prerequisites**:
- Google Maps Platform API key (or Mapbox)
- Distance Matrix API enabled
- Billing account configured

**Implementation**:

```typescript
export class RealCommuteTimeProvider implements CommuteTimeProvider {
  async getEstimatedMinutes(
    fromLat: number,
    fromLng: number,
    toAddress: string
  ): Promise<number> {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?` +
      `origins=${fromLat},${fromLng}&` +
      `destinations=${encodeURIComponent(toAddress)}&` +
      `mode=driving&` +
      `departure_time=now&` +
      `key=${this.googleMapsApiKey}`
    );

    const data = await response.json();
    
    if (data.status !== 'OK' || data.rows[0].elements[0].status !== 'OK') {
      throw new Error(`Distance Matrix API error: ${data.status}`);
    }

    // Return minutes
    return Math.round(data.rows[0].elements[0].duration.value / 60);
  }
}
```

**Integration Checklist**:
- [ ] Create Google Cloud project
- [ ] Enable Distance Matrix API
- [ ] Create API key with restrictions
- [ ] Configure billing
- [ ] Test with known routes
- [ ] Implement caching (24-hour TTL)
- [ ] Add error handling (API down, quota exceeded)
- [ ] Monitor costs (typically $0.005 per query at scale)

### 5. Switch to Real Integrations

**In code**:

```typescript
// packages/integrations/src/index.ts

export function getListingsProvider(): ListingsProvider {
  if (process.env.INTEGRATIONS_MODE === 'real') {
    return new RealListingsProvider();
  }
  return new MockListingsProvider();
}

// Repeat for other providers
```

**In .env**:

```bash
INTEGRATIONS_MODE=real  # Switch from "mock"

# Real credentials
RESO_API_KEY=sk_live_...
RESO_API_BASE_URL=https://api.reso.org/v2
GOOGLE_MAPS_API_KEY=AIza...
MAPBOX_API_KEY=pk.eyJ...
GREATSCHOOLS_API_KEY=...
```

---

## Scaling Checklist (As User Base Grows)

### Phase 1: POC (0-100 users)
- ✅ SQLite local
- ✅ Mock integrations
- ✅ Vercel
- ✅ Single region

### Phase 2: Growth (100-1000 users)
- [ ] Migrate to PostgreSQL (Supabase/Neon)
- [ ] Add Redis caching (Upstash)
- [ ] Enable real listing provider (MLS)
- [ ] Setup monitoring (Vercel Analytics, Datadog)
- [ ] Add rate limiting

### Phase 3: Scale (1000+ users)
- [ ] Multi-region deployment (Vercel Edge)
- [ ] Real integrations for all providers
- [ ] Advanced caching strategy (Redis Cluster)
- [ ] Database read replicas
- [ ] CDN for static assets
- [ ] API Gateway (Kong or similar)
- [ ] OpenTelemetry observability

### Phase 4: Enterprise
- [ ] Custom integrations per region
- [ ] Dedicated database instance
- [ ] Multi-tenant support (if needed)
- [ ] Advanced security (WAF, DDoS protection)
- [ ] SLA monitoring
- [ ] Dedicated support

---

## Monitoring & Observability

### Vercel Analytics (Built-in)

```
https://vercel.com/dashboard/[project]/analytics
```

Tracks:
- Core Web Vitals
- Page load times
- Error rates

### Application Logging (Future)

**Recommended**: Datadog, CloudWatch, or Splunk

```typescript
// Example: add logger to API routes
import pino from 'pino';

const logger = pino();

export async function POST(request: NextRequest) {
  logger.info({ url: request.url, method: request.method }, 'API request');
  
  try {
    // ... handle request
    logger.info({ status: 200 }, 'API success');
  } catch (error) {
    logger.error({ error }, 'API error');
    throw error;
  }
}
```

### Error Tracking (Future)

**Recommended**: Sentry

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

---

## Disaster Recovery & Backups

### Database Backups

**Supabase**: Automatic daily backups (configurable retention)

```
Dashboard → Project Settings → Backups
```

**Neon**: Automatic backups, point-in-time recovery

```
https://console.neon.tech/ → Backups
```

### Manual Backup

```bash
# Export PostgreSQL dump
pg_dump $DATABASE_URL > backup.sql

# Upload to S3 or Vercel Blob Storage
aws s3 cp backup.sql s3://my-bucket/backups/$(date +%Y%m%d).sql
```

### Recovery Process

```bash
# Restore from dump
psql $DATABASE_URL < backup.sql

# Or via web console (Supabase/Neon)
```

---

## Security Best Practices

### Environment Secrets

- ✅ Use Vercel Env Secrets (encrypted, not visible in logs)
- ✅ Never commit `.env` file
- ✅ Rotate API keys regularly
- ❌ Never log sensitive data

### Database Access

- ✅ Use connection pooling (PgBouncer or Neon built-in)
- ✅ Restrict IP access if possible
- ✅ Use strong passwords (generated by provider)
- ❌ Don't expose database URLs in client code

### API Security

- ✅ Enable HTTPS (automatic with Vercel)
- ✅ Validate all input (Zod)
- ✅ Rate limit (implement middleware)
- ✅ CORS headers (if needed)
- ❌ Don't expose internal error details to clients

### Third-Party APIs

- ✅ Use API key scoping (restrict permissions)
- ✅ Monitor usage (watch for abuse)
- ✅ Implement fallback to mock (graceful degradation)
- ✅ Add circuit breaker (if API is down, use cache)

---

## Cost Estimation (Monthly)

| Service | POC | Growth | Scale |
|---------|-----|--------|-------|
| Vercel | Free | $20 | $100+ |
| PostgreSQL | - | $15/mo (Neon) | $100+ |
| Redis Cache | - | $5/mo | $50+ |
| Google Maps | - | $0-50 | $100+ |
| Datadog | - | - | $20+ |
| **Total** | **Free** | **~$50** | **$300+** |

---

## Troubleshooting

### Common Issues

**Issue**: "DATABASE_URL not set"
```bash
# Solution
vercel env list  # Check if set
vercel env add DATABASE_URL "postgresql://..."
vercel redeploy  # Redeploy after adding env
```

**Issue**: Prisma migration fails
```bash
# Solution
vercel logs --tail
# Look for Prisma error, then:
pnpm db:push  # Run locally to see detailed error
```

**Issue**: SQLite file lost after Vercel deploy
```bash
# Solution
# Switch to PostgreSQL (see above)
# or use Vercel Blob Storage for SQLite file
```

**Issue**: Real API is slow/failing
```bash
# Solution
# Check API status page
# Verify credentials
# Check rate limits
# Fall back to mock in .env: INTEGRATIONS_MODE=mock
```

---

## Deployment Checklist

- [ ] All tests passing (`pnpm test`)
- [ ] Build successful (`pnpm build`)
- [ ] No console errors in dev (`pnpm dev`)
- [ ] Environment variables set in Vercel
- [ ] Database migrations run (`pnpm db:push`)
- [ ] Seed data loaded (if needed)
- [ ] Real integrations tested (if enabled)
- [ ] Error handling verified
- [ ] Logging working
- [ ] Monitoring dashboard setup
- [ ] Backup strategy confirmed
- [ ] Security review completed
- [ ] Performance tested (Lighthouse)
- [ ] Mobile responsiveness verified
