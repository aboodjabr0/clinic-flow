import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { Card } from "../../components/common/Card";
import { EmptyState } from "../../components/common/EmptyState";
import { Button } from "../../components/common/Button";

export function AccessDeniedPage() {
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="Access denied" subtitle="You don't have permission to view this page." />
      <Card>
        <EmptyState
          title="Access denied"
          description="Your account role doesn't have permission to access this section."
          action={
            <Button variant="secondary" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          }
        />
      </Card>
    </>
  );
}
