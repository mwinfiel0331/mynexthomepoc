import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserSearchSchema, scoreListings } from '@mynexthome/core';
import {
  getListingsProvider,
  getNeighborhoodSignalsProvider,
  getMarketSignalsProvider,
  getCommuteTimeProvider,
} from '@mynexthome/integrations';

const ScoreRequestSchema = z.object({
  listingIds: z.array(z.string().uuid()),
  search: UserSearchSchema,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { listingIds, search } = ScoreRequestSchema.parse(body);

    const listingsProvider = getListingsProvider();
    const neighborhoodProvider = getNeighborhoodSignalsProvider();
    const marketProvider = getMarketSignalsProvider();
    const commuteProvider = getCommuteTimeProvider();

    // Fetch all listings
    const allListings = await Promise.all(
      listingIds.map((id) => listingsProvider.getById(id))
    );
    const listings = allListings.filter((l) => l !== null);

    // Score each listing
    const scores = await Promise.all(
      listings.map(async (listing) => {
        if (!listing) return null;

        const [neighborhood, market, commuteMinutes] = await Promise.all([
          neighborhoodProvider.getSignals(listing.zip, listing.city, listing.state),
          marketProvider.getSignals(listing.zip, listing.city, listing.state),
          commuteProvider.getEstimatedMinutes(
            listing.lat,
            listing.lng,
            search.commuteTo || 'downtown'
          ),
        ]);

        return scoreListings(listing, search, neighborhood, market, commuteMinutes);
      })
    );

    return NextResponse.json({
      listings,
      scores: scores.filter((s) => s !== null),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: error.errors } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to score listings' } },
      { status: 500 }
    );
  }
}
