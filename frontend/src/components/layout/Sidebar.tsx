import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n/useTranslation";
import type { TranslationKey } from "../../i18n/translations";
import type { UserRole } from "../../types/auth";
import "./Sidebar.css";

const NAV_ITEMS: { to: string; labelKey: TranslationKey; roles?: UserRole[] }[] = [
  { to: "/dashboard", labelKey: "nav.dashboard" },
  { to: "/patients", labelKey: "nav.patients" },
  { to: "/appointments", labelKey: "nav.appointments" },
  { to: "/doctors", labelKey: "nav.doctors" },
  { to: "/services", labelKey: "nav.services" },
  { to: "/visits", labelKey: "nav.visits" },
  { to: "/invoices", labelKey: "nav.invoices" },
  { to: "/reports", labelKey: "nav.reports" },
  { to: "/settings", labelKey: "nav.settings", roles: ["Admin"] },
  { to: "/audit-logs", labelKey: "nav.auditLogs", roles: ["Admin"] },
  { to: "/users", labelKey: "nav.users", roles: ["Admin"] },
];

interface SidebarProps {
  isOpen: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ isOpen, onNavigate }: SidebarProps) {
  const { hasAnyRole } = useAuth();
  const { t } = useTranslation();
  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || hasAnyRole(item.roles));

  return (
    <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark">CF</span>
        <span className="sidebar-brand-name">ClinicFlow</span>
      </div>
      <nav className="sidebar-nav">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) => `sidebar-link ${isActive ? "sidebar-link-active" : ""}`}
          >
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
