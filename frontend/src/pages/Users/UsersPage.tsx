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
import { usersApi } from "../../api/usersApi";
import { doctorsApi } from "../../api/doctorsApi";
import { ApiError } from "../../api/apiClient";
import { useTranslation } from "../../i18n/useTranslation";
import { getRoleLabelKey } from "../../utils/role";
import type { UserRole } from "../../types/auth";
import type { Doctor } from "../../types/doctor";
import type { CreateUserRequest, User } from "../../types/user";
import "./UsersPage.css";

type ViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded" };

type RoleFilter = "all" | UserRole;
type StatusFilter = "all" | "active" | "inactive";

const ROLE_BADGE_VARIANT: Record<UserRole, "info" | "success" | "warning"> = {
  Admin: "info",
  Doctor: "success",
  Receptionist: "warning",
};

interface UserFormState {
  fullName: string;
  email: string;
  password: string;
  role: UserRole | "";
  doctorProfileId: string;
  isActive: boolean;
}

const EMPTY_FORM: UserFormState = {
  fullName: "",
  email: "",
  password: "",
  role: "",
  doctorProfileId: "",
  isActive: true,
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [doctorProfiles, setDoctorProfiles] = useState<Doctor[]>([]);
  const [view, setView] = useState<ViewState>({ status: "loading" });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [statusActionError, setStatusActionError] = useState<string | null>(null);

  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const loadUsers = useCallback(async () => {
    setView({ status: "loading" });
    try {
      const response = await usersApi.getAll({
        search: search || undefined,
        role: roleFilter === "all" ? undefined : roleFilter,
        isActive: statusFilter === "all" ? undefined : statusFilter === "active",
      });
      setUsers(response.data);
      setView({ status: "loaded" });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t("users.errorReachApi");
      setView({ status: "error", message });
    }
  }, [search, roleFilter, statusFilter, t]);

  const loadDoctorProfiles = useCallback(async () => {
    try {
      const response = await doctorsApi.getAll();
      setDoctorProfiles(response.data);
    } catch {
      setDoctorProfiles([]);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadDoctorProfiles();
  }, [loadDoctorProfiles]);

  function openCreateModal() {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEditModal(user: User) {
    setEditingUser(user);
    setForm({
      fullName: user.fullName,
      email: user.email,
      password: "",
      role: user.role,
      doctorProfileId: user.doctorProfileId ?? "",
      isActive: user.isActive,
    });
    setFormError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) return;
    setIsModalOpen(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!form.fullName.trim()) {
      setFormError(t("users.errorNameRequired"));
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setFormError(t("users.errorInvalidEmail"));
      return;
    }
    if (!form.role) {
      setFormError(t("users.errorRoleRequired"));
      return;
    }
    if (!editingUser && form.password.trim().length < 8) {
      setFormError(t("users.errorPasswordMin"));
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      if (editingUser) {
        await usersApi.update(editingUser.id, {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          role: form.role,
          doctorProfileId: form.doctorProfileId || undefined,
          isActive: form.isActive,
        });
      } else {
        const payload: CreateUserRequest = {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          doctorProfileId: form.doctorProfileId || undefined,
          isActive: form.isActive,
        };
        await usersApi.create(payload);
      }
      setIsModalOpen(false);
      await loadUsers();
      await loadDoctorProfiles();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t("users.errorUnableToSave"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleStatus(user: User) {
    setStatusActionError(null);
    try {
      await usersApi.setActiveStatus(user.id, !user.isActive);
      await loadUsers();
    } catch (error) {
      setStatusActionError(
        user.isActive ? t("users.errorDeactivateLastAdmin") : t("users.errorUnableToActivate"),
      );
    }
  }

  function openResetPasswordModal(user: User) {
    setResetPasswordUser(user);
    setNewPassword("");
    setResetError(null);
  }

  function closeResetPasswordModal() {
    if (isResetting) return;
    setResetPasswordUser(null);
  }

  async function handleResetPassword(event: React.FormEvent) {
    event.preventDefault();
    if (!resetPasswordUser) return;

    if (newPassword.length < 8) {
      setResetError(t("users.errorPasswordMin"));
      return;
    }

    setIsResetting(true);
    setResetError(null);
    try {
      await usersApi.resetPassword(resetPasswordUser.id, { newPassword });
      setResetPasswordUser(null);
    } catch (error) {
      setResetError(error instanceof ApiError ? error.message : t("users.errorUnableToResetPassword"));
    } finally {
      setIsResetting(false);
    }
  }

  const availableDoctorProfiles = doctorProfiles.filter(
    (profile) => !profile.appUserId || profile.appUserId === editingUser?.id,
  );

  return (
    <>
      <PageHeader
        title={t("users.title")}
        subtitle={t("users.subtitle")}
        actions={<Button onClick={openCreateModal}>{t("users.addUser")}</Button>}
      />

      <Card>
        <div className="users-filters">
          <Input
            placeholder={t("users.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}>
            <option value="all">{t("users.allRoles")}</option>
            <option value="Admin">{t("roles.admin")}</option>
            <option value="Doctor">{t("roles.doctor")}</option>
            <option value="Receptionist">{t("roles.receptionist")}</option>
          </Select>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">{t("users.allStatuses")}</option>
            <option value="active">{t("common.active")}</option>
            <option value="inactive">{t("common.inactive")}</option>
          </Select>
        </div>

        {statusActionError && <p className="users-form-error">{statusActionError}</p>}

        {view.status === "loading" && <LoadingState label={t("users.loading")} />}

        {view.status === "error" && (
          <EmptyState title={t("users.unableToLoad")} description={view.message} />
        )}

        {view.status === "loaded" && users.length === 0 && (
          <EmptyState
            title={t("users.noneFoundTitle")}
            description={t("users.noneFoundDescription")}
          />
        )}

        {view.status === "loaded" && users.length > 0 && (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("table.name")}</th>
                  <th>{t("table.email")}</th>
                  <th>{t("table.role")}</th>
                  <th>{t("table.doctorProfile")}</th>
                  <th>{t("table.status")}</th>
                  <th>{t("table.created")}</th>
                  <th aria-label={t("common.actions")} />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.fullName}</td>
                    <td>{user.email}</td>
                    <td>
                      <StatusBadge label={t(getRoleLabelKey(user.role))} variant={ROLE_BADGE_VARIANT[user.role]} />
                    </td>
                    <td>{user.doctorProfileName ?? "—"}</td>
                    <td>
                      <StatusBadge
                        label={user.isActive ? t("common.active") : t("common.inactive")}
                        variant={user.isActive ? "success" : "neutral"}
                      />
                    </td>
                    <td>{formatDate(user.createdAtUtc)}</td>
                    <td className="users-table-actions">
                      <Button variant="ghost" onClick={() => openEditModal(user)}>
                        {t("common.edit")}
                      </Button>
                      <Button variant="ghost" onClick={() => openResetPasswordModal(user)}>
                        {t("users.resetPassword")}
                      </Button>
                      <Button
                        variant={user.isActive ? "danger" : "secondary"}
                        onClick={() => handleToggleStatus(user)}
                      >
                        {user.isActive ? t("users.deactivate") : t("users.activate")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={isModalOpen} title={editingUser ? t("users.editUser") : t("users.addUserTitle")} onClose={closeModal}>
        <form className="modal-form" onSubmit={handleSubmit}>
          <Input
            label={t("users.fullName")}
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
          <Input
            label={t("users.email")}
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          {!editingUser && (
            <Input
              label={t("users.password")}
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          )}
          <Select
            label={t("users.role")}
            required
            value={form.role}
            onChange={(e) =>
              setForm({ ...form, role: e.target.value as UserRole, doctorProfileId: "" })
            }
          >
            <option value="" disabled>
              {t("users.selectRole")}
            </option>
            <option value="Admin">{t("roles.admin")}</option>
            <option value="Doctor">{t("roles.doctor")}</option>
            <option value="Receptionist">{t("roles.receptionist")}</option>
          </Select>
          {form.role === "Doctor" && (
            <Select
              label={t("users.doctorProfileOptional")}
              value={form.doctorProfileId}
              onChange={(e) => setForm({ ...form, doctorProfileId: e.target.value })}
            >
              <option value="">{t("users.noLinkedProfile")}</option>
              {availableDoctorProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {t("users.doctorProfileOption", { name: profile.fullName, specialty: profile.specialty })}
                </option>
              ))}
            </Select>
          )}
          {editingUser && (
            <label className="users-active-checkbox">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              {t("users.active")}
            </label>
          )}

          {formError && <p className="users-form-error">{formError}</p>}

          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={closeModal} disabled={isSaving}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={resetPasswordUser !== null}
        title={
          resetPasswordUser
            ? t("users.resetPasswordTitleWithName", { name: resetPasswordUser.fullName })
            : t("users.resetPasswordTitle")
        }
        onClose={closeResetPasswordModal}
      >
        <form className="modal-form" onSubmit={handleResetPassword}>
          <Input
            label={t("users.newPassword")}
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          {resetError && <p className="users-form-error">{resetError}</p>}

          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={closeResetPasswordModal} disabled={isResetting}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isResetting}>
              {isResetting ? t("users.resetting") : t("users.resetPassword")}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
