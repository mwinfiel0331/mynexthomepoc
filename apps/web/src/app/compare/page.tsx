'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface Score {
  listingId: string;
  affordabilityScore: number;
  commuteScore: number;
  neighborhoodScore: number;
  propertyQualityScore: number;
  marketMomentumScore: number;
  overallScore: number;
  reasons: string[];
}

interface Listing {
  id: string;
  addressMasked: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  city: string;
  zip: string;
}

export default function Compare() {
  const searchParams = useSearchParams();
  const listingIds = searchParams.get('listings')?.split(',') || [];
  
  // Extract search parameters from URL
  const locationQuery = searchParams.get('location') || '';
  const budgetMin = parseInt(searchParams.get('budgetMin') || '300000');
  const budgetMax = parseInt(searchParams.get('budgetMax') || '600000');
  const bedsMin = parseInt(searchParams.get('bedsMin') || '2');
  const bathsMin = parseInt(searchParams.get('bathsMin') || '2');

  const [scores, setScores] = useState<Score[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchScores = async () => {
      if (listingIds.length === 0) {
        setError('No listings selected');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listingIds,
            search: {
              locationQuery,
              budgetMin,
              budgetMax,
              bedsMin,
              bathsMin,
              mustHaves: [],
              commuteTo: null,
              commuteMaxMinutes: null,
              riskTolerance: 'MEDIUM',
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch scores');
        }

        const data = await response.json();
        setScores(data.scores);
        setListings(data.listings);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
  }, [listingIds]);

  if (loading) return <div className="text-center py-12">Loading scores...</div>;

  if (error) return <div className="text-center text-red-600 py-12">{error}</div>;

  if (scores.length === 0) {
    return <div className="text-center py-12">No scores available</div>;
  }

  // Sort by overall score
  const sorted = [...scores].sort((a, b) => b.overallScore - a.overallScore);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Compare Homes</h2>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full bg-white rounded-lg shadow overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left">Home</th>
              <th className="px-4 py-3 text-center">Overall Score</th>
              <th className="px-4 py-3 text-center">Affordability</th>
              <th className="px-4 py-3 text-center">Neighborhood</th>
              <th className="px-4 py-3 text-center">Property Quality</th>
              <th className="px-4 py-3 text-center">Market Momentum</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((score) => {
              const listing = listings.find((l) => l.id === score.listingId);
              return (
                <tr key={score.listingId} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {listing ? (
                      <div>
                        <p className="font-semibold">{listing.addressMasked}</p>
                        <p className="text-sm text-gray-600">
                          ${listing.price.toLocaleString()}
                        </p>
                      </div>
                    ) : (
                      'Unknown'
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-2xl font-bold text-blue-600">
                      {score.overallScore}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded">
                      {Math.round(score.affordabilityScore)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {Math.round(score.neighborhoodScore)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      {Math.round(score.propertyQualityScore)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded">
                      {Math.round(score.marketMomentumScore)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detailed Scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sorted.map((score) => {
          const listing = listings.find((l) => l.id === score.listingId);
          return (
            <div key={score.listingId} className="bg-white rounded-lg shadow p-6">
              <div className="mb-4">
                <h3 className="text-lg font-bold mb-1">{listing?.addressMasked}</h3>
                <p className="text-sm text-gray-600">${listing?.price.toLocaleString()}</p>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold">Overall Score</span>
                  <span className="text-2xl font-bold text-blue-600">{score.overallScore}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full"
                    style={{ width: `${score.overallScore}%` }}
                  ></div>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="space-y-3 mb-4">
                {[
                  { name: 'Affordability', value: score.affordabilityScore },
                  { name: 'Commute', value: score.commuteScore },
                  { name: 'Neighborhood', value: score.neighborhoodScore },
                  { name: 'Property Quality', value: score.propertyQualityScore },
                  { name: 'Market Momentum', value: score.marketMomentumScore },
                ].map((item) => (
                  <div key={item.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{item.name}</span>
                      <span className="font-semibold">{Math.round(item.value)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${item.value}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Top Reasons */}
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm font-semibold text-blue-900 mb-2">Why this score?</p>
                <ul className="text-sm text-blue-800 space-y-1">
                  {score.reasons.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
