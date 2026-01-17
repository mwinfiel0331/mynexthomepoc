# My Next Home - Proof of Concept

A working proof-of-concept for an intelligent home search and evaluation platform. Users search for homes, view AI-powered "Next Home Scores" that predict fit based on their preferences, and build a shortlist.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm 8+

### Setup (< 10 minutes)

```bash
# 1. Clone or extract the repo
cd mynexthomepoc

# 2. Install dependencies
pnpm i

# 3. Set up database
cp .env.example .env.local
pnpm db:push

# 4. Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and start searching for homes!

## 📋 Available Commands

```bash
pnpm dev          # Start development server (watches all packages)
pnpm build        # Build all packages and Next.js app
pnpm test         # Run all unit tests (Vitest)
pnpm lint         # Run ESLint across all packages
pnpm type-check   # Run TypeScript type checker
pnpm db:push      # Sync Prisma schema with database
pnpm db:seed      # Seed database with mock data
```

## 🏗️ Architecture Overview

### Monorepo Structure

```
mynexthomepoc/
├── apps/web/                 # Next.js 14 app (App Router)
│   ├── src/app/              # Pages: /, /compare, /shortlist
│   ├── src/app/api/          # API routes: /search, /score, /shortlist
│   └── prisma/               # Database schema + migrations
├── packages/
│   ├── core/                 # Domain models, scoring logic, interfaces
│   └── integrations/         # Mock + real service adapters
└── docs/                     # Architecture & deployment guides
```

### Key Design Decisions

1. **Monorepo with pnpm workspaces**: Shared domain logic across packages
2. **Mock-first integrations**: All real APIs are behind feature flags and optional
3. **Deterministic scoring**: Scoring is repeatable and testable (no ML required)
4. **SQLite for POC**: Easily moveable to PostgreSQL/Supabase for production
5. **Zod validation**: Type-safe request/response validation
6. **Masked addresses**: Privacy-preserving by default

## 🔍 How It Works

### Search Flow
1. User enters search criteria (location, budget, beds/baths, must-haves)
2. Backend filters mock listings in memory
3. Returns up to 20 results sorted by price

### Scoring Flow
1. User selects 2-4 homes to compare
2. Backend fetches scoring signals (neighborhood, market, commute)
3. Applies deterministic scoring rules (see docs/01-architecture.md)
4. Returns breakdown with 3 human-readable reasons

### Shortlist Flow
1. User clicks "Shortlist" on a home
2. Backend computes score and saves (listing + score) to SQLite
3. User can view/delete from /shortlist page

## 📊 Scoring Breakdown

**Next Home Score** (0-100) combines:
- **Affordability** (25%): Monthly payment vs budget
- **Commute** (20%): Estimated commute time vs max preference
- **Neighborhood** (25%): Schools, safety, walkability
- **Property Quality** (20%): Age, size, features, property type
- **Market Momentum** (10%): Days on market, price trends, inventory

Each score includes 3 reasons explaining why it scored high/low.

## 🔄 Real Integrations

**All integrations are mocked by default.**

To enable real integrations later, see [docs/05-deployment.md](docs/05-deployment.md) for:
- MLS/RESO API setup
- Google Maps Platform configuration
- GreatSchools API integration
- Real neighborhood signals sources

Set `INTEGRATIONS_MODE=real` in `.env` to switch to real adapters (after implementation).

## 📚 Documentation

- [00-requirements.md](docs/00-requirements.md) - Functional & non-functional requirements
- [01-architecture.md](docs/01-architecture.md) - C4 architecture, data flow diagrams
- [02-api-spec.md](docs/02-api-spec.md) - OpenAPI-style endpoint specifications
- [03-data-model.md](docs/03-data-model.md) - Schema, caching strategy, production normalization
- [04-testing.md](docs/04-testing.md) - Test pyramid, how to run tests
- [05-deployment.md](docs/05-deployment.md) - Local dev, Vercel POC, production path

## 🧪 Testing

### Unit Tests

```bash
pnpm test
```

Tests cover:
- Mortgage payment calculations (known cases)
- Scoring algorithm correctness
- Weight normalization
- Reasons generation (exactly 3, stable)

### E2E Tests (TODO)

```bash
pnpm test:e2e
```

Playwright tests cover:
- Search form -> results
- Select homes -> compare view
- Shortlist -> view/delete

### Running Specific Tests

```bash
# Test core package only
cd packages/core && pnpm test

# Watch mode
pnpm test -- --watch
```

## 🌐 Deployment

### POC (Local/Vercel)

```bash
vercel link
vercel env add DATABASE_URL
pnpm build
vercel deploy
```

SQLite works for POC but hits limits at scale.

### Production

Switch to PostgreSQL (Supabase/Neon):

```bash
# Update .env
DATABASE_URL="postgresql://user:pass@host/db"

# Run migration
pnpm db:push

# Update real integrations (see docs/05-deployment.md)
```

See [docs/05-deployment.md](docs/05-deployment.md) for full production checklist.

## 📦 Sample Data

The POC includes 150+ mock listings across Florida markets:
- **Land O Lakes** (suburban family area)
- **Westchase/Carrollwood** (Tampa metro)
- **Winter Park/Maitland** (Orlando metro)
- **Downtown Tampa/Orlando** (urban)
- **Coral Gables/Miami** (luxury)

All addresses are masked for privacy. To regenerate or modify seed data, edit:
- `packages/core/src/listings-seed.ts`

## 🤔 Common Questions

**Q: Why mock integrations?**  
A: Avoids MLS licensing issues, API keys, and costs during POC phase. Real APIs are designed in but not enabled.

**Q: Can I use real MLS data?**  
A: Yes! See docs/05-deployment.md for MLS/RESO partnership paths and implementation guidance.

**Q: How accurate is the scoring?**  
A: POC scoring uses deterministic rules, not ML. Good for product validation; real versions would integrate ML ranking and feedback loops.

**Q: How do I add another home search filter?**  
A: Update `UserSearch` in `packages/core/src/index.ts`, add to form in `apps/web/src/app/page.tsx`, and filter in mock provider.

**Q: Can I deploy to Vercel?**  
A: Yes! SQLite works initially (see caveats in docs/05-deployment.md). For production scale, migrate to PostgreSQL.

## 🔐 Security & Privacy

- ✅ Zod validation on all inputs
- ✅ Masked addresses (e.g., "1234 *** St")
- ✅ No secrets committed (.env.example provided)
- ✅ No auth required (easily added if needed)
- ✅ Type-safe throughout (TypeScript strict mode)

## 📞 Support

For implementation questions, see docs/ folder. For architecture deep-dive, start with [docs/01-architecture.md](docs/01-architecture.md).

## 📄 License

Proof of Concept - Internal Use Only
