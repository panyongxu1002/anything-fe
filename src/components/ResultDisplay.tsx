import React from 'react';

interface ResultDisplayProps {
  result: unknown;
}

export default function ResultDisplay({ result }: ResultDisplayProps) {
  if (!result) return null;

  const renderValue = (value: unknown, depth = 0): React.ReactNode => {
    if (value === null) return <span className="text-gray-500">null</span>;
    if (value === undefined) return <span className="text-gray-500">undefined</span>;
    
    if (typeof value === 'string') {
      return <span className="text-green-600">&quot;{value}&quot;</span>;
    }
    
    if (typeof value === 'number') {
      return <span className="text-blue-600">{value}</span>;
    }
    
    if (typeof value === 'boolean') {
      return <span className="text-purple-600">{value.toString()}</span>;
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-gray-500">[]</span>;
      }
      
      return (
        <div className={`${depth > 0 ? 'ml-4' : ''}`}>
          <span className="text-gray-700">[</span>
          <div className="ml-4">
            {value.map((item, index) => (
              <div key={index} className="flex items-start">
                <span className="text-gray-500 mr-2">{index}:</span>
                {renderValue(item, depth + 1)}
                {index < value.length - 1 && <span className="text-gray-700">,</span>}
              </div>
            ))}
          </div>
          <span className="text-gray-700">]</span>
        </div>
      );
    }
    
    if (typeof value === 'object') {
      const entries = Object.entries(value);
      if (entries.length === 0) {
        return <span className="text-gray-500">{'{}'}</span>;
      }
      
      return (
        <div className={`${depth > 0 ? 'ml-4' : ''}`}>
          <span className="text-gray-700">{'{'}</span>
          <div className="ml-4">
            {entries.map(([key, val], index) => (
              <div key={key} className="flex items-start mb-1">
                <span className="text-orange-600 mr-2">&quot;{key}&quot;:</span>
                {renderValue(val, depth + 1)}
                {index < entries.length - 1 && <span className="text-gray-700">,</span>}
              </div>
            ))}
          </div>
          <span className="text-gray-700">{'}'}</span>
        </div>
      );
    }
    
    return <span className="text-gray-600">{String(value)}</span>;
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Query Results:</h3>
      <div className="bg-white rounded-lg p-4 border overflow-auto max-h-96">
        <div className="font-mono text-sm">
          {renderValue(result)}
        </div>
      </div>
      
      {/* Raw JSON view */}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
          View Raw JSON
        </summary>
        <div className="mt-2 bg-gray-100 rounded p-3 overflow-auto max-h-60">
          <pre className="text-xs text-gray-700 whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
} 