import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { UserRole } from "../../types/auth";
import "./Sidebar.css";

const NAV_ITEMS: { to: string; label: string; roles?: UserRole[] }[] = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/patients", label: "Patients" },
  { to: "/appointments", label: "Appointments" },
  { to: "/doctors", label: "Doctors" },
  { to: "/services", label: "Services" },
  { to: "/visits", label: "Visits" },
  { to: "/invoices", label: "Invoices" },
  { to: "/reports", label: "Reports" },
  { to: "/settings", label: "Settings", roles: ["Admin"] },
  { to: "/audit-logs", label: "Audit Logs", roles: ["Admin"] },
];

interface SidebarProps {
  isOpen: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ isOpen, onNavigate }: SidebarProps) {
  const { hasAnyRole } = useAuth();
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
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
