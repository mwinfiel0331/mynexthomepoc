'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Shortlist {
  id: string;
  listingJson: {
    id: string;
    addressMasked: string;
    price: number;
    beds: number;
    baths: number;
    sqft: number;
    city: string;
    zip: string;
  };
  scoreJson: {
    overallScore: number;
    reasons: string[];
  };
  createdAt: string;
}

export default function ShortlistPage() {
  const [items, setItems] = useState<Shortlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchShortlist = async () => {
      try {
        const response = await fetch('/api/shortlist');
        if (!response.ok) throw new Error('Failed to fetch shortlist');
        const data = await response.json();
        // Parse JSON strings back to objects
        const parsedItems = data.items.map((item: any) => ({
          ...item,
          listingJson: typeof item.listingJson === 'string' ? JSON.parse(item.listingJson) : item.listingJson,
          scoreJson: typeof item.scoreJson === 'string' ? JSON.parse(item.scoreJson) : item.scoreJson,
        }));
        setItems(parsedItems);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchShortlist();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/shortlist/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete');
      setItems(items.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Shortlist</h2>
        <Link href="/" className="button-primary">
          Back to Search
        </Link>
      </div>

      {error && <div className="p-4 bg-red-100 text-red-800 rounded">{error}</div>}

      {items.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <p>No homes shortlisted yet. Start searching to add homes to your list.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold">{item.listingJson.addressMasked}</h3>
                  <p className="text-sm text-gray-600">
                    {item.listingJson.city}, {item.listingJson.zip}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 mb-4">
                <p className="text-lg font-bold text-blue-600">
                  ${item.listingJson.price.toLocaleString()}
                </p>
                <p className="text-sm text-gray-700">
                  {item.listingJson.beds} bed • {item.listingJson.baths} bath •{' '}
                  {item.listingJson.sqft.toLocaleString()} sqft
                </p>
              </div>

              <div className="bg-blue-50 p-3 rounded mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold">Next Home Score</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {item.scoreJson.overallScore}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${item.scoreJson.overallScore}%` }}
                  ></div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p className="font-semibold mb-2">Why we think this fits:</p>
                <ul className="space-y-1">
                  {item.scoreJson.reasons.map((reason, idx) => (
                    <li key={idx}>• {reason}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 text-xs text-gray-400">
                Added {new Date(item.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
