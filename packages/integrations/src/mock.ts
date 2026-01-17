import {
  ListingsProvider,
  NeighborhoodSignalsProvider,
  MarketSignalsProvider,
  CommuteTimeProvider,
  UserSearch,
  Listing,
} from '@mynexthome/core';
import { ALL_LISTINGS } from '@mynexthome/core/listings-seed-simple';

/**
 * MOCK Listings Provider
 *
 * Returns filtered results from seed data.
 * REAL INTEGRATION: Replace with calls to MLS API, RESO Web API, or brokerage partners.
 * See docs/05-deployment.md for real integration guidance.
 */
export class MockListingsProvider implements ListingsProvider {
  async search(query: UserSearch): Promise<Listing[]> {
    let results = ALL_LISTINGS.filter((listing) => {
      // Filter by budget
      if (listing.price < query.budgetMin || listing.price > query.budgetMax) {
        return false;
      }

      // Filter by beds/baths
      if (listing.beds < query.bedsMin || listing.baths < query.bathsMin) {
        return false;
      }

      // Filter by location (simple zip/city match)
      const locationMatch =
        listing.zip === query.locationQuery ||
        listing.city.toLowerCase().includes(query.locationQuery.toLowerCase());
      if (!locationMatch) {
        return false;
      }

      // Filter by must-haves
      if (
        query.mustHaves.length > 0 &&
        !query.mustHaves.every((must) =>
          listing.features.map((f) => f.toLowerCase()).includes(must.toLowerCase())
        )
      ) {
        return false;
      }

      return true;
    });

    // Sort by price, limit to 20
    return results.sort((a, b) => a.price - b.price).slice(0, 20);
  }

  async getById(id: string): Promise<Listing | null> {
    return ALL_LISTINGS.find((l) => l.id === id) || null;
  }
}

/**
 * MOCK Neighborhood Signals Provider
 *
 * Deterministic generation based on zip code hash to ensure repeatability.
 * REAL INTEGRATION: Integrate GreatSchools API, local crime data, walkability scores.
 */
export class MockNeighborhoodSignalsProvider implements NeighborhoodSignalsProvider {
  async getSignals(zip: string, city: string, state: string) {
    // Deterministic hash from zip code
    const hash = zip.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

    // Map city to base scores for demo purposes
    let baseSchoolRating = 6;
    let baseSafetyIndex = 65;
    let baseWalkability = 60;

    if (city.toLowerCase().includes('winter park')) {
      baseSchoolRating = 9;
      baseSafetyIndex = 82;
      baseWalkability = 75;
    } else if (city.toLowerCase().includes('coral gables')) {
      baseSchoolRating = 8;
      baseSafetyIndex = 78;
      baseWalkability = 70;
    } else if (city.toLowerCase().includes('carrollwood')) {
      baseSchoolRating = 8;
      baseSafetyIndex = 75;
      baseWalkability = 55;
    } else if (city.toLowerCase().includes('land o lakes')) {
      baseSchoolRating = 7;
      baseSafetyIndex = 70;
      baseWalkability = 50;
    } else if (city.toLowerCase().includes('downtown') || city.toLowerCase().includes('miami')) {
      baseSchoolRating = 6;
      baseSafetyIndex = 60;
      baseWalkability = 85;
    }

    const variation = (hash % 20) - 10; // -10 to +10 variation

    return {
      schoolRating: Math.max(1, Math.min(10, baseSchoolRating + variation / 10)),
      safetyIndex: Math.max(1, Math.min(100, baseSafetyIndex + variation)),
      walkability: Math.max(1, Math.min(100, baseWalkability + variation)),
    };
  }
}

/**
 * MOCK Market Signals Provider
 *
 * Deterministic generation based on zip code and market conditions.
 * REAL INTEGRATION: Integrate Redfin Data Center, FHFA data, local MLS statistics.
 */
export class MockMarketSignalsProvider implements MarketSignalsProvider {
  async getSignals(zip: string, city: string, state: string) {
    const hash = zip.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

    // Simulate market variation
    let baseDaysOnMarket = 35;
    let baseYoyChange = 2.5; // 2.5% appreciation
    let inventoryLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';

    // Downtown/hot markets: faster sales
    if (city.toLowerCase().includes('downtown') || city.toLowerCase().includes('miami')) {
      baseDaysOnMarket = 18;
      baseYoyChange = 4.5;
      inventoryLevel = 'LOW';
    }
    // Suburban/family areas: balanced
    else if (
      city.toLowerCase().includes('carrollwood') ||
      city.toLowerCase().includes('land o lakes')
    ) {
      baseDaysOnMarket = 40;
      baseYoyChange = 2;
      inventoryLevel = 'MEDIUM';
    }

    const variation = ((hash * 7) % 30) - 15; // -15 to +15 variation

    return {
      medianDaysOnMarket: Math.max(3, baseDaysOnMarket + Math.floor(variation / 2)),
      yoyPriceChangePct: baseYoyChange + variation / 10,
      inventoryLevel,
    };
  }
}

/**
 * MOCK Commute Time Provider
 *
 * Deterministic estimates based on lat/lng and destination hash.
 * REAL INTEGRATION: Use Google Maps Platform, Mapbox, or local transit APIs.
 */
export class MockCommuteTimeProvider implements CommuteTimeProvider {
  async getEstimatedMinutes(
    fromLat: number,
    fromLng: number,
    toAddress: string
  ): Promise<number> {
    // Simple distance-based heuristic + deterministic variation
    const hash = toAddress.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

    // Reference point: downtown Tampa
    const refLat = 27.97;
    const refLng = -82.46;

    // Simple Euclidean distance (in degrees, roughly ~69 miles per degree)
    const latDiff = Math.abs(fromLat - refLat);
    const lngDiff = Math.abs(fromLng - refLng);
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
    const roughMiles = distance * 69;

    // Assume 30 mph average in traffic
    const baseTime = roughMiles * 2;
    const variation = (hash % 20) - 10;

    return Math.max(5, Math.round(baseTime + variation));
  }
}

/**
 * Factory function to get providers based on environment
 */
export function getListingsProvider(): ListingsProvider {
  return new MockListingsProvider();
}

export function getNeighborhoodSignalsProvider(): NeighborhoodSignalsProvider {
  return new MockNeighborhoodSignalsProvider();
}

export function getMarketSignalsProvider(): MarketSignalsProvider {
  return new MockMarketSignalsProvider();
}

export function getCommuteTimeProvider(): CommuteTimeProvider {
  return new MockCommuteTimeProvider();
}
