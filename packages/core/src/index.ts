import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Enums
export const PropertyTypeEnum = z.enum(['SINGLE_FAMILY', 'TOWNHOME', 'CONDO']);
export type PropertyType = z.infer<typeof PropertyTypeEnum>;

export const RiskToleranceEnum = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export type RiskTolerance = z.infer<typeof RiskToleranceEnum>;

// Domain Models
export const ListingSchema = z.object({
  id: z.string().uuid(),
  addressMasked: z.string(), // e.g., "1234 *** St, Land O Lakes, FL"
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  price: z.number().positive(),
  beds: z.number().int().positive(),
  baths: z.number().positive(),
  sqft: z.number().positive(),
  lotSqft: z.number().positive().nullable(),
  yearBuilt: z.number().int().nullable(),
  propertyType: PropertyTypeEnum,
  hoaMonthly: z.number().nonnegative().nullable(),
  taxesAnnualEstimate: z.number().nonnegative().nullable(),
  insuranceAnnualEstimate: z.number().nonnegative().nullable(),
  lat: z.number(),
  lng: z.number(),
  features: z.array(z.string()),
  photos: z.array(z.string()),
  createdAt: z.date(),
});

export type Listing = z.infer<typeof ListingSchema>;

export const UserSearchSchema = z.object({
  locationQuery: z.string(),
  budgetMin: z.number().nonnegative(),
  budgetMax: z.number().positive(),
  bedsMin: z.number().int().positive(),
  bathsMin: z.number().positive(),
  mustHaves: z.array(z.string()),
  commuteTo: z.string().nullable(),
  commuteMaxMinutes: z.number().positive().nullable(),
  riskTolerance: RiskToleranceEnum,
  weights: z
    .object({
      affordability: z.number().min(0).max(1),
      commute: z.number().min(0).max(1),
      neighborhood: z.number().min(0).max(1),
      propertyQuality: z.number().min(0).max(1),
      marketMomentum: z.number().min(0).max(1),
    })
    .optional(),
});

export type UserSearch = z.infer<typeof UserSearchSchema>;

export const ScoreBreakdownSchema = z.object({
  listingId: z.string().uuid(),
  affordabilityScore: z.number().min(0).max(100),
  commuteScore: z.number().min(0).max(100),
  neighborhoodScore: z.number().min(0).max(100),
  propertyQualityScore: z.number().min(0).max(100),
  marketMomentumScore: z.number().min(0).max(100),
  overallScore: z.number().min(0).max(100),
  reasons: z.array(z.string()).length(3),
  weights: z.object({
    affordability: z.number().min(0).max(1),
    commute: z.number().min(0).max(1),
    neighborhood: z.number().min(0).max(1),
    propertyQuality: z.number().min(0).max(1),
    marketMomentum: z.number().min(0).max(1),
  }),
});

export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>;

// Integration Interfaces

/**
 * Listings provider interface.
 * Real implementations should fetch from MLS, RESO Web API, or brokerage partners.
 */
export interface ListingsProvider {
  search(query: UserSearch): Promise<Listing[]>;
  getById(id: string): Promise<Listing | null>;
}

/**
 * Neighborhood signals provider interface.
 * Real implementations should integrate with GreatSchools, public crime APIs, walkability data.
 */
export interface NeighborhoodSignalsProvider {
  getSignals(zip: string, city: string, state: string): Promise<NeighborhoodSignals>;
}

export interface NeighborhoodSignals {
  schoolRating: number; // 1-10
  safetyIndex: number; // 1-100
  walkability: number; // 1-100
}

/**
 * Market signals provider interface.
 * Real implementations should fetch from Redfin Data Center, FHFA, local MLS.
 */
export interface MarketSignalsProvider {
  getSignals(zip: string, city: string, state: string): Promise<MarketSignals>;
}

export interface MarketSignals {
  medianDaysOnMarket: number;
  yoyPriceChangePct: number; // e.g., 3.5 for +3.5%
  inventoryLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Commute time provider interface.
 * Real implementations should use Google Maps, Mapbox, or local transit APIs.
 */
export interface CommuteTimeProvider {
  getEstimatedMinutes(
    fromLat: number,
    fromLng: number,
    toAddress: string
  ): Promise<number>;
}

// Constants and Defaults
export const DEFAULT_WEIGHTS = {
  affordability: 0.25,
  commute: 0.2,
  neighborhood: 0.25,
  propertyQuality: 0.2,
  marketMomentum: 0.1,
};

// Validate that weights sum to 1
const sum = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(sum - 1) > 0.001) {
  throw new Error('DEFAULT_WEIGHTS must sum to 1');
}

export const DEFAULT_INTEREST_RATE = 0.065; // 6.5%
export const DEFAULT_LOAN_TERM_YEARS = 30;
export const DEFAULT_DOWN_PAYMENT_PCT = 0.2; // 20%

export function generateId(): string {
  return uuidv4();
}

export function normalizeWeights(
  weights?: Partial<typeof DEFAULT_WEIGHTS>
): typeof DEFAULT_WEIGHTS {
  const merged = { ...DEFAULT_WEIGHTS, ...weights };
  const sum = Object.values(merged).reduce((a, b) => a + b, 0);
  if (sum === 0) return DEFAULT_WEIGHTS;

  return {
    affordability: merged.affordability / sum,
    commute: merged.commute / sum,
    neighborhood: merged.neighborhood / sum,
    propertyQuality: merged.propertyQuality / sum,
    marketMomentum: merged.marketMomentum / sum,
  };
}
