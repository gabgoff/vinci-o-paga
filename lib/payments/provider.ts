import type { Payment } from "@/app/generated/prisma/client";

export interface PaymentProvider {
  /** Charges the entry fee and marks the membership as paid. */
  createPayment(userId: string, leagueId: string): Promise<Payment>;
}
