import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Button } from "../common/Button";
import "./Topbar.css";

interface TopbarProps {
  onMenuClick: () => void;
}

function getInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return initials.join("") || "?";
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const nextLabel = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      className="topbar-theme-toggle"
      onClick={toggleTheme}
      title={nextLabel}
      aria-label={nextLabel}
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7" />
          </g>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5z"
            fill="currentColor"
          />
        </svg>
      )}
      <span className="topbar-theme-toggle-label">{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar-menu-btn"
        onClick={onMenuClick}
        aria-label="Toggle navigation menu"
      >
        <span />
        <span />
        <span />
      </button>

      <div className="topbar-spacer" />

      <ThemeToggle />

      {user && (
        <div className="topbar-user">
          <div className="topbar-user-avatar">{getInitials(user.fullName)}</div>
          <div className="topbar-user-info">
            <span className="topbar-user-name">{user.fullName}</span>
            <span className="topbar-user-role">{user.role}</span>
          </div>
          <Button variant="ghost" onClick={logout}>
            Logout
          </Button>
        </div>
      )}
    </header>
  );
}
