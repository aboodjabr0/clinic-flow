import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { Card } from "../../components/common/Card";
import { EmptyState } from "../../components/common/EmptyState";
import { Button } from "../../components/common/Button";
import { useTranslation } from "../../i18n/useTranslation";

export function AccessDeniedPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <>
      <PageHeader title={t("accessDenied.title")} subtitle={t("accessDenied.subtitle")} />
      <Card>
        <EmptyState
          title={t("accessDenied.title")}
          description={t("accessDenied.description")}
          action={
            <Button variant="secondary" onClick={() => navigate("/dashboard")}>
              {t("accessDenied.backToDashboard")}
            </Button>
          }
        />
      </Card>
    </>
  );
}
