/**
 * REAL Integration Adapters
 *
 * This file contains skeleton implementations for real integrations.
 * These are NOT enabled by default. To use:
 * 1. Set INTEGRATIONS_MODE=real in .env
 * 2. Add credentials for the external service (API keys, OAuth tokens)
 * 3. Implement the TODO sections below
 * 4. Run comprehensive tests against the real API
 *
 * See docs/05-deployment.md for detailed integration guides.
 */

import {
  ListingsProvider,
  NeighborhoodSignalsProvider,
  MarketSignalsProvider,
  CommuteTimeProvider,
  UserSearch,
  Listing,
} from '@mynexthome/core';

// ============================================================================
// REAL Listings Provider - MLS / RESO Web API Integration
// ============================================================================

/**
 * REAL MLS/RESO Web API Implementation
 *
 * Prerequisites:
 * - Partnership with MLS or RESO-compliant data provider
 * - API credentials: RESO_API_KEY, RESO_API_BASE_URL
 * - Consider: MLS.com, CRMLS, brokerage API partnerships
 *
 * Implementation steps:
 * 1. Authenticate with OAuth or API key
 * 2. Convert UserSearch to RESO/MLS query format
 * 3. Handle pagination and result limits
 * 4. Map MLS photo URLs to local CDN
 * 5. Cache results (Redis) to avoid rate limits
 * 6. Implement error handling and fallback to mock if unavailable
 */
export class RealListingsProvider implements ListingsProvider {
  private apiKey = process.env.RESO_API_KEY || '';
  private apiBaseUrl = process.env.RESO_API_BASE_URL || '';

  async search(query: UserSearch): Promise<Listing[]> {
    // TODO: Implement real RESO/MLS search
    // const response = await fetch(`${this.apiBaseUrl}/Search`, {
    //   method: 'POST',
    //   headers: { Authorization: `Bearer ${this.apiKey}` },
    //   body: JSON.stringify({
    //     filter: this.buildMlsFilter(query),
    //     select: ['ListingKey', 'Address', 'Price', 'BedroomsTotal', 'BathroomsTotalInteger', ...],
    //     top: 20
    //   })
    // });
    // const data = await response.json();
    // return data.map(mls => this.mapMlsToListing(mls));

    throw new Error('RealListingsProvider not yet implemented. Use mock provider.');
  }

  async getById(id: string): Promise<Listing | null> {
    // TODO: Implement real MLS fetch by ID
    throw new Error('RealListingsProvider not yet implemented. Use mock provider.');
  }

  // private buildMlsFilter(query: UserSearch): string {
  //   // Build OData filter for RESO API
  //   // Example: "(ListPrice ge 350000 and ListPrice le 500000) and (BedroomsTotal ge 3)"
  // }

  // private mapMlsToListing(mls: any): Listing {
  //   // Map MLS fields to Listing schema
  //   // Handle photo URLs, mask address, standardize property types
  // }
}

// ============================================================================
// REAL Neighborhood Signals - GreatSchools, Crime Data APIs
// ============================================================================

/**
 * REAL Neighborhood Signals Implementation
 *
 * Prerequisites:
 * - GreatSchools API (if licensed): GREATSCHOOLS_API_KEY
 * - Public crime data: FBI UCR, local police APIs
 * - Walkability: Mapbox/Google scoring
 *
 * Implementation steps:
 * 1. Query GreatSchools by coordinates or address
 * 2. Fetch local crime statistics by zip/city
 * 3. Call Mapbox Isochrone or similar for walkability
 * 4. Cache results in Redis (neighborhoods don't change frequently)
 * 5. Handle missing data gracefully (fallback to mock)
 */
export class RealNeighborhoodSignalsProvider implements NeighborhoodSignalsProvider {
  async getSignals(zip: string, city: string, state: string) {
    // TODO: Implement real integrations
    // const schoolData = await this.fetchGreatSchoolsData(city, state);
    // const crimeData = await this.fetchCrimeData(zip);
    // const walkabilityScore = await this.fetchWalkabilityScore(city, state);

    throw new Error('RealNeighborhoodSignalsProvider not yet implemented. Use mock provider.');
  }

  // private async fetchGreatSchoolsData(city: string, state: string) {
  //   // Query GreatSchools API and average school ratings
  // }

  // private async fetchCrimeData(zip: string) {
  //   // Fetch from FBI crime statistics or local police API
  //   // Normalize to 1-100 scale
  // }

  // private async fetchWalkabilityScore(city: string, state: string) {
  //   // Use Mapbox Accessibility or Google Places API
  // }
}

// ============================================================================
// REAL Market Signals - Redfin, FRED, FHFA Data
// ============================================================================

/**
 * REAL Market Signals Implementation
 *
 * Prerequisites:
 * - Redfin Data Center (limited free data, paid tier for detailed stats)
 * - FHFA House Price Index (free, public data)
 * - FRED economic data (free, public)
 * - Local MLS statistics (requires MLS partnership)
 *
 * Implementation steps:
 * 1. Query Redfin Data Center by metro/zip (if available)
 * 2. Fetch FHFA HPI trends
 * 3. Get local inventory data from MLS partner
 * 4. Calculate YoY price changes
 * 5. Cache in Redis (update daily/weekly)
 */
export class RealMarketSignalsProvider implements MarketSignalsProvider {
  async getSignals(zip: string, city: string, state: string) {
    // TODO: Implement real data fetching
    // const redfin = await this.fetchRedfin Data(zip);
    // const fhfa = await this.fetchFHFAData(state);
    // const mls = await this.fetchMLSStats(city, zip);

    throw new Error('RealMarketSignalsProvider not yet implemented. Use mock provider.');
  }

  // private async fetchRedfin Data(zip: string) {
  //   // Query Redfin by zip if API available
  // }

  // private async fetchFHFAData(state: string) {
  //   // Query FHFA HPI by state
  // }

  // private async fetchMLSStats(city: string, zip: string) {
  //   // Query MLS partner for local statistics
  // }
}

// ============================================================================
// REAL Commute Time - Google Maps, Mapbox
// ============================================================================

/**
 * REAL Commute Time Implementation
 *
 * Prerequisites:
 * - Google Maps Platform API key: GOOGLE_MAPS_API_KEY
 *   OR Mapbox API key: MAPBOX_API_KEY
 * - Enable Distance Matrix or Directions API
 *
 * Implementation steps:
 * 1. Query Google/Mapbox for distance and duration
 * 2. Support multiple transit modes (driving, transit, walking)
 * 3. Handle peak vs off-peak estimates (if available)
 * 4. Cache results (commute estimates don't change intra-day much)
 * 5. Implement error handling and fallback to mock
 */
export class RealCommuteTimeProvider implements CommuteTimeProvider {
  private googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || '';

  async getEstimatedMinutes(
    fromLat: number,
    fromLng: number,
    toAddress: string
  ): Promise<number> {
    // TODO: Implement Google Maps Distance Matrix API
    // const response = await fetch(
    //   `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${fromLat},${fromLng}&destinations=${encodeURIComponent(toAddress)}&key=${this.googleMapsApiKey}`
    // );
    // const data = await response.json();
    // return data.rows[0].elements[0].duration.value / 60; // convert seconds to minutes

    throw new Error('RealCommuteTimeProvider not yet implemented. Use mock provider.');
  }
}

// ============================================================================
// Factory with fallback to mock
// ============================================================================

const MODE = process.env.INTEGRATIONS_MODE || 'mock';

export function getRealListingsProvider(): ListingsProvider {
  if (MODE === 'real') {
    return new RealListingsProvider();
  }
  throw new Error('Real integrations not enabled');
}

export function getRealNeighborhoodSignalsProvider(): NeighborhoodSignalsProvider {
  if (MODE === 'real') {
    return new RealNeighborhoodSignalsProvider();
  }
  throw new Error('Real integrations not enabled');
}

export function getRealMarketSignalsProvider(): MarketSignalsProvider {
  if (MODE === 'real') {
    return new RealMarketSignalsProvider();
  }
  throw new Error('Real integrations not enabled');
}

export function getRealCommuteTimeProvider(): CommuteTimeProvider {
  if (MODE === 'real') {
    return new RealCommuteTimeProvider();
  }
  throw new Error('Real integrations not enabled');
}
