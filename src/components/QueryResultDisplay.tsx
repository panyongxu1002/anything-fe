import React, { useMemo, useState } from "react";

interface QueryResultDisplayProps {
  result: QueryResult | null;
}

interface QueryResult {
  success: boolean;
  sqlQuery?: string | null;
  dbResults?: Record<string, unknown>[];
  raw?: unknown;
  error?: string;
  durationMs?: number;
}

interface FieldConfig {
  key: string;
  label: string;
  type:
    | "text"
    | "number"
    | "timestamp"
    | "address"
    | "sol"
    | "usd"
    | "percentage"
    | "boolean"
    | "json";
  align?: "left" | "center" | "right";
}

const EMPTY_RESULTS: Record<string, unknown>[] = [];

const formatDuration = (durationMs?: number): string | null => {
  if (
    typeof durationMs !== "number" ||
    Number.isNaN(durationMs) ||
    durationMs < 0
  ) {
    return null;
  }
  if (durationMs < 1000) {
    return `${Math.round(durationMs)}ms`;
  }
  return `${(durationMs / 1000).toFixed(2)}s`;
};

export default function QueryResultDisplay({
  result,
}: QueryResultDisplayProps) {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const dbResults = Array.isArray(result?.dbResults)
    ? (result?.dbResults as Record<string, unknown>[])
    : EMPTY_RESULTS;
  const fieldConfigs = useMemo((): FieldConfig[] => {
    if (dbResults.length === 0) {
      return [];
    }

    const allFields = new Set<string>();
    dbResults.forEach((item) => {
      Object.keys(item || {}).forEach((key) => allFields.add(key));
    });

    const inferType = (
      key: string,
      sampleValues: unknown[]
    ): FieldConfig["type"] => {
      const keyLower = key.toLowerCase();

      if (keyLower.includes("timestamp") || keyLower.includes("time"))
        return "timestamp";
      if (
        keyLower.includes("address") ||
        keyLower.includes("signature") ||
        keyLower.includes("slot")
      )
        return "address";
      if (
        keyLower.includes("sol") &&
        (keyLower.includes("amount") ||
          keyLower.includes("spent") ||
          keyLower.includes("received") ||
          keyLower.includes("change") ||
          keyLower.includes("profit") ||
          keyLower.includes("balance"))
      )
        return "sol";
      if (
        (keyLower.includes("price") && keyLower.includes("usd")) ||
        keyLower.includes("avg_bought_price") ||
        keyLower.includes("avg_sold_price")
      )
        return "usd";
      if (
        keyLower.includes("ratio") ||
        keyLower.includes("rate") ||
        keyLower.includes("percentage") ||
        keyLower.includes("progress") ||
        keyLower.includes("completion")
      )
        return "percentage";
      if (keyLower.startsWith("is_") || keyLower.startsWith("has_"))
        return "boolean";
      if (
        keyLower.includes("flows") ||
        keyLower.includes("changes") ||
        keyLower.includes("receivers") ||
        keyLower.includes("signers")
      )
        return "json";

      const nonNullValues = sampleValues.filter((v) => v != null);
      if (nonNullValues.length > 0) {
        const firstValue = nonNullValues[0];
        if (typeof firstValue === "boolean") return "boolean";
        if (typeof firstValue === "number") return "number";
        if (Array.isArray(firstValue) || typeof firstValue === "object")
          return "json";
      }

      return "text";
    };

    const alignForType = (type: FieldConfig["type"]): FieldConfig["align"] => {
      if (
        type === "number" ||
        type === "sol" ||
        type === "usd" ||
        type === "percentage"
      )
        return "right";
      if (type === "boolean") return "center";
      return "left";
    };

    return Array.from(allFields).map((key) => {
      const sampleValues = dbResults.slice(0, 5).map((item) => item?.[key]);
      const type = inferType(key, sampleValues);

      return {
        key,
        label: key,
        type,
        align: alignForType(type),
      };
    });
  }, [dbResults]);

  const hasResults = dbResults.length > 0;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(text);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopiedAddress(text);
        setTimeout(() => setCopiedAddress(null), 2000);
      } catch (fallbackErr) {
        console.error("Copy failed (fallback method):", fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  if (!result) return null;

  const queryResult = result;
  const formattedDuration = formatDuration(queryResult.durationMs);

  const formatValue = (value: unknown, type: FieldConfig["type"]): string => {
    if (value == null) return "-";

    switch (type) {
      case "timestamp": {
        if (typeof value === "string" || typeof value === "number") {
          const timestamp =
            typeof value === "string" ? Number.parseFloat(value) : value;
          if (!Number.isFinite(timestamp)) return String(value);
          const date = new Date(
            timestamp > 1e10 ? timestamp : timestamp * 1000
          );
          return date.toLocaleString("zh-CN");
        }
        return String(value);
      }
      case "address": {
        const strValue = String(value);
        if (strValue.length > 10) {
          return `${strValue.slice(0, 6)}...${strValue.slice(-4)}`;
        }
        return strValue;
      }
      case "sol": {
        const solNum = Number(value);
        if (Number.isNaN(solNum)) return String(value);
        return `${solNum.toFixed(6)} SOL`;
      }
      case "usd": {
        const usdNum = Number(value);
        if (Number.isNaN(usdNum)) return String(value);
        return `$${usdNum.toFixed(2)}`;
      }
      case "percentage": {
        const pctNum = Number(value);
        if (Number.isNaN(pctNum)) return String(value);
        return pctNum > 1
          ? `${pctNum.toFixed(2)}%`
          : `${(pctNum * 100).toFixed(2)}%`;
      }
      case "number": {
        const num = Number(value);
        if (Number.isNaN(num)) return String(value);
        return num.toLocaleString();
      }
      case "boolean": {
        if (typeof value === "boolean") return value ? "Yes" : "No";
        if (typeof value === "number") return value > 0 ? "Yes" : "No";
        if (typeof value === "string") {
          const lowered = value.toLowerCase();
          if (lowered === "true" || lowered === "1") return "Yes";
          if (lowered === "false" || lowered === "0") return "No";
        }
        return String(value);
      }
      case "json": {
        if (typeof value === "object") {
          try {
            return JSON.stringify(value, null, 2);
          } catch (err) {
            console.error("Failed to stringify JSON value:", err);
            return String(value);
          }
        }
        return String(value);
      }
      default:
        return String(value);
    }
  };

  const getValueClassName = (value: unknown, field: FieldConfig): string => {
    let classes = "px-4 py-4 whitespace-nowrap text-sm";

    if (field.type === "address" || field.type === "json") {
      classes += " font-mono";
    }

    if (field.align === "right") {
      classes += " text-right";
    } else if (field.align === "center") {
      classes += " text-center";
    }

    if (
      field.type === "percentage" ||
      field.type === "number" ||
      field.type === "sol" ||
      field.type === "usd"
    ) {
      classes += " text-right";
      if (field.type === "number") {
        const numericValue = typeof value === "number" ? value : Number(value);
        if (Number.isFinite(numericValue)) {
          classes +=
            numericValue > 0
              ? " text-green-600"
              : numericValue < 0
              ? " text-red-600"
              : "";
        }
      }
      if (field.type === "sol") {
        const solValue = typeof value === "number" ? value : Number(value);
        if (Number.isFinite(solValue)) {
          classes +=
            solValue > 0
              ? " text-green-600"
              : solValue < 0
              ? " text-red-600"
              : "";
        }
      }
      if (field.type === "usd") {
        classes += " text-blue-600";
      }
    }

    return classes;
  };

  const renderAddressWithTooltip = (value: unknown) => {
    const fullAddress = String(value);
    const displayAddress = formatValue(value, "address");
    const isCurrentlyCopied = copiedAddress === fullAddress;

    return (
      <div className="relative group">
        <span
          className="cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => copyToClipboard(fullAddress)}
        >
          {displayAddress}
        </span>
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <span>{fullAddress}</span>
            {isCurrentlyCopied ? (
              <svg
                className="w-3 h-3 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            )}
          </div>
          <div className="text-center mt-1 text-gray-300">
            {isCurrentlyCopied ? "Copied!" : "Click to copy"}
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    );
  };

  const renderTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {fieldConfigs.map((field) => (
              <th
                key={field.key}
                className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b ${
                  field.align === "right"
                    ? "text-right"
                    : field.align === "center"
                    ? "text-center"
                    : "text-left"
                }`}
              >
                {field.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {dbResults.map((row, index) => (
            <tr key={index} className="hover:bg-gray-50">
              {fieldConfigs.map((field) => {
                const value = row?.[field.key];

                return (
                  <td
                    key={field.key}
                    className={getValueClassName(value, field)}
                  >
                    {field.type === "json" && value ? (
                      <details className="cursor-pointer">
                        <summary className="text-blue-600 hover:text-blue-800">
                          View
                        </summary>
                        <pre className="mt-2 text-xs bg-gray-100 p-2 rounded max-w-xs overflow-auto">
                          {formatValue(value, field.type)}
                        </pre>
                      </details>
                    ) : field.type === "address" ? (
                      renderAddressWithTooltip(value)
                    ) : field.key === "type" ? (
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          String(value).includes("BUY") ||
                          String(value).includes("买入")
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {formatValue(value, field.type)}
                      </span>
                    ) : (
                      formatValue(value, field.type)
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-t-lg border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                queryResult.success ? "bg-green-500" : "bg-red-500"
              }`}
            ></div>
            <span className="text-green-800 font-semibold">
              {queryResult.success ? "Query Successful" : "Query Failed"}
            </span>
          </div>
          {formattedDuration && (
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>
                Duration:{" "}
                <span className="font-mono text-gray-800">
                  {formattedDuration}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>

      {queryResult.sqlQuery && (
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            SQL Query
          </h3>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
            {queryResult.sqlQuery}
          </div>
        </div>
      )}

      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M3 14h18m-9-4v8m-7 0V4a1 1 0 011-1h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1z"
            />
          </svg>
          Query Results
          {hasResults ? (
            <span className="ml-2 text-sm text-gray-600">
              ({dbResults.length} records, {fieldConfigs.length} fields)
            </span>
          ) : (
            <span className="ml-2 text-sm text-gray-500">
              No records returned
            </span>
          )}
        </h3>

        {hasResults ? (
          renderTable()
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Query completed successfully, but no matching records were found for
            the current filters.
          </div>
        )}
      </div>

      {queryResult.raw != null && (
        <details className="border-t">
          <summary className="p-4 cursor-pointer text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50">
            View Raw Response
          </summary>
          <div className="p-4 bg-gray-50">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-96 bg-white p-3 rounded border">
              {JSON.stringify(queryResult.raw, null, 2)}
            </pre>
          </div>
        </details>
      )}
    </div>
  );
}
