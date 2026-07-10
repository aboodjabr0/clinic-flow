import type { UserRole } from "../types/auth";
import type { TranslationKey } from "../i18n/translations";

export const ROLE_LABEL_KEYS: Record<UserRole, TranslationKey> = {
  Admin: "roles.admin",
  Doctor: "roles.doctor",
  Receptionist: "roles.receptionist",
};

export function getRoleLabelKey(role: UserRole): TranslationKey {
  return ROLE_LABEL_KEYS[role];
}
