import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { Card } from "../../components/common/Card";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingState } from "../../components/common/LoadingState";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { Select } from "../../components/common/Select";
import { Modal } from "../../components/common/Modal";
import { Pagination } from "../../components/common/Pagination";
import { auditLogsApi } from "../../api/auditLogsApi";
import { ApiError } from "../../api/apiClient";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../../types/auditLog";
import type { AuditLog, AuditLogListItem } from "../../types/auditLog";
import { formatAuditAction, formatDateTime, formatEntityType, getAuditActionBadgeVariant } from "../../utils/auditLog";
import "./AuditLogsPage.css";

type ViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded" };

const PAGE_SIZE = 10;

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogListItem[]>([]);
  const [view, setView] = useState<ViewState>({ status: "loading" });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPageNumber(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const loadLogs = useCallback(async () => {
    setView({ status: "loading" });
    try {
      const response = await auditLogsApi.getAuditLogs({
        search: search || undefined,
        action: actionFilter === "all" ? undefined : actionFilter,
        entityType: entityTypeFilter === "all" ? undefined : entityTypeFilter,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        pageNumber,
        pageSize: PAGE_SIZE,
      });
      setLogs(response.data.items);
      setTotalPages(response.data.totalPages);
      setTotalCount(response.data.totalCount);
      setView({ status: "loaded" });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Unable to reach the API.";
      setView({ status: "error", message });
    }
  }, [search, actionFilter, entityTypeFilter, fromDate, toDate, pageNumber]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setActionFilter("all");
    setEntityTypeFilter("all");
    setFromDate("");
    setToDate("");
    setPageNumber(1);
  }

  async function openDetails(id: string) {
    setSelectedLog(null);
    setDetailsError(null);
    setIsModalOpen(true);
    try {
      const response = await auditLogsApi.getAuditLogById(id);
      setSelectedLog(response.data);
    } catch (error) {
      setDetailsError(error instanceof ApiError ? error.message : "Unable to load audit log details.");
    }
  }

  function closeModal() {
    setIsModalOpen(false);
    setSelectedLog(null);
    setDetailsError(null);
  }

  return (
    <>
      <PageHeader title="Audit Logs" subtitle="Review sensitive clinic operations. Admin only." />

      <Card>
        <div className="audit-logs-filters">
          <Input
            placeholder="Search by user, entity, summary..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPageNumber(1);
            }}
          >
            <option value="all">All actions</option>
            {AUDIT_ACTIONS.map((action) => (
              <option key={action} value={action}>
                {formatAuditAction(action)}
              </option>
            ))}
          </Select>
          <Select
            value={entityTypeFilter}
            onChange={(e) => {
              setEntityTypeFilter(e.target.value);
              setPageNumber(1);
            }}
          >
            <option value="all">All entity types</option>
            {AUDIT_ENTITY_TYPES.map((entityType) => (
              <option key={entityType} value={entityType}>
                {formatEntityType(entityType)}
              </option>
            ))}
          </Select>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPageNumber(1);
            }}
          />
          <Input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPageNumber(1);
            }}
          />
          <Button type="button" variant="ghost" onClick={clearFilters}>
            Clear
          </Button>
        </div>

        {view.status === "loading" && <LoadingState label="Loading audit logs..." />}

        {view.status === "error" && <EmptyState title="Unable to load audit logs" description={view.message} />}

        {view.status === "loaded" && logs.length === 0 && (
          <EmptyState
            title="No audit log entries found"
            description="Try adjusting your search or filters."
          />
        )}

        {view.status === "loaded" && logs.length > 0 && (
          <>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Action</th>
                    <th>Entity Type</th>
                    <th>Entity</th>
                    <th>Summary</th>
                    <th>IP Address</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>{formatDateTime(log.createdAtUtc)}</td>
                      <td>{log.userFullName ?? log.userEmail ?? "—"}</td>
                      <td>{log.userRole ?? "—"}</td>
                      <td>
                        <StatusBadge label={formatAuditAction(log.action)} variant={getAuditActionBadgeVariant(log.action)} />
                      </td>
                      <td>{formatEntityType(log.entityType)}</td>
                      <td>{log.entityDisplayName ?? "—"}</td>
                      <td className="audit-logs-summary-cell">{log.summary}</td>
                      <td>{log.ipAddress ?? "—"}</td>
                      <td className="audit-logs-table-actions">
                        <Button variant="ghost" onClick={() => openDetails(log.id)}>
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="audit-logs-result-count">{totalCount} entr{totalCount === 1 ? "y" : "ies"} found</p>
            <Pagination pageNumber={pageNumber} totalPages={totalPages} onPageChange={setPageNumber} />
          </>
        )}
      </Card>

      <Modal isOpen={isModalOpen} title="Audit Log Details" onClose={closeModal}>
        {!selectedLog && !detailsError && <LoadingState label="Loading details..." />}
        {detailsError && <EmptyState title="Unable to load details" description={detailsError} />}
        {selectedLog && (
          <dl className="audit-logs-details">
            <dt>Timestamp</dt>
            <dd>{formatDateTime(selectedLog.createdAtUtc)}</dd>
            <dt>User</dt>
            <dd>{selectedLog.userFullName ?? "—"} {selectedLog.userEmail ? `(${selectedLog.userEmail})` : ""}</dd>
            <dt>Role</dt>
            <dd>{selectedLog.userRole ?? "—"}</dd>
            <dt>Action</dt>
            <dd>
              <StatusBadge
                label={formatAuditAction(selectedLog.action)}
                variant={getAuditActionBadgeVariant(selectedLog.action)}
              />
            </dd>
            <dt>Entity Type</dt>
            <dd>{formatEntityType(selectedLog.entityType)}</dd>
            <dt>Entity ID</dt>
            <dd>{selectedLog.entityId ?? "—"}</dd>
            <dt>Entity</dt>
            <dd>{selectedLog.entityDisplayName ?? "—"}</dd>
            <dt>Summary</dt>
            <dd>{selectedLog.summary}</dd>
            <dt>IP Address</dt>
            <dd>{selectedLog.ipAddress ?? "—"}</dd>
            <dt>User Agent</dt>
            <dd>{selectedLog.userAgent ?? "—"}</dd>
          </dl>
        )}
      </Modal>
    </>
  );
}
