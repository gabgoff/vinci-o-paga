export interface SportsDataProvider {
  /** Ensures the given season has teams, rounds and fixtures loaded. */
  syncSeasonFixtures(seasonId: string): Promise<void>;
  /** Fetches/updates match results for a given round. */
  syncRoundResults(roundId: string): Promise<void>;
}

export async function getSportsDataProvider(): Promise<SportsDataProvider> {
  if (process.env.API_FOOTBALL_KEY) {
    const { ApiFootballProvider } = await import("./api-football");
    return new ApiFootballProvider(process.env.API_FOOTBALL_KEY);
  }
  const { DemoSeedProvider } = await import("./demo-seed");
  return new DemoSeedProvider();
}
