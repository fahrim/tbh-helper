export const PriceFetchConfig = {
  pageSize: 100,
  maxRetries: 3,
  retryBaseDelayMs: 3000,
  guestModeSpreadDurationMs: 600_000,
  maxPollAttempts: 25,
  pollIntervalMs: 800,
  steam429BackoffMs: 60_000,
  guest429DelayIncrementMs: 2000,
  guestMaxDelayMs: 10000,
  extractPropagateWaitMs: 300,
} as const;
