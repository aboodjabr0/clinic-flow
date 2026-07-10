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
import { useTranslation } from "../../i18n/useTranslation";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../../types/auditLog";
import type { AuditLog, AuditLogListItem } from "../../types/auditLog";
import type { UserRole } from "../../types/auth";
import { formatAuditAction, formatDateTime, formatEntityType, getAuditActionBadgeVariant } from "../../utils/auditLog";
import { getRoleLabelKey } from "../../utils/role";
import "./AuditLogsPage.css";

type ViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded" };

const PAGE_SIZE = 10;
const KNOWN_ROLES: UserRole[] = ["Admin", "Doctor", "Receptionist"];

export function AuditLogsPage() {
  const { t } = useTranslation();
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

  function formatUserRole(role: string | null): string {
    if (!role) return "—";
    return KNOWN_ROLES.includes(role as UserRole) ? t(getRoleLabelKey(role as UserRole)) : role;
  }

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
      const message = error instanceof ApiError ? error.message : t("auditLogs.errorReachApi");
      setView({ status: "error", message });
    }
  }, [search, actionFilter, entityTypeFilter, fromDate, toDate, pageNumber, t]);

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
      setDetailsError(error instanceof ApiError ? error.message : t("auditLogs.errorLoadDetails"));
    }
  }

  function closeModal() {
    setIsModalOpen(false);
    setSelectedLog(null);
    setDetailsError(null);
  }

  return (
    <>
      <PageHeader title={t("auditLogs.title")} subtitle={t("auditLogs.subtitle")} />

      <Card>
        <div className="audit-logs-filters">
          <Input
            placeholder={t("auditLogs.searchPlaceholder")}
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
            <option value="all">{t("auditLogs.allActions")}</option>
            {AUDIT_ACTIONS.map((action) => (
              <option key={action} value={action}>
                {t(formatAuditAction(action))}
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
            <option value="all">{t("auditLogs.allEntityTypes")}</option>
            {AUDIT_ENTITY_TYPES.map((entityType) => (
              <option key={entityType} value={entityType}>
                {t(formatEntityType(entityType))}
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
            {t("common.clear")}
          </Button>
        </div>

        {view.status === "loading" && <LoadingState label={t("auditLogs.loading")} />}

        {view.status === "error" && <EmptyState title={t("auditLogs.unableToLoad")} description={view.message} />}

        {view.status === "loaded" && logs.length === 0 && (
          <EmptyState
            title={t("auditLogs.noneFoundTitle")}
            description={t("auditLogs.noneFoundDescription")}
          />
        )}

        {view.status === "loaded" && logs.length > 0 && (
          <>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("table.timestamp")}</th>
                    <th>{t("table.user")}</th>
                    <th>{t("table.role")}</th>
                    <th>{t("table.action")}</th>
                    <th>{t("table.entityType")}</th>
                    <th>{t("table.entity")}</th>
                    <th>{t("table.summary")}</th>
                    <th>{t("table.ipAddress")}</th>
                    <th aria-label={t("common.actions")} />
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>{formatDateTime(log.createdAtUtc)}</td>
                      <td>{log.userFullName ?? log.userEmail ?? "—"}</td>
                      <td>{formatUserRole(log.userRole)}</td>
                      <td>
                        <StatusBadge label={t(formatAuditAction(log.action))} variant={getAuditActionBadgeVariant(log.action)} />
                      </td>
                      <td>{t(formatEntityType(log.entityType))}</td>
                      <td>{log.entityDisplayName ?? "—"}</td>
                      <td className="audit-logs-summary-cell">{log.summary}</td>
                      <td>{log.ipAddress ?? "—"}</td>
                      <td className="audit-logs-table-actions">
                        <Button variant="ghost" onClick={() => openDetails(log.id)}>
                          {t("auditLogs.details")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="audit-logs-result-count">{t("auditLogs.countFound", { count: totalCount })}</p>
            <Pagination pageNumber={pageNumber} totalPages={totalPages} onPageChange={setPageNumber} />
          </>
        )}
      </Card>

      <Modal isOpen={isModalOpen} title={t("auditLogs.detailsTitle")} onClose={closeModal}>
        {!selectedLog && !detailsError && <LoadingState label={t("auditLogs.loadingDetails")} />}
        {detailsError && <EmptyState title={t("auditLogs.unableToLoadDetails")} description={detailsError} />}
        {selectedLog && (
          <dl className="audit-logs-details">
            <dt>{t("table.timestamp")}</dt>
            <dd>{formatDateTime(selectedLog.createdAtUtc)}</dd>
            <dt>{t("table.user")}</dt>
            <dd>{selectedLog.userFullName ?? "—"} {selectedLog.userEmail ? `(${selectedLog.userEmail})` : ""}</dd>
            <dt>{t("table.role")}</dt>
            <dd>{formatUserRole(selectedLog.userRole)}</dd>
            <dt>{t("table.action")}</dt>
            <dd>
              <StatusBadge
                label={t(formatAuditAction(selectedLog.action))}
                variant={getAuditActionBadgeVariant(selectedLog.action)}
              />
            </dd>
            <dt>{t("table.entityType")}</dt>
            <dd>{t(formatEntityType(selectedLog.entityType))}</dd>
            <dt>{t("auditLogs.entityId")}</dt>
            <dd>{selectedLog.entityId ?? "—"}</dd>
            <dt>{t("table.entity")}</dt>
            <dd>{selectedLog.entityDisplayName ?? "—"}</dd>
            <dt>{t("table.summary")}</dt>
            <dd>{selectedLog.summary}</dd>
            <dt>{t("table.ipAddress")}</dt>
            <dd>{selectedLog.ipAddress ?? "—"}</dd>
            <dt>{t("auditLogs.userAgent")}</dt>
            <dd>{selectedLog.userAgent ?? "—"}</dd>
          </dl>
        )}
      </Modal>
    </>
  );
}
