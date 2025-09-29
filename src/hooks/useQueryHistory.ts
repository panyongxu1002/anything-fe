import { useState, useEffect } from 'react';

export interface QueryHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  duration?: number;
  success: boolean;
  resultSummary?: string;
  error?: string;
}

interface QueryResult {
  result?: {
    db_results?: Array<{
      type?: string;
      [key: string]: unknown;
    }>;
  };
}

const STORAGE_KEY = 'hubble-query-history';
const MAX_HISTORY_ITEMS = 50;

export function useQueryHistory() {
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedHistory = JSON.parse(stored);
        setHistory(parsedHistory);
      }
    } catch (error) {
      console.error('Failed to load query history:', error);
    }
  }, []);

  // Save history to localStorage
  const saveToStorage = (newHistory: QueryHistoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Failed to save query history:', error);
    }
  };

  // Add new query record
  const addQuery = (query: string, success: boolean, duration?: number, resultSummary?: string, error?: string) => {
    const newItem: QueryHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      query: query.trim(),
      timestamp: Date.now(),
      duration,
      success,
      resultSummary,
      error,
    };

    setHistory(prevHistory => {
      // Avoid duplicate queries (if query content is same and within last 5 minutes)
      const recentDuplicate = prevHistory.find(item => 
        item.query === newItem.query && 
        (Date.now() - item.timestamp) < 5 * 60 * 1000 // 5 minutes
      );

      if (recentDuplicate) {
        return prevHistory;
      }

      // Add new record and limit total count
      const updatedHistory = [newItem, ...prevHistory].slice(0, MAX_HISTORY_ITEMS);
      saveToStorage(updatedHistory);
      return updatedHistory;
    });

    return newItem.id;
  };

  // Delete specific record
  const removeQuery = (id: string) => {
    setHistory(prevHistory => {
      const updatedHistory = prevHistory.filter(item => item.id !== id);
      saveToStorage(updatedHistory);
      return updatedHistory;
    });
  };

  // Clear all history
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Search history
  const searchHistory = (searchTerm: string) => {
    if (!searchTerm.trim()) return history;
    
    const lowercaseSearch = searchTerm.toLowerCase();
    return history.filter(item => 
      item.query.toLowerCase().includes(lowercaseSearch) ||
      item.resultSummary?.toLowerCase().includes(lowercaseSearch)
    );
  };

  // Get recent successful queries
  const getRecentSuccessQueries = (limit = 5) => {
    return history
      .filter(item => item.success)
      .slice(0, limit);
  };

  // Generate result summary
  const generateResultSummary = (result: unknown): string => {
    try {
      const queryResult = result as QueryResult;
      if (queryResult?.result?.db_results) {
        const count = queryResult.result.db_results.length;
        const type = queryResult.result.db_results[0]?.type || 'transaction';
        return `Returned ${count} ${type} records`;
      }
      return 'Query successful';
    } catch {
      return 'Query successful';
    }
  };

  return {
    history,
    addQuery,
    removeQuery,
    clearHistory,
    searchHistory,
    getRecentSuccessQueries,
    generateResultSummary,
  };
} 