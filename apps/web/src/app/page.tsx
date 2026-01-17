'use client';

import { useState } from 'react';
import Link from 'next/link';

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

export default function Home() {
  const [locationQuery, setLocationQuery] = useState('');
  const [budgetMin, setBudgetMin] = useState(300000);
  const [budgetMax, setBudgetMax] = useState(500000);
  const [bedsMin, setBedsMin] = useState(3);
  const [bathsMin, setBathsMin] = useState(2);
  const [mustHaves, setMustHaves] = useState<string[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationQuery,
          budgetMin,
          budgetMax,
          bedsMin,
          bathsMin,
          mustHaves,
          commuteTo: null,
          commuteMaxMinutes: null,
          riskTolerance: 'MEDIUM',
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Search failed');
      }

      const data = await response.json();
      setListings(data.listings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const handleMustHaveToggle = (feature: string) => {
    if (mustHaves.includes(feature)) {
      setMustHaves(mustHaves.filter((f) => f !== feature));
    } else {
      setMustHaves([...mustHaves, feature]);
    }
  };

  const canCompare = selected.size >= 2 && selected.size <= 4;

  return (
    <div className="space-y-8">
      {/* Search Form */}
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold mb-6">Find Your Next Home</h2>

        <form onSubmit={handleSearch} className="space-y-6">
          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-2">Location (City, ZIP, or State)</label>
            <input
              type="text"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              placeholder="e.g., 34639, Tampa, FL"
              className="input-field"
            />
          </div>

          {/* Budget */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Min Budget</label>
              <input
                type="number"
                value={budgetMin}
                onChange={(e) => setBudgetMin(Number(e.target.value))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Max Budget</label>
              <input
                type="number"
                value={budgetMax}
                onChange={(e) => setBudgetMax(Number(e.target.value))}
                className="input-field"
              />
            </div>
          </div>

          {/* Beds/Baths */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Min Bedrooms</label>
              <input
                type="number"
                value={bedsMin}
                onChange={(e) => setBedsMin(Number(e.target.value))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Min Bathrooms</label>
              <input
                type="number"
                value={bathsMin}
                onChange={(e) => setBathsMin(Number(e.target.value))}
                className="input-field"
              />
            </div>
          </div>

          {/* Must-Haves */}
          <div>
            <label className="block text-sm font-medium mb-3">Must-Have Features</label>
            <div className="flex gap-4 flex-wrap">
              {['garage', 'pool', 'fenced yard', 'HOA'].map((feature) => (
                <label key={feature} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mustHaves.includes(feature)}
                    onChange={() => handleMustHaveToggle(feature)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{feature}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="button-primary w-full disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search Homes'}
          </button>
        </form>

        {error && <div className="mt-4 p-4 bg-red-100 text-red-800 rounded">{error}</div>}
      </div>

      {/* Results */}
      {listings.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">
              Found {listings.length} homes ({selected.size} selected)
            </h3>
            {canCompare && (
              <Link
                href={`/compare?listings=${Array.from(selected).join(',')}&location=${encodeURIComponent(locationQuery)}&budgetMin=${budgetMin}&budgetMax=${budgetMax}&bedsMin=${bedsMin}&bathsMin=${bathsMin}`}
                className="button-primary"
              >
                Compare {selected.size} Homes
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className={`bg-white rounded-lg shadow p-4 cursor-pointer transition ${
                  selected.has(listing.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => toggleSelect(listing.id)}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selected.has(listing.id)}
                    onChange={() => toggleSelect(listing.id)}
                    className="w-4 h-4 mt-1"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{listing.addressMasked}</h4>
                    <p className="text-sm text-gray-600">
                      {listing.city}, {listing.zip}
                    </p>

                    <div className="mt-3 space-y-1">
                      <p className="text-lg font-bold text-blue-600">
                        ${listing.price.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-700">
                        {listing.beds} bed • {listing.baths} bath • {listing.sqft.toLocaleString()}{' '}
                        sqft
                      </p>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Shortlist action handled in next iteration
                        }}
                        className="button-secondary text-xs"
                      >
                        Shortlist
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {listings.length === 0 && !loading && !error && (
        <div className="text-center text-gray-500 py-12">
          <p>Enter search criteria and click "Search Homes" to get started</p>
        </div>
      )}
    </div>
  );
}
