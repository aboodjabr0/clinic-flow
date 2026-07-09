import { Button } from "./Button";
import "./Pagination.css";

interface PaginationProps {
  pageNumber: number;
  totalPages: number;
  onPageChange: (pageNumber: number) => void;
}

export function Pagination({ pageNumber, totalPages, onPageChange }: PaginationProps) {
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
        Previous
      </Button>
      <span className="pagination-label">
        Page {pageNumber} of {totalPages}
      </span>
      <Button
        type="button"
        variant="secondary"
        disabled={pageNumber >= totalPages}
        onClick={() => onPageChange(pageNumber + 1)}
      >
        Next
      </Button>
    </div>
  );
}
