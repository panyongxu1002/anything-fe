export interface QueryCategory {
  title: string;
  description: string;
  queries: string[];
}

export const exampleQueryCategories: QueryCategory[] = [
  {
    title: "Trader & Wallet Analysis",
    description: "Analyze specific wallet addresses or trader groups' behavior, holdings, and rankings",
    queries: [
      "Find traders buying the same token >5 times in last 24 hours, ranked by purchase count per token",
      "Find the top 50 net-buying wallets per token in last 24h, ranked by net purchase amount",
      "Find the top 10 trader wallet addresses with the highest total transaction fees",
      "Query the top 50 wallets with the most transactions in the past 24 hours",
      "Find the top 50 wallets by net increase in the last 7 days for token 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn'",
      "Find the top 50 wallets with the most sales in the past 24 hours",
      "Find the top 50 active wallets in the past 24 hours",
      "Find the top 10 addresses holding more than 100k tokens of 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn'",
      "Query wallets with more than 5 actions (buy/sell) in the past hour",
      "Find addresses with holdings greater than 100k for the token 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn'",
      "Find the top 10 buyers of the token 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn' in the past 5 minutes ranked by total SOL purchased",
    ],
  },
  {
    title: "Token Performance & Metrics",
    description: "Query token aggregate performance data including volume, user count, and transaction metrics",
    queries: [
      "Query the number of trading users and total trading volume of popular tokens in the past 24 hours (sol)",
      "Query the transaction count and trading volume (USD) of the top 50 tokens in the past 24 hours",
      "Find top 5 tokens by total volume over the past 1 days",
      "Query the 20 tokens with the largest transaction volume in the past hour",
      "Find tokens whose total USD volume exceeds 200,000 in the past 4 hours",
      "Query the token with the largest purchase amount in the past 3 days",
    ],
  },
  {
    title: "Market & Transaction Activity",
    description: "Identify real-time market dynamics and specific transaction records meeting certain criteria",
    queries: [
      "Find tokens that had a buy amount greater than 5 SOL in the past 5 minutes",
      "Query the records of purchase amount > 5 SOL in the past hour",
      "Query the largest single transaction amount and corresponding tokens in the past 24 hours (top 50 tokens)",
    ],
  },
];

// Legacy flat list for backwards compatibility
export const exampleQueries = exampleQueryCategories.flatMap(
  (category) => category.queries
);
