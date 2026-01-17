import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserSearchSchema } from '@mynexthome/core';
import { getListingsProvider } from '@mynexthome/integrations';

const SearchRequestSchema = UserSearchSchema;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = SearchRequestSchema.parse(body);

    const provider = getListingsProvider();
    const listings = await provider.search(query);

    return NextResponse.json({ listings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: error.errors } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to search listings' } },
      { status: 500 }
    );
  }
}
