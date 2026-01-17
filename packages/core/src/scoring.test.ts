import { describe, it, expect } from 'vitest';
import {
  calculateMonthlyPayment,
  calculateAffordabilityScore,
  calculateCommuteScore,
  calculateNeighborhoodScore,
  calculatePropertyQualityScore,
  calculateMarketMomentumScore,
  generateScoreReasons,
  estimateTotalMonthlyPayment,
} from './scoring';
import { Listing, UserSearch } from './index';

// Test data
const sampleListing: Listing = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  addressMasked: '1234 *** St, Land O Lakes, FL',
  city: 'Land O Lakes',
  state: 'FL',
  zip: '34639',
  price: 450000,
  beds: 3,
  baths: 2,
  sqft: 2000,
  lotSqft: 7500,
  yearBuilt: 2015,
  propertyType: 'SINGLE_FAMILY' as const,
  hoaMonthly: null,
  taxesAnnualEstimate: 5400,
  insuranceAnnualEstimate: 2700,
  lat: 28.15,
  lng: -82.45,
  features: ['garage', 'pool', 'fenced yard'],
  photos: ['/photos/home1.jpg'],
  createdAt: new Date(),
};

const sampleSearch: UserSearch = {
  locationQuery: '34639',
  budgetMin: 350000,
  budgetMax: 500000,
  bedsMin: 3,
  bathsMin: 2,
  mustHaves: ['garage'],
  commuteTo: null,
  commuteMaxMinutes: null,
  riskTolerance: 'MEDIUM',
};

describe('Mortgage Calculation', () => {
  it('should calculate monthly payment correctly', () => {
    // Known case: $450k home, 20% down, 6.5%, 30yr
    // Principal: $360k
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

describe('Affordability Scoring', () => {
  it('should score affordable homes high', () => {
    const search = { ...sampleSearch, budgetMax: 600000 };
    const score = calculateAffordabilityScore(sampleListing, search);
    expect(score).toBeGreaterThan(50);
  });

  it('should score expensive homes low', () => {
    const search = { ...sampleSearch, budgetMax: 300000 };
    const score = calculateAffordabilityScore(sampleListing, search);
    expect(score).toBeLessThan(50);
  });

  it('should return 0 for unaffordable homes', () => {
    const search = { ...sampleSearch, budgetMax: 200000 };
    const score = calculateAffordabilityScore(sampleListing, search);
    expect(score).toBe(0);
  });
});

describe('Commute Scoring', () => {
  it('should score perfect commute 100', () => {
    const score = calculateCommuteScore(10, 30);
    expect(score).toBe(100);
  });

  it('should score over-target commute lower', () => {
    const score = calculateCommuteScore(40, 30);
    expect(score).toBeLessThan(75);
    expect(score).toBeGreaterThan(0);
  });

  it('should return neutral score without commute constraint', () => {
    const score = calculateCommuteScore(100, null);
    expect(score).toBe(75);
  });
});

describe('Neighborhood Scoring', () => {
  it('should score highly with good signals', () => {
    const score = calculateNeighborhoodScore(
      { schoolRating: 9, safetyIndex: 85, walkability: 80 },
      'MEDIUM'
    );
    expect(score).toBeGreaterThan(80);
  });

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

describe('Property Quality Scoring', () => {
  it('should score recent large homes high', () => {
    const recent = { ...sampleListing, yearBuilt: 2023, sqft: 3000, features: ['pool', 'garage'] };
    const score = calculatePropertyQualityScore(recent);
    expect(score).toBeGreaterThan(70);
  });

  it('should score old small homes lower', () => {
    const old = { ...sampleListing, yearBuilt: 1960, sqft: 1000, features: [] };
    const score = calculatePropertyQualityScore(old);
    expect(score).toBeLessThan(60);
  });
});

describe('Market Momentum Scoring', () => {
  it('should favor buyer-friendly markets', () => {
    const buyerFriendly = calculateMarketMomentumScore({
      medianDaysOnMarket: 90,
      yoyPriceChangePct: -1,
      inventoryLevel: 'HIGH' as const,
    });
    expect(buyerFriendly).toBeGreaterThan(70);
  });

  it('should penalize seller markets', () => {
    const sellerMarket = calculateMarketMomentumScore({
      medianDaysOnMarket: 5,
      yoyPriceChangePct: 8,
      inventoryLevel: 'LOW' as const,
    });
    expect(sellerMarket).toBeLessThan(40);
  });
});

describe('Reason Generation', () => {
  it('should generate exactly 3 reasons', () => {
    const reasons = generateScoreReasons(sampleListing, sampleSearch, {
      affordability: 85,
      commute: 70,
      neighborhood: 80,
      propertyQuality: 75,
      marketMomentum: 60,
    });
    expect(reasons).toHaveLength(3);
    expect(reasons.every((r) => typeof r === 'string' && r.length > 0)).toBe(true);
  });

  it('should reflect actual scores in reasons', () => {
    const reasons = generateScoreReasons(sampleListing, sampleSearch, {
      affordability: 90,
      commute: 50,
      neighborhood: 40,
      propertyQuality: 70,
      marketMomentum: 60,
    });
    const highestReason = reasons[0];
    expect(highestReason.toLowerCase()).toMatch(/budget|afford/);
  });
});
