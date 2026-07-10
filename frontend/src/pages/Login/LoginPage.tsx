import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Card } from "../../components/common/Card";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../api/apiClient";
import { useTranslation } from "../../i18n/useTranslation";
import "./LoginPage.css";

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectFrom = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;

  if (isAuthenticated) {
    return <Navigate to={redirectFrom ?? "/dashboard"} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError(t("login.errorRequired"));
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate(redirectFrom ?? "/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("login.errorGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <Card className="login-card">
        <div className="login-brand">
          <span className="login-brand-mark">CF</span>
          <span className="login-brand-name">ClinicFlow</span>
        </div>
        <p className="login-subtitle">{t("login.subtitle")}</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <Input
            label={t("login.email")}
            type="email"
            placeholder="you@clinic.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
            autoComplete="email"
          />
          <Input
            label={t("login.password")}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
            autoComplete="current-password"
            error={error ?? undefined}
          />
          <Button type="submit" fullWidth disabled={isSubmitting}>
            {isSubmitting ? t("login.signingIn") : t("login.signIn")}
          </Button>
        </form>

        <p className="login-note">{t("login.demoCredentials")}</p>
      </Card>
    </div>
  );
}
