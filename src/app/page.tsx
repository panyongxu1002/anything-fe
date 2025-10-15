"use client";

import { useState, useEffect, useRef } from "react";
import QueryResultDisplay from "@/components/QueryResultDisplay";
import WalletConnectButton from "@/components/WalletConnectButton";
import { useX402Payment } from "@/hooks/useX402Payment";
import { exampleQueries } from "@/config/exampleQueries";
import { useConnectModal } from '@rainbow-me/rainbowkit';

const DEFAULT_EXAMPLE_COUNT = 6;

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
  const [showAllExamples, setShowAllExamples] = useState(false);
  const [selectedChain, setSelectedChain] = useState("solana");
  
  // Track pending query after wallet connection
  const pendingQueryRef = useRef<string | null>(null);

  // X402 payment hook - uses user's wallet for payment
  const {
    error: paymentError,
    paymentResponse,
    executeQuery,
    isConnected,
  } = useX402Payment();

  // RainbowKit connect modal
  const { openConnectModal } = useConnectModal();

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
            source: "file",
            threshold: 0.7,
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
          
          console.log('🎯 Setting result in page.tsx:', {
            success: newResult.success,
            sqlQuery: newResult.sqlQuery ? 'exists' : 'null',
            dbResultsCount: newResult.dbResults.length,
            hasRaw: !!newResult.raw,
            durationMs: newResult.durationMs
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

  const displayedExamples = showAllExamples
    ? exampleQueries
    : exampleQueries.slice(0, DEFAULT_EXAMPLE_COUNT);
  const remainingExamples = Math.max(
    exampleQueries.length - DEFAULT_EXAMPLE_COUNT,
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Check if wallet is connected - auto open connect modal if not
    if (!isConnected) {
      // Save query for auto-execution after wallet connects
      pendingQueryRef.current = query.trim();
      
      if (openConnectModal) {
        openConnectModal();
      } else {
        setError("Please connect your wallet first to make queries");
      }
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
        source: "file",
        threshold: 0.7,
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
      
      console.log('🎯 Setting result in page.tsx:', {
        success: newResult.success,
        sqlQuery: newResult.sqlQuery ? 'exists' : 'null',
        dbResultsCount: newResult.dbResults.length,
        hasRaw: !!newResult.raw,
        durationMs: newResult.durationMs
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
                  <option value="ethereum" disabled>⚫ Ethereum - Coming Soon</option>
                  <option value="base" disabled>🔵 Base - Coming Soon</option>
                  <option value="bnb" disabled>🟡 BNB Chain - Coming Soon</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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

          {/* Example queries */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              Example queries:
            </h3>
            <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-3">
              {displayedExamples.map((example) => (
                <button
                  key={example}
                  onClick={() => setQuery(example)}
                  className="w-full text-left px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm leading-snug text-gray-700 whitespace-normal break-words transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  disabled={loading}
                >
                  {example}
                </button>
              ))}
            </div>
            {remainingExamples > 0 && (
              <button
                type="button"
                onClick={() => setShowAllExamples((prev) => !prev)}
                className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                {showAllExamples
                  ? "Show fewer queries"
                  : `Show ${remainingExamples} more queries`}
              </button>
            )}
          </div>

          {/* Wallet not connected warning */}
          {!isConnected && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-yellow-800 font-semibold">Wallet Required</h3>
                  <p className="text-yellow-700 text-sm mt-1">
                    Please connect your wallet to query. You&apos;ll be prompted to pay with your wallet when needed.
                  </p>
                </div>
              </div>
            </div>
          )}

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
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-green-800 font-semibold mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Payment Successful
              </h3>
              <div className="text-sm text-green-700 space-y-2">
                <p>Your payment has been processed successfully.</p>
                {paymentResponse.transaction && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-green-600">Transaction Hash:</span>
                    <a
                      href={`https://basescan.org/tx/${paymentResponse.transaction}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs break-all text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 group"
                    >
                      {paymentResponse.transaction}
                      <svg 
                        className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Result Display */}
          {(() => {
            if (result && !loading) {
              console.log('🎨 Rendering QueryResultDisplay with result:', {
                success: result.success,
                sqlQuery: result.sqlQuery ? 'exists' : 'null',
                dbResultsCount: result.dbResults?.length || 0,
                hasRaw: !!result.raw
              });
              return <QueryResultDisplay result={result} />;
            } else {
              console.log('❌ NOT rendering QueryResultDisplay:', { hasResult: !!result, loading });
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
            <img
              src="/x402-badge.png"
              alt="x402 Payments enabled"
              className="h-10"
            />
          </a>
        </div>
      </div>
    </div>
  );
}
