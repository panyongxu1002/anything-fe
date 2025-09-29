"use client";

import { useState } from "react";
import QueryResultDisplay from "@/components/QueryResultDisplay";
import { exampleQueries } from "@/config/exampleQueries";

interface QueryResponse {
  success: boolean;
  sqlQuery?: string | null;
  dbResults?: Record<string, unknown>[];
  error?: string;
  raw?: unknown;
  durationMs?: number;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const requestStart = performance.now();
      const response = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: query.trim(),
          source: "file",
          threshold: 0.7,
        }),
      });

      const text = await response.text();
      let payload: QueryResponse | null = null;

      if (text) {
        try {
          payload = JSON.parse(text) as QueryResponse;
        } catch (parseError) {
          console.error("Failed to parse API response:", parseError, text);
        }
      }

      if (!response.ok) {
        const message =
          payload?.error || `Request failed with status ${response.status}`;
        setError(message);
        return;
      }

      if (!payload || !payload.success) {
        setError(payload?.error || "Query failed");
        return;
      }

      const durationMs = performance.now() - requestStart;
      setResult({
        success: true,
        sqlQuery: payload.sqlQuery ?? null,
        dbResults: payload.dbResults ?? [],
        raw: payload.raw ?? payload,
        durationMs,
      });
    } catch (err) {
      console.error("Query error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
            Hubble AI Assistant
          </h1>

          <form onSubmit={handleSubmit} className="mb-8">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter your question"
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-700"
                  disabled={loading}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    disabled={loading}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium cursor-pointer"
              >
                {loading ? "Processing..." : "Query"}
              </button>
            </div>
          </form>

          {/* Example queries */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              Example queries:
            </h3>
            <div className="flex flex-wrap gap-2">
              {exampleQueries.map((example) => (
                <button
                  key={example}
                  onClick={() => setQuery(example)}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-600 transition-colors disabled:opacity-50 cursor-pointer"
                  disabled={loading}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-red-800 font-semibold mb-2">Error:</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="text-blue-700">Processing your query...</p>
              </div>
            </div>
          )}

          {/* Result Display */}
          {result && !loading ? <QueryResultDisplay result={result} /> : null}
        </div>
      </div>
    </div>
  );
}
