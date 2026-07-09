import type { PaymentMethod, PaymentStatus } from "../types/invoice";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  Unpaid: "Unpaid",
  PartiallyPaid: "Partially Paid",
  Paid: "Paid",
  Refunded: "Refunded",
};

export const PAYMENT_STATUS_VARIANTS: Record<PaymentStatus, "success" | "warning" | "danger" | "neutral"> = {
  Unpaid: "danger",
  PartiallyPaid: "warning",
  Paid: "success",
  Refunded: "neutral",
};

export const ALL_PAYMENT_STATUSES: PaymentStatus[] = ["Unpaid", "PartiallyPaid", "Paid", "Refunded"];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  Cash: "Cash",
  Card: "Card",
  BankTransfer: "Bank Transfer",
  CliQ: "CliQ",
  Other: "Other",
};

export const ALL_PAYMENT_METHODS: PaymentMethod[] = ["Cash", "Card", "BankTransfer", "CliQ", "Other"];

export function formatMoney(value: number): string {
  return value.toFixed(2);
}
