import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { UserSearchSchema, scoreListings } from '@mynexthome/core';
import {
  getListingsProvider,
  getNeighborhoodSignalsProvider,
  getMarketSignalsProvider,
  getCommuteTimeProvider,
} from '@mynexthome/integrations';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const items = await prisma.shortlistedHome.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch shortlist' } },
      { status: 500 }
    );
  }
}

const AddToShortlistSchema = z.object({
  listingId: z.string().uuid(),
  search: UserSearchSchema,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { listingId, search } = AddToShortlistSchema.parse(body);

    const listingsProvider = getListingsProvider();
    const neighborhoodProvider = getNeighborhoodSignalsProvider();
    const marketProvider = getMarketSignalsProvider();
    const commuteProvider = getCommuteTimeProvider();

    // Fetch listing
    const listing = await listingsProvider.getById(listingId);
    if (!listing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Listing not found' } },
        { status: 404 }
      );
    }

    // Score the listing
    const [neighborhood, market, commuteMinutes] = await Promise.all([
      neighborhoodProvider.getSignals(listing.zip, listing.city, listing.state),
      marketProvider.getSignals(listing.zip, listing.city, listing.state),
      commuteProvider.getEstimatedMinutes(
        listing.lat,
        listing.lng,
        search.commuteTo || 'downtown'
      ),
    ]);

    const score = scoreListings(listing, search, neighborhood, market, commuteMinutes);

    // Save to database
    const shortlisted = await prisma.shortlistedHome.create({
      data: {
        listingId,
        listingJson: JSON.stringify(listing),
        scoreJson: JSON.stringify(score),
      },
    });

    return NextResponse.json({ shortlist: shortlisted });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: error.errors } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to add to shortlist' } },
      { status: 500 }
    );
  }
}
