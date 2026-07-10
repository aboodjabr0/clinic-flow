import type { PaymentMethod, PaymentStatus } from "../types/invoice";
import type { TranslationKey } from "../i18n/translations";

export const PAYMENT_STATUS_LABEL_KEYS: Record<PaymentStatus, TranslationKey> = {
  Unpaid: "status.payment.unpaid",
  PartiallyPaid: "status.payment.partiallyPaid",
  Paid: "status.payment.paid",
  Refunded: "status.payment.refunded",
};

export const PAYMENT_STATUS_VARIANTS: Record<PaymentStatus, "success" | "warning" | "danger" | "neutral"> = {
  Unpaid: "danger",
  PartiallyPaid: "warning",
  Paid: "success",
  Refunded: "neutral",
};

export const ALL_PAYMENT_STATUSES: PaymentStatus[] = ["Unpaid", "PartiallyPaid", "Paid", "Refunded"];

export const PAYMENT_METHOD_LABEL_KEYS: Record<PaymentMethod, TranslationKey> = {
  Cash: "status.paymentMethod.cash",
  Card: "status.paymentMethod.card",
  BankTransfer: "status.paymentMethod.bankTransfer",
  CliQ: "status.paymentMethod.cliq",
  Other: "status.paymentMethod.other",
};

export const ALL_PAYMENT_METHODS: PaymentMethod[] = ["Cash", "Card", "BankTransfer", "CliQ", "Other"];

export function formatMoney(value: number): string {
  return value.toFixed(2);
}
