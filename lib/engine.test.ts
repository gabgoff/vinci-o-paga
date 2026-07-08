import { describe, expect, it } from "vitest";
import { computePickResult, determineRoundOutcome, splitPrize } from "@/lib/engine";

describe("computePickResult", () => {
  const base = {
    homeTeamId: "home",
    awayTeamId: "away",
    isDraw: false,
    winnerTeamId: "home" as string | null,
    status: "FINISHED" as const,
  };

  it("returns WIN when the picked team won", () => {
    expect(computePickResult("home", base)).toBe("WIN");
  });

  it("returns OUT when the picked team lost", () => {
    expect(computePickResult("away", base)).toBe("OUT");
  });

  it("returns OUT on a draw regardless of pick", () => {
    expect(computePickResult("home", { ...base, isDraw: true, winnerTeamId: null })).toBe(
      "OUT"
    );
  });
});

describe("determineRoundOutcome", () => {
  it("continues when more than one member remains active", () => {
    expect(determineRoundOutcome(5, 3)).toBe("CONTINUE");
  });

  it("declares a single winner when exactly one remains", () => {
    expect(determineRoundOutcome(3, 1)).toBe("SINGLE_WINNER");
  });

  it("declares joint winners when everyone is eliminated together", () => {
    expect(determineRoundOutcome(2, 0)).toBe("ALL_ELIMINATED_JOINT_WINNERS");
  });
});

describe("splitPrize", () => {
  it("splits evenly, rounding down to the cent", () => {
    expect(splitPrize(1000, 3)).toBe(333);
  });

  it("returns 0 when there are no winners", () => {
    expect(splitPrize(1000, 0)).toBe(0);
  });
});
