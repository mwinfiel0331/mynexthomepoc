# Requirements - My Next Home POC

## Functional Requirements

### FR-1: Home Search
**User Goal**: Find homes matching preferences in their target location

- **FR-1.1**: Search by location (ZIP code, city, or state)
- **FR-1.2**: Filter by budget range (min/max price)
- **FR-1.3**: Filter by bedrooms and bathrooms (minimum)
- **FR-1.4**: Filter by must-have features (garage, pool, fenced yard, HOA, etc.)
- **FR-1.5**: Return up to 20 results, sorted by price ascending
- **FR-1.6**: Display key listing details (address, price, beds, baths, sqft, HOA, features)

### FR-2: Home Comparison & Scoring
**User Goal**: Understand how well each home fits their needs via a "Next Home Score"

- **FR-2.1**: Select 2-4 homes to compare
- **FR-2.2**: Backend computes "Next Home Score" (0-100) per home
- **FR-2.3**: Score breakdown shows subscores (affordability, commute, neighborhood, property quality, market momentum)
- **FR-2.4**: Each score includes exactly 3 human-readable reasons (e.g., "Monthly estimate fits budget comfortably")
- **FR-2.5**: Render comparison view side-by-side with scores and reasons
- **FR-2.6**: Allow re-sort by overall score or individual subscore

### FR-3: Shortlist Management
**User Goal**: Save homes of interest for future reference

- **FR-3.1**: "Shortlist" button on search results
- **FR-3.2**: Shortlist persists in local database (SQLite)
- **FR-3.3**: View shortlist at `/shortlist` page
- **FR-3.4**: Delete items from shortlist
- **FR-3.5**: Display stored score and reasons on shortlist

### FR-4: Scoring Model
**Goal**: Provide explainable, reproducible scoring

- **FR-4.1**: Affordability Score
  - Estimate monthly payment (mortgage + taxes + insurance + HOA)
  - Score high if payment << budget, low if payment exceeds DTI threshold
  - Reason: e.g., "Monthly payment fits budget comfortably" vs. "Monthly payment may stretch budget"

- **FR-4.2**: Commute Score
  - Use mock commute time estimates (deterministic based on coordinates)
  - If no commute constraint, return neutral (75/100)
  - If within constraint: score 100; penalize 5pts/minute over
  - Reason: e.g., "Commute well under 30 minute target" vs. "Commute exceeds target"

- **FR-4.3**: Neighborhood Score
  - Schools (1-10 rating)
  - Safety (1-100 index)
  - Walkability (1-100)
  - Adjust weights based on user's risk tolerance (LOW/MEDIUM/HIGH)
  - Reason: e.g., "Strong schools, safety, and walkability"

- **FR-4.4**: Property Quality Score
  - Adjust for age (newer is better, old penalized)
  - Size (bonus for >2500 sqft, penalty for <1200 sqft)
  - Features count
  - Property type (slight preference for single-family)
  - Reason: e.g., "3bd/2ba, 2000sqft with good features"

- **FR-4.5**: Market Momentum Score
  - Days on market (fewer is good for buyers)
  - YoY price change (declining is better for buyers)
  - Inventory level (HIGH is good for buyers)
  - Reason: e.g., "Buyer-friendly market conditions"

- **FR-4.6**: Overall Score
  - Weighted sum of subscores
  - Default weights: affordability 25%, commute 20%, neighborhood 25%, property quality 20%, market momentum 10%
  - Allow user weights override (normalized to 1)
  - Formula: `overall = sum(score_i * weight_i) for i in {5 factors}`

## Non-Functional Requirements

### NFR-1: Performance
- Search completes < 500ms (in-memory filtering)
- Scoring for 4 homes completes < 1s
- Page load < 2s on 3G connection

### NFR-2: Reliability
- 99% uptime (POC)
- Graceful degradation if mocks unavailable
- Validation on all API inputs (Zod)

### NFR-3: Scalability
- POC: SQLite (single DB)
- Production path: PostgreSQL with read replicas
- Cache neighborhood/market signals (5-day TTL)
- API results cacheable (1-hour TTL)

### NFR-4: Security & Privacy
- Mask all addresses (e.g., "1234 *** St, City, State")
- No authentication required (can add OAuth later)
- No secrets committed to repo
- HTTPS in production
- Input validation everywhere

### NFR-5: Maintainability
- All code in TypeScript (strict mode)
- Comprehensive documentation (architecture, API, data model)
- Unit test coverage > 70% for core logic
- E2E tests for critical user flows

### NFR-6: Deployability
- Docker-ready (optional Dockerfile for POC)
- Environment-driven config (.env)
- Database migrations tracked (Prisma)
- Single-command setup: `pnpm i && pnpm dev`

## Assumptions & Constraints

### Assumptions
1. **Mock data is sufficient for validation**: We use 150+ realistic seed listings, not real MLS
2. **Masked addresses OK**: Privacy > address accuracy for POC
3. **Deterministic scoring**: No ML required; reproducible rules sufficient
4. **SQLite acceptable**: Single-user POC; production needs PostgreSQL
5. **No real payments**: This is a decision-support tool, not a transaction platform

### Constraints
1. **No real MLS by default**: Requires partnership + licensing
2. **No real geocoding/directions by default**: Requires API keys + costs
3. **Single-tenant**: POC doesn't include multi-user accounts
4. **No map view**: Search results are list/grid only
5. **No AI/ML**: Scoring uses deterministic rules only

## Out of Scope (Non-Goals)

- Real MLS integration (guided in docs for future)
- Mortgage pre-qualification (informational only)
- Payment processing
- Realtor/agent matching
- Property tours/virtual showings
- Offer management
- Document e-signature
- Map visualization
- Email notifications
- Mobile app

## Acceptance Criteria

### AC-1: POC Runnable End-to-End
- [ ] `pnpm i` installs all deps
- [ ] `pnpm dev` starts all services
- [ ] `http://localhost:3000` loads homepage
- [ ] Search returns 20 results for "34639"
- [ ] User can select 2 homes and compare
- [ ] Compare page shows scores + reasons
- [ ] Shortlist persists across page reload
- [ ] `pnpm test` passes all unit tests

### AC-2: Code Quality
- [ ] All code is TypeScript (strict mode)
- [ ] No secrets in committed files
- [ ] Scoring logic deterministic + testable
- [ ] API validation with Zod
- [ ] Error messages helpful

### AC-3: Documentation
- [ ] README with setup steps
- [ ] Architecture overview (C4 level)
- [ ] API spec with examples
- [ ] Data model + schema
- [ ] Testing strategy
- [ ] Deployment guidance (POC + production)
- [ ] Inline code comments for scoring rules

### AC-4: Real Integration Ready
- [ ] Interfaces defined for all external services
- [ ] Mock adapters work without API keys
- [ ] Real adapter skeletons with TODO comments
- [ ] Env flags to switch mock ↔ real
- [ ] Docs explain how to wire real services
