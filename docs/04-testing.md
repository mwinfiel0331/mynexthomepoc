# Testing Strategy - My Next Home POC

## Test Pyramid

```text
         △
        /|\
       / | \
      /  |  \    E2E Tests (Playwright)
     /   |   \   - User workflows
    /____|____\  - Shortlist persistence
    
      /    \
     /      \     Integration Tests (API routes)
    /________\    - /api/search filters correctly
               - /api/score returns deterministic
    
   ____________  Unit Tests (Vitest)
   Core Scoring  - Mortgage math
   Mock Adapts   - Weight normalization
   Utilities     - Reason generation
```

### Test Statistics (Target)

- **Unit Tests**: 70%+ coverage of core package
- **Integration Tests**: Critical API paths
- **E2E Tests**: 2-3 critical user workflows
- **Total Execution Time**: < 2 minutes

---

## Unit Tests

### Location: `packages/core/src/scoring.test.ts`

Run: `cd packages/core && pnpm test` or `pnpm test` from root

### Test Coverage

#### Mortgage Calculations

```typescript
describe('Mortgage Calculation', () => {
  it('should calculate monthly payment correctly', () => {
    // Known case: $450k home, 20% down, 6.5%, 30yr
    // Expected: ~$2,281/month
    const payment = calculateMonthlyPayment(450000);
    expect(payment).toBeGreaterThan(2200);
    expect(payment).toBeLessThan(2400);
  });

  it('should handle zero interest rate', () => {
    const payment = calculateMonthlyPayment(120000, 0.2, 0, 30);
    // Principal $96k / 360 months = $266.67/month
    expect(payment).toBeCloseTo(266.67, 1);
  });

  it('should estimate total monthly payment including taxes/insurance', () => {
    const total = estimateTotalMonthlyPayment(sampleListing);
    // Mortgage ~$2281, taxes ~$450, insurance ~$225 = ~$2956
    expect(total).toBeGreaterThan(2700);
    expect(total).toBeLessThan(3200);
  });
});
```

**Key tests**:
- ✅ Affordability score boundaries (0, 100, mid-range)
- ✅ Commute score above/below target
- ✅ Neighborhood weights by risk tolerance
- ✅ Property quality adjustments
- ✅ Market momentum scoring
- ✅ Weight normalization (sum to 1)
- ✅ Reason generation (exactly 3 strings)

#### Scoring Rules

```typescript
describe('Affordability Scoring', () => {
  it('should score affordable homes high', () => {
    const search = { ...sampleSearch, budgetMax: 600000 };
    const score = calculateAffordabilityScore(sampleListing, search);
    expect(score).toBeGreaterThan(50);
  });

  it('should return 0 for unaffordable homes', () => {
    const search = { ...sampleSearch, budgetMax: 200000 };
    const score = calculateAffordabilityScore(sampleListing, search);
    expect(score).toBe(0);
  });
});
```

#### Neighborhood & Risk Tolerance

```typescript
describe('Neighborhood Scoring', () => {
  it('should penalize low safety more for risk-averse users', () => {
    const lowRiskScore = calculateNeighborhoodScore(
      { schoolRating: 8, safetyIndex: 40, walkability: 70 },
      'LOW'
    );
    const highRiskScore = calculateNeighborhoodScore(
      { schoolRating: 8, safetyIndex: 40, walkability: 70 },
      'HIGH'
    );
    expect(lowRiskScore).toBeLessThan(highRiskScore);
  });
});
```

#### Determinism & Reproducibility

```typescript
describe('Scoring Determinism', () => {
  it('should produce identical scores for identical inputs', () => {
    const score1 = scoreListings(listing, search, signals, market, 25);
    const score2 = scoreListings(listing, search, signals, market, 25);
    expect(score1).toEqual(score2);
  });

  it('should not include randomness in reasons', () => {
    const reasons = generateScoreReasons(listing, search, scoreValues);
    expect(reasons).toHaveLength(3);
    expect(reasons.every(r => typeof r === 'string' && r.length > 0)).toBe(true);
  });
});
```

---

## Integration Tests

### Location: `apps/web/src/app/api/__tests__/`

**Note**: Basic integration tests are provided; extend as needed.

Run: `cd apps/web && pnpm test` or `pnpm test` from root

### Test Patterns

#### API Search Endpoint

```typescript
describe('POST /api/search', () => {
  it('should return filtered listings', async () => {
    const response = await fetch('http://localhost:3000/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationQuery: '34639',
        budgetMin: 300000,
        budgetMax: 500000,
        bedsMin: 3,
        bathsMin: 2,
        mustHaves: ['garage'],
        riskTolerance: 'MEDIUM',
      }),
    });

    const data = await response.json();
    expect(data.listings).toBeDefined();
    expect(Array.isArray(data.listings)).toBe(true);
    expect(data.listings.length).toBeLessThanOrEqual(20);

    // All results should match criteria
    data.listings.forEach(listing => {
      expect(listing.price).toBeGreaterThanOrEqual(300000);
      expect(listing.price).toBeLessThanOrEqual(500000);
      expect(listing.beds).toBeGreaterThanOrEqual(3);
      expect(listing.baths).toBeGreaterThanOrEqual(2);
      expect(listing.zip).toBe('34639');
    });
  });

  it('should validate request body', async () => {
    const response = await fetch('http://localhost:3000/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationQuery: '34639',
        budgetMin: 300000,
        // Missing required fields
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });
});
```

#### API Score Endpoint

```typescript
describe('POST /api/score', () => {
  it('should compute deterministic scores for known listings', async () => {
    // Use seed listing IDs
    const listingIds = [
      '550e8400-e29b-41d4-a716-446655440000',
      '660e8400-e29b-41d4-a716-446655440001',
    ];

    const response = await fetch('http://localhost:3000/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingIds,
        search: {
          locationQuery: '34639',
          budgetMin: 300000,
          budgetMax: 500000,
          bedsMin: 3,
          bathsMin: 2,
          mustHaves: [],
          commuteTo: null,
          commuteMaxMinutes: null,
          riskTolerance: 'MEDIUM',
        },
      }),
    });

    const data = await response.json();
    expect(data.scores).toBeDefined();
    expect(data.scores.length).toBe(2);

    data.scores.forEach(score => {
      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.overallScore).toBeLessThanOrEqual(100);
      expect(score.reasons).toHaveLength(3);
    });
  });

  it('should apply custom weights correctly', async () => {
    const search = {
      locationQuery: '34639',
      budgetMin: 300000,
      budgetMax: 500000,
      bedsMin: 3,
      bathsMin: 2,
      mustHaves: [],
      riskTolerance: 'MEDIUM',
      weights: {
        affordability: 0.5,  // Emphasize affordability
        commute: 0.1,
        neighborhood: 0.2,
        propertyQuality: 0.1,
        marketMomentum: 0.1,
      },
    };

    const response = await fetch('http://localhost:3000/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingIds: ['550e8400-e29b-41d4-a716-446655440000'],
        search,
      }),
    });

    const data = await response.json();
    expect(data.scores[0].weights.affordability).toBe(0.5);
  });
});
```

---

## E2E Tests (Playwright)

### Location: `apps/web/e2e/`

Run: `cd apps/web && pnpm test:e2e` (after implementing Playwright setup)

### Test Scenarios

#### Scenario 1: Search → Compare → Shortlist

```typescript
import { test, expect } from '@playwright/test';

test.describe('Search → Compare → Shortlist Workflow', () => {
  test('should complete full user journey', async ({ page }) => {
    // 1. Navigate to home
    await page.goto('http://localhost:3000');

    // 2. Fill search form
    await page.fill('input[placeholder*="City, ZIP"]', '34639');
    await page.fill('input[value="300000"]', '300000');  // Min budget
    await page.fill('input[value="500000"]', '500000');  // Max budget
    await page.fill('input[value="3"]', '3');             // Min beds
    await page.fill('input[value="2"]', '2');             // Min baths

    // 3. Submit search
    await page.click('button:has-text("Search Homes")');

    // 4. Wait for results
    await page.waitForSelector('text=Found');
    const listings = await page.locator('[role="checkbox"]').count();
    expect(listings).toBeGreaterThan(0);

    // 5. Select 2 homes
    const checkboxes = page.locator('[type="checkbox"]').slice(0, 2);
    for (let i = 0; i < 2; i++) {
      await checkboxes.nth(i).click();
    }

    // 6. Click compare button
    await page.click('text=Compare');

    // 7. Wait for compare page
    await page.waitForURL('**/compare**');
    await page.waitForSelector('text=Overall Score');

    // 8. Verify scores are displayed
    const scores = page.locator('text=/Score/');
    expect(scores.count()).toBeGreaterThan(0);

    // 9. Navigate back to search
    await page.goto('http://localhost:3000');

    // 10. Shortlist a home (future: implement shortlist button)
    // await page.click('text=Shortlist');

    // 11. Navigate to shortlist
    await page.click('text=Shortlist');
    await page.waitForURL('**/shortlist**');

    // 12. Verify shortlist is displayed
    await page.waitForSelector('text=Shortlist');
  });
});
```

#### Scenario 2: Shortlist Persistence

```typescript
test('should persist shortlist across page reloads', async ({ page }) => {
  // 1. Shortlist a home (assuming from previous test)
  await page.goto('http://localhost:3000/shortlist');
  const initialCount = await page.locator('[class*="card"]').count();
  expect(initialCount).toBeGreaterThan(0);

  // 2. Reload page
  await page.reload();

  // 3. Shortlist should still be there
  const reloadedCount = await page.locator('[class*="card"]').count();
  expect(reloadedCount).toBe(initialCount);

  // 4. Delete an item
  const deleteButton = page.locator('button:has-text("✕")').first();
  await deleteButton.click();

  // 5. Verify deletion
  const afterDeleteCount = await page.locator('[class*="card"]').count();
  expect(afterDeleteCount).toBe(initialCount - 1);

  // 6. Reload again to confirm persistence
  await page.reload();
  const finalCount = await page.locator('[class*="card"]').count();
  expect(finalCount).toBe(afterDeleteCount);
});
```

---

## Manual Testing Checklist

- [ ] Search with various criteria (different ZIP, budget, beds, features)
- [ ] Verify results are filtered correctly
- [ ] Select homes and compare
- [ ] Verify scores are displayed and make sense
- [ ] Shortlist a home
- [ ] Reload /shortlist page and verify persistence
- [ ] Delete from shortlist
- [ ] Test error cases (invalid input, missing listings)
- [ ] Check UI on mobile (iPhone SE, iPad)
- [ ] Test on slow 3G connection
- [ ] Verify no console errors

---

## Running Tests

### All Tests

```bash
pnpm test  # Runs all packages
```

### Specific Package

```bash
cd packages/core && pnpm test
cd apps/web && pnpm test
```

### Watch Mode

```bash
pnpm test -- --watch
```

### Coverage Report

```bash
pnpm test -- --coverage
```

### E2E (when implemented)

```bash
cd apps/web && pnpm test:e2e
# Or headless in CI:
cd apps/web && pnpm test:e2e --headed=false
```

---

## Continuous Integration (GitHub Actions)

See `.github/workflows/ci.yml`:

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - run: pnpm i
      - run: pnpm lint
      - run: pnpm type-check
      - run: pnpm test
      - run: pnpm build
      # E2E tests could be added here once Playwright is set up
```

---

## Known Limitations & Future Improvements

### Current Limitations

- No database integration tests (SQLite in-memory would help)
- No visual regression testing
- No performance benchmarks
- E2E tests not yet implemented (Playwright setup required)

### Future Improvements

- [ ] Mock database for integration tests
- [ ] Load testing (k6 or similar)
- [ ] Visual regression tests (Percy or similar)
- [ ] Accessibility tests (axe-core)
- [ ] API contract tests (Pact)
- [ ] Mutation testing (to validate test quality)

### Test Maintenance

- Update scoring tests if rules change
- Add tests for new filters/features
- Maintain mock data consistency with business rules
- Keep integration tests in sync with API schema
