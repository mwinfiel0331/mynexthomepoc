# My Next Home POC - Quick Reference Guide

## 📁 Complete File Structure

```
mynexthomepoc/
├── .env.example                              # Example env file (copy to .env.local)
├── .env.local.example                        # Alternative env example
├── .eslintrc.js                              # ESLint config
├── .gitignore                                # Git ignore rules
├── .prettierrc.json                          # Prettier config
├── package.json                              # Root workspace config
├── tsconfig.json                             # Base TypeScript config
├── vitest.config.ts                          # Vitest config
├── pnpm-workspace.yaml                       # pnpm workspaces config
├── README.md                                 # Main project README
│
├── .github/
│   └── workflows/
│       └── ci.yml                            # GitHub Actions CI pipeline
│
├── apps/
│   └── web/                                  # Next.js 14 application
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.js
│       ├── tailwind.config.js
│       ├── postcss.config.js
│       ├── README.md
│       ├── public/                           # Static assets
│       ├── prisma/
│       │   ├── schema.prisma                 # Prisma schema (SQLite)
│       │   └── seed.ts                       # Seed script
│       └── src/
│           └── app/
│               ├── layout.tsx                # Root layout (nav, etc.)
│               ├── page.tsx                  # Home / Search page
│               ├── globals.css               # Global Tailwind styles
│               ├── compare/
│               │   └── page.tsx              # Compare homes page
│               ├── shortlist/
│               │   └── page.tsx              # Shortlist page
│               └── api/
│                   ├── search/
│                   │   └── route.ts          # POST /api/search
│                   ├── score/
│                   │   └── route.ts          # POST /api/score
│                   └── shortlist/
│                       ├── route.ts          # GET/POST /api/shortlist
│                       └── [id]/
│                           └── route.ts      # DELETE /api/shortlist/:id
│
├── packages/
│   ├── core/                                 # Domain logic & models
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                      # Models (Listing, UserSearch, Score)
│   │       ├── scoring.ts                    # Scoring logic (5 subscores)
│   │       ├── scoring.test.ts               # Unit tests (Vitest)
│   │       └── listings-seed.ts              # 150+ mock listings
│   │
│   └── integrations/                         # Service adapters
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                      # Main exports
│           ├── mock.ts                       # Mock providers (default)
│           │   ├── MockListingsProvider
│           │   ├── MockNeighborhoodSignalsProvider
│           │   ├── MockMarketSignalsProvider
│           │   └── MockCommuteTimeProvider
│           └── real.ts                       # Real provider skeletons (TODO)
│               ├── RealListingsProvider
│               ├── RealNeighborhoodSignalsProvider
│               ├── RealMarketSignalsProvider
│               └── RealCommuteTimeProvider
│
└── docs/
    ├── 00-requirements.md                    # Functional & non-functional reqs
    ├── 01-architecture.md                    # C4 diagrams, data flow, scoring rules
    ├── 02-api-spec.md                        # OpenAPI-style endpoint spec
    ├── 03-data-model.md                      # Prisma schema, production migrations
    ├── 04-testing.md                         # Test pyramid, strategies, examples
    └── 05-deployment.md                      # Local dev, Vercel, PostgreSQL, real integrations
```

## 🚀 Quick Commands

```bash
# Install & run (< 10 minutes)
pnpm i
cp .env.example .env.local      # Or .env.local.example
pnpm dev                        # Start dev server on http://localhost:3000

# Testing
pnpm test                       # Run all unit tests
pnpm test -- --watch           # Watch mode
pnpm test -- --coverage        # Coverage report

# Code quality
pnpm lint                       # Run ESLint
pnpm format                     # Format with Prettier
pnpm type-check                 # TypeScript check

# Database
pnpm db:push                    # Sync schema to SQLite
pnpm db:seed                    # Seed mock data

# Building
pnpm build                      # Build all packages
```

## 📊 Architecture at a Glance

### Request Flow: Search

```
Browser → POST /api/search → Zod validation → MockListingsProvider
→ Filter ALL_LISTINGS in-memory → Sort by price → Return 20 results
```

### Request Flow: Score

```
Browser → POST /api/score → Zod validation → Fetch Listing
→ Parallel fetch: Neighborhood + Market + Commute signals
→ scoreListings() → Compute 5 subscores + overall + 3 reasons
→ Return ScoreBreakdown
```

### Scoring Breakdown (Overall = Weighted Sum)

| Factor | Weight | Calculation |
|--------|--------|-------------|
| Affordability | 25% | Monthly payment vs. budget |
| Commute | 20% | Estimated minutes vs. max constraint |
| Neighborhood | 25% | Schools + Safety + Walkability (risk-weighted) |
| Property Quality | 20% | Age + Size + Features + Type |
| Market Momentum | 10% | Days on market + Price trends + Inventory |

## 🔄 Data Persistence

- **POC**: SQLite (file-based, local)
- **Production**: PostgreSQL (Supabase/Neon)
- **Shortlist storage**: Prisma model with JSON blobs (fast, simple)

## 🎨 UI Overview

### Pages

| Page | Route | Purpose |
|------|-------|---------|
| Search | `/` | Form + results grid, select to compare |
| Compare | `/compare?listings=id1,id2,id3` | Side-by-side scores + reasons |
| Shortlist | `/shortlist` | View saved homes, delete |

### Components

- Search form (location, budget, beds/baths, must-haves)
- Listing card (price, details, checkbox)
- Score breakdown (progress bars, reasons)
- Shortlist card (saved home + score recap)

All styled with Tailwind CSS (no component library needed for POC).

## 🔐 Security & Privacy

✅ **Implemented**:
- Address masking (e.g., "1234 *** St")
- Zod validation on all inputs
- No secrets committed
- TypeScript strict mode

❌ **Not included (add if needed)**:
- Authentication (can add OAuth easily)
- Rate limiting (TODO for production)
- API key validation (for third-party calls)

## 🔌 Integration Strategy

**Mocks are default** (no API keys needed):

```typescript
const provider = getListingsProvider();  // Returns MockListingsProvider
```

**To switch to real** (when ready):

```bash
# Set in .env
INTEGRATIONS_MODE=real

# Add credentials
RESO_API_KEY=xxx
GOOGLE_MAPS_API_KEY=xxx
# etc.
```

See [docs/05-deployment.md](../docs/05-deployment.md) for detailed real integration guides.

## 📝 Key Design Decisions

1. **Monorepo (pnpm workspaces)**: Shared domain logic across packages
2. **Mock-first**: No vendor lock-in, easily swappable backends
3. **Deterministic scoring**: Reproducible, testable (no ML/randomness)
4. **SQLite for POC**: Simple, no external dependencies
5. **Prisma**: Type-safe database access, easy migrations
6. **Zod validation**: Runtime + compile-time type safety
7. **Masked addresses**: Privacy by default
8. **Immutable weights**: Weights cannot exceed 100% total (normalized)

## 📚 Documentation Quick Links

| Doc | Purpose |
|-----|---------|
| [00-requirements.md](../docs/00-requirements.md) | What the system does (FRs, NFRs, acceptance criteria) |
| [01-architecture.md](../docs/01-architecture.md) | How it works (C4 diagrams, data flow, scoring rules) |
| [02-api-spec.md](../docs/02-api-spec.md) | API endpoints with request/response examples |
| [03-data-model.md](../docs/03-data-model.md) | Database schema, caching, migration path |
| [04-testing.md](../docs/04-testing.md) | Test pyramid, unit/integration/e2e examples |
| [05-deployment.md](../docs/05-deployment.md) | Local dev, Vercel, PostgreSQL, real integrations |

## 🧪 Testing Summary

- **Unit**: Vitest, 70%+ coverage of scoring logic
- **Integration**: API route tests (search returns filtered, score is deterministic)
- **E2E**: Playwright templates provided (search → compare → shortlist)
- **Manual**: UI responsiveness, error messages, data accuracy

## 🌐 Deployment Paths

### POC (Vercel + SQLite)
```
pnpm i → .env setup → pnpm dev
vercel link → vercel deploy
```

### Production (Vercel + PostgreSQL)
```
Provision Postgres (Supabase/Neon)
Update Prisma schema (normalized)
pnpm db:push
Implement real providers (MLS, Google Maps, etc.)
vercel deploy
```

See [docs/05-deployment.md](../docs/05-deployment.md) for step-by-step.

## 🎯 Success Criteria

✅ **Achieved**:
- POC runs in < 10 minutes (`pnpm i && pnpm dev`)
- End-to-end workflows functional (search → compare → shortlist)
- Scoring deterministic & testable
- Mock integrations (no API keys needed)
- Comprehensive documentation
- Real integration paths clearly documented

📋 **Not in POC**:
- Real MLS/Google Maps calls (designed in, not enabled)
- Authentication (can add OAuth easily)
- Map visualization
- Mobile app
- Email notifications

## ❓ FAQ

**Q: Why are addresses masked?**  
A: Privacy first. Reveal exact addresses only to authenticated users.

**Q: Can I use real MLS data?**  
A: Yes! See [docs/05-deployment.md](../docs/05-deployment.md) for MLS/RESO setup.

**Q: How accurate is the scoring?**  
A: POC uses deterministic rules (not ML). Good for validation; real versions integrate ML + feedback loops.

**Q: Can I deploy to Vercel?**  
A: Yes! SQLite works initially. For scale, migrate to PostgreSQL.

**Q: How do I extend with more filters?**  
A: Update `UserSearch` schema in `packages/core/src/index.ts`, add form field in `apps/web/src/app/page.tsx`, implement filtering in mock provider.

## 🔗 Related Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Zod Docs](https://zod.dev)
- [Vitest Docs](https://vitest.dev/)
- [Playwright Docs](https://playwright.dev/)

---

**Last Updated**: January 2026  
**Status**: Fully functional POC ready for validation  
**Next Steps**: Validate product-market fit, plan real integration rollout
