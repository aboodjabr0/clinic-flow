import { Button } from "./Button";
import { useTranslation } from "../../i18n/useTranslation";
import "./Pagination.css";

interface PaginationProps {
  pageNumber: number;
  totalPages: number;
  onPageChange: (pageNumber: number) => void;
}

export function Pagination({ pageNumber, totalPages, onPageChange }: PaginationProps) {
  const { t } = useTranslation();

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="pagination">
      <Button
        type="button"
        variant="secondary"
        disabled={pageNumber <= 1}
        onClick={() => onPageChange(pageNumber - 1)}
      >
        {t("pagination.previous")}
      </Button>
      <span className="pagination-label">
        {t("pagination.pageOf", { page: pageNumber, total: totalPages })}
      </span>
      <Button
        type="button"
        variant="secondary"
        disabled={pageNumber >= totalPages}
        onClick={() => onPageChange(pageNumber + 1)}
      >
        {t("pagination.next")}
      </Button>
    </div>
  );
}
