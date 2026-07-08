import { prisma } from "@/lib/prisma";
import type { PaymentProvider } from "./provider";

/**
 * Simulated payment: no external gateway call. Immediately records a SUCCEEDED
 * payment and marks the membership as paid. Swap for Stripe/PayPal later by
 * implementing PaymentProvider and swapping getPaymentProvider().
 */
export class MockPaymentProvider implements PaymentProvider {
  async createPayment(userId: string, leagueId: string) {
    const league = await prisma.league.findUniqueOrThrow({ where: { id: leagueId } });

    const payment = await prisma.payment.create({
      data: {
        userId,
        leagueId,
        amount: league.entryFee,
        provider: "MOCK",
        status: "SUCCEEDED",
      },
    });

    await prisma.membership.update({
      where: { userId_leagueId: { userId, leagueId } },
      data: { paid: true },
    });

    return payment;
  }
}

export function getPaymentProvider(): PaymentProvider {
  return new MockPaymentProvider();
}
