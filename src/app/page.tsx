"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import QueryResultDisplay from "@/components/QueryResultDisplay";
import WalletConnectButton from "@/components/WalletConnectButton";
import PaymentSuccessDisplay from "@/components/PaymentSuccessDisplay";
import { useX402PaymentAdapter } from "@/hooks/useX402PaymentAdapter";
import { exampleQueryCategories } from "@/config/exampleQueries";

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
  const [showExamples, setShowExamples] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [selectedChain, setSelectedChain] = useState("solana");

  // Track pending query after wallet connection
  const pendingQueryRef = useRef<string | null>(null);

  // X402 payment hook - auto-selects Solana or EVM based on ACTIVE_CHAIN
  const {
    error: paymentError,
    paymentResponse,
    executeQuery,
    isConnected,
    chain,
  } = useX402PaymentAdapter();

  // Auto-execute pending query after wallet connects
  useEffect(() => {
    if (isConnected && pendingQueryRef.current) {
      const pendingQuery = pendingQueryRef.current;
      pendingQueryRef.current = null; // Clear pending query

      // Execute the query automatically
      setLoading(true);
      setError(null);
      setResult(null);

      const performQuery = async () => {
        try {
          const requestStart = performance.now();

          const response = await executeQuery({
            question: pendingQuery,
          });

          if (!response) {
            if (paymentError) {
              setError(paymentError);
            }
            return;
          }

          const durationMs = performance.now() - requestStart;

          const newResult = {
            success: response.success,
            sqlQuery: response.sqlQuery ?? null,
            dbResults: response.dbResults ?? [],
            raw: response.raw ?? response,
            durationMs,
          };

          console.log("🎯 Setting result in page.tsx:", {
            success: newResult.success,
            sqlQuery: newResult.sqlQuery ? "exists" : "null",
            dbResultsCount: newResult.dbResults.length,
            hasRaw: !!newResult.raw,
            durationMs: newResult.durationMs,
          });

          setResult(newResult);
        } catch (err) {
          console.error("Query error:", err);
          setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
          setLoading(false);
        }
      };

      performQuery();
    }
  }, [isConnected, executeQuery, paymentError]);

  const toggleCategory = (index: number) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Ensure支付处理器已准备就绪
    if (!isConnected) {
      pendingQueryRef.current = query.trim();
      setError("Solana 支付处理器正在初始化，请稍候再试");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const requestStart = performance.now();

      // x402-fetch will automatically handle payment if 402 is returned
      // User will see wallet signature popup automatically
      const response = await executeQuery({
        question: query.trim(),
      });

      if (!response) {
        // Check if there's a payment error
        if (paymentError) {
          setError(paymentError);
        }
        return;
      }

      const durationMs = performance.now() - requestStart;

      // Map X402 response to our QueryResponse format
      const newResult = {
        success: response.success,
        sqlQuery: response.sqlQuery ?? null,
        dbResults: response.dbResults ?? [],
        raw: response.raw ?? response,
        durationMs,
      };

      console.log("🎯 Setting result in page.tsx:", {
        success: newResult.success,
        sqlQuery: newResult.sqlQuery ? "exists" : "null",
        dbResultsCount: newResult.dbResults.length,
        hasRaw: !!newResult.raw,
        durationMs: newResult.durationMs,
      });

      setResult(newResult);
    } catch (err) {
      console.error("Query error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-6 sm:p-8 overflow-x-hidden">
      <div className="max-w-4xl w-full mx-auto">
        <div className="w-full bg-white rounded-none shadow-lg p-6 sm:rounded-xl sm:shadow-xl sm:p-8">
          <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:justify-between sm:items-center sm:mb-8">
            <div className="flex flex-col items-center sm:items-start gap-3">
              <h1 className="text-2xl font-bold text-gray-800 text-center sm:text-left sm:text-3xl">
                Hubble AI Assistant
              </h1>
              <div className="relative">
                <select
                  value={selectedChain}
                  onChange={(e) => setSelectedChain(e.target.value)}
                  className="appearance-none flex items-center gap-2 px-4 py-2 pr-10 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full text-xs font-semibold text-purple-700 border-0 cursor-pointer hover:from-purple-200 hover:to-blue-200 transition-all focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="solana">🟣 Solana</option>
                  <option value="ethereum" disabled>
                    ⚫ Ethereum - Coming Soon
                  </option>
                  <option value="base" disabled>
                    🔵 Base - Coming Soon
                  </option>
                  <option value="bnb" disabled>
                    🟡 BNB Chain - Coming Soon
                  </option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg
                    className="w-4 h-4 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-end">
              <WalletConnectButton />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mb-8">
            <div className="flex flex-col gap-4 sm:flex-row">
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
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium cursor-pointer sm:w-auto"
              >
                {loading ? "Processing..." : "Query"}
              </button>
            </div>
          </form>

          {/* Example queries by category */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-700">
                Example Query Categories
              </h3>
              <button
                onClick={() => setShowExamples(!showExamples)}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                type="button"
              >
                {showExamples ? (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                    Hide Examples
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                    Show Examples
                  </>
                )}
              </button>
            </div>

            {showExamples && (
              <div className="space-y-2">
                {exampleQueryCategories.map((category, categoryIndex) => {
                  const isExpanded = expandedCategories.has(categoryIndex);
                  return (
                    <div
                      key={categoryIndex}
                      className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm"
                    >
                      {/* Category Header */}
                      <button
                        onClick={() => toggleCategory(categoryIndex)}
                        className="w-full px-3 py-2 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors cursor-pointer"
                        disabled={loading}
                      >
                        <div className="text-left flex-1">
                          <h4 className="font-semibold text-gray-800 text-sm">
                            {category.title}
                          </h4>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {category.description}
                          </p>
                        </div>
                        <div className="ml-3 flex-shrink-0">
                          <svg
                            className={`w-4 h-4 text-gray-600 transition-transform ${
                              isExpanded ? "transform rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </button>

                      {/* Category Queries */}
                      {isExpanded && (
                        <div className="p-2 bg-gray-50 border-t border-gray-200">
                          <div className="grid grid-cols-1 gap-1.5">
                            {category.queries.map((example, queryIndex) => (
                              <button
                                key={queryIndex}
                                onClick={() => setQuery(example)}
                                className="w-full text-left px-3 py-3 bg-white hover:bg-blue-50 rounded text-sm leading-normal text-gray-700 whitespace-normal break-words transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border border-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                                disabled={loading}
                              >
                                <span className="text-gray-500 mr-2">
                                  {queryIndex + 1}.
                                </span>
                                {example}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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

          {/* Payment Success Message */}
          {paymentResponse && paymentResponse.success && (
            <PaymentSuccessDisplay chain={chain} paymentResponse={paymentResponse} />
          )}

          {/* Result Display */}
          {(() => {
            if (result && !loading) {
              console.log("🎨 Rendering QueryResultDisplay with result:", {
                success: result.success,
                sqlQuery: result.sqlQuery ? "exists" : "null",
                dbResultsCount: result.dbResults?.length || 0,
                hasRaw: !!result.raw,
              });
              return <QueryResultDisplay result={result} />;
            } else {
              console.log("❌ NOT rendering QueryResultDisplay:", {
                hasResult: !!result,
                loading,
              });
              return null;
            }
          })()}
        </div>

        {/* x402 Badge & Pricing - Footer */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <a
            href="https://www.x402.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block transition-opacity hover:opacity-80 cursor-pointer"
            title="Powered by x402 Protocol"
          >
            <Image
              src="/x402-badge.png"
              alt="x402 Payments enabled"
              width={100}
              height={20}
              className="h-5 w-auto"
            />
          </a>
        </div>
      </div>
    </div>
  );
}
