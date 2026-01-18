# API Specification - My Next Home POC

## Overview

All endpoints accept JSON and return JSON. Validation is enforced with Zod on request bodies.

Base URL: `http://localhost:3000/api`

## Endpoints

### POST /api/search

Search for homes matching user criteria.

**Request**

```json
{
  "locationQuery": "34639",
  "budgetMin": 300000,
  "budgetMax": 500000,
  "bedsMin": 3,
  "bathsMin": 2,
  "mustHaves": ["garage"],
  "commuteTo": null,
  "commuteMaxMinutes": null,
  "riskTolerance": "MEDIUM"
}
```

**Request Fields**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `locationQuery` | string | ✅ | ZIP code, city, or state (e.g., "34639", "Tampa", "FL") |
| `budgetMin` | number | ✅ | Minimum price in dollars |
| `budgetMax` | number | ✅ | Maximum price in dollars |
| `bedsMin` | number | ✅ | Minimum bedrooms |
| `bathsMin` | number | ✅ | Minimum bathrooms |
| `mustHaves` | string[] | ✅ | Array of required features (e.g., ["garage", "pool"]) |
| `commuteTo` | string \| null | ❌ | Destination address for commute time (null = no commute constraint) |
| `commuteMaxMinutes` | number \| null | ❌ | Maximum commute time in minutes |
| `riskTolerance` | "LOW" \| "MEDIUM" \| "HIGH" | ✅ | Risk tolerance (affects neighborhood weighting) |

**Response (200 OK)**

```json
{
  "listings": [
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
      "photos": ["/photos/home1.jpg"],
      "createdAt": "2024-01-01T00:00:00Z"
    }
    // ... up to 20 results, sorted by price
  ]
}
```

**Response Fields**

| Field | Type | Description |
|-------|------|-------------|
| `listings` | Listing[] | Array of matching homes (max 20, sorted by price ASC) |

**Listing Schema**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique listing identifier |
| `addressMasked` | string | Masked address (e.g., "1234 *** St, City, State") |
| `city` | string | City name |
| `state` | string | State abbreviation |
| `zip` | string | ZIP code |
| `price` | number | List price in dollars |
| `beds` | number | Bedrooms |
| `baths` | number | Bathrooms (can be decimal, e.g., 2.5) |
| `sqft` | number | Square footage |
| `lotSqft` | number \| null | Lot size in square feet |
| `yearBuilt` | number \| null | Year built |
| `propertyType` | "SINGLE_FAMILY" \| "TOWNHOME" \| "CONDO" | Property type |
| `hoaMonthly` | number \| null | Monthly HOA fee (if any) |
| `taxesAnnualEstimate` | number \| null | Estimated annual property taxes |
| `insuranceAnnualEstimate` | number \| null | Estimated annual insurance |
| `lat` | number | Latitude |
| `lng` | number | Longitude |
| `features` | string[] | List of features (e.g., ["garage", "pool"]) |
| `photos` | string[] | Array of photo URLs |
| `createdAt` | string (ISO 8601) | When listing was created |

**Error Responses**

```json
// 400 Bad Request
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": [
      {
        "path": ["budgetMin"],
        "message": "Expected number"
      }
    ]
  }
}

// 500 Internal Server Error
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to search listings"
  }
}
```

---

### POST /api/score

Compute "Next Home Score" for specified listings.

**Request**

```json
{
  "listingIds": [
    "550e8400-e29b-41d4-a716-446655440000",
    "660e8400-e29b-41d4-a716-446655440001"
  ],
  "search": {
    "locationQuery": "34639",
    "budgetMin": 300000,
    "budgetMax": 500000,
    "bedsMin": 3,
    "bathsMin": 2,
    "mustHaves": [],
    "commuteTo": "downtown",
    "commuteMaxMinutes": 30,
    "riskTolerance": "MEDIUM",
    "weights": {
      "affordability": 0.25,
      "commute": 0.2,
      "neighborhood": 0.25,
      "propertyQuality": 0.2,
      "marketMomentum": 0.1
    }
  }
}
```

**Request Fields**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `listingIds` | string[] (UUIDs) | ✅ | Array of listing IDs to score (2-4 recommended) |
| `search` | UserSearch | ✅ | Search context (same as /search) with optional weights override |
| `search.weights` | object | ❌ | Custom weights (optional; must sum to ~1 if provided) |

**Response (200 OK)**

```json
{
  "listings": [ /* same as /search response */ ],
  "scores": [
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
    // ... one score per listing
  ]
}
```

**Score Fields**

| Field | Type | Description |
|-------|------|-------------|
| `listingId` | string (UUID) | ID of the listing being scored |
| `affordabilityScore` | number (0-100) | Monthly payment vs budget fit |
| `commuteScore` | number (0-100) | Commute time fit |
| `neighborhoodScore` | number (0-100) | Schools, safety, walkability |
| `propertyQualityScore` | number (0-100) | Age, size, features |
| `marketMomentumScore` | number (0-100) | Days on market, price trends, inventory |
| `overallScore` | number (0-100) | Weighted average of all subscores |
| `reasons` | string[] | Exactly 3 human-readable explanations |
| `weights` | object | Weights used in calculation |

**Scoring Rules Summary**

See [docs/01-architecture.md](01-architecture.md#scoring-rules-in-detail) for detailed scoring formulas.

**Error Responses**

Same as /search (validation errors, internal errors).

---

### GET /api/shortlist

Retrieve all shortlisted homes for current user.

**Request**

No request body.

**Response (200 OK)**

```json
{
  "items": [
    {
      "id": "clj6f9b9s0000qz7d9q8q8q8q",
      "listingId": "550e8400-e29b-41d4-a716-446655440000",
      "listingJson": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "addressMasked": "1234 *** St, Land O Lakes, FL",
        "price": 450000,
        "beds": 3,
        "baths": 2,
        "sqft": 2000,
        "city": "Land O Lakes",
        "zip": "34639",
        "/* ... other listing fields ... */": null
      },
      "scoreJson": {
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
        "weights": { /* ... */ }
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
    // ... all shortlisted homes
  ]
}
```

**Error Responses**

```json
// 500 Internal Server Error
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to fetch shortlist"
  }
}
```

---

### POST /api/shortlist

Add a home to the shortlist (computes score automatically).

**Request**

```json
{
  "listingId": "550e8400-e29b-41d4-a716-446655440000",
  "search": {
    "locationQuery": "34639",
    "budgetMin": 300000,
    "budgetMax": 500000,
    "bedsMin": 3,
    "bathsMin": 2,
    "mustHaves": [],
    "commuteTo": "downtown",
    "commuteMaxMinutes": 30,
    "riskTolerance": "MEDIUM"
  }
}
```

**Request Fields**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `listingId` | string (UUID) | ✅ | ID of home to shortlist |
| `search` | UserSearch | ✅ | Search context (used to compute score) |

**Response (200 OK)**

```json
{
  "shortlist": {
    "id": "clj6f9b9s0000qz7d9q8q8q8q",
    "listingId": "550e8400-e29b-41d4-a716-446655440000",
    "listingJson": { /* full Listing object */ },
    "scoreJson": { /* full ScoreBreakdown object */ },
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Error Responses**

```json
// 404 Not Found
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Listing not found"
  }
}

// 400 / 500 (same as other endpoints)
```

---

### DELETE /api/shortlist/:id

Remove a home from the shortlist.

**Request**

No request body.

**URL Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | ID of ShortlistedHome record to delete |

**Response (200 OK)**

```json
{
  "success": true
}
```

**Error Responses**

```json
// 500 Internal Server Error
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to delete shortlist item"
  }
}
```

---

## Error Code Reference

| Code | HTTP Status | Meaning |
|------|------------|---------|
| `VALIDATION_ERROR` | 400 | Request body failed Zod validation |
| `NOT_FOUND` | 404 | Listing or shortlist item not found |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Rate Limiting & Caching (Future)

**Recommended caching strategy**

| Endpoint | TTL | Reason |
|----------|-----|--------|
| `/api/search` | 1 hour | Results don't change frequently |
| `/api/score` | None (computed on-demand) | Scores depend on user preferences |
| `/api/shortlist` | 5 minutes | User's own data, low change frequency |

**Recommended rate limits**

- Authenticated: 100 requests/min
- Anonymous: 10 requests/min per IP

---

## Example Workflows

### Workflow 1: Search → Compare → Shortlist

```text
1. POST /api/search
   → Get 20 homes matching "34639", $300k-$500k, 3+ bed

2. Select 2-3 homes, POST /api/score with listingIds
   → Get scores for each

3. Click "Shortlist" on best home, POST /api/shortlist
   → Save to database

4. GET /api/shortlist
   → View shortlisted homes on /shortlist page

5. DELETE /api/shortlist/:id
   → Remove home from shortlist
```

### Workflow 2: Multiple Searches with Different Preferences

```text
1. POST /api/search (Land O Lakes, $350k-$450k, 3 bed, "MEDIUM" risk)
2. POST /api/score with top 2 homes
3. POST /api/search (Tampa, $400k-$550k, 4 bed, "LOW" risk)
4. POST /api/score with top 2 homes
5. Compare results via UI
6. POST /api/shortlist for best options from each search
```

---

## Data Types Reference

```typescript
// Enums
PropertyType = "SINGLE_FAMILY" | "TOWNHOME" | "CONDO"
RiskTolerance = "LOW" | "MEDIUM" | "HIGH"
InventoryLevel = "LOW" | "MEDIUM" | "HIGH"

// Complex types
Listing {
  id: string (UUID)
  addressMasked: string
  city: string
  state: string
  zip: string
  price: number
  beds: number
  baths: number
  sqft: number
  lotSqft: number | null
  yearBuilt: number | null
  propertyType: PropertyType
  hoaMonthly: number | null
  taxesAnnualEstimate: number | null
  insuranceAnnualEstimate: number | null
  lat: number
  lng: number
  features: string[]
  photos: string[]
  createdAt: string (ISO 8601)
}

UserSearch {
  locationQuery: string
  budgetMin: number
  budgetMax: number
  bedsMin: number
  bathsMin: number
  mustHaves: string[]
  commuteTo: string | null
  commuteMaxMinutes: number | null
  riskTolerance: RiskTolerance
  weights?: {
    affordability: number (0-1)
    commute: number (0-1)
    neighborhood: number (0-1)
    propertyQuality: number (0-1)
    marketMomentum: number (0-1)
  }
}

ScoreBreakdown {
  listingId: string (UUID)
  affordabilityScore: number (0-100)
  commuteScore: number (0-100)
  neighborhoodScore: number (0-100)
  propertyQualityScore: number (0-100)
  marketMomentumScore: number (0-100)
  overallScore: number (0-100)
  reasons: string[3]
  weights: { /* same as UserSearch.weights */ }
}
```
