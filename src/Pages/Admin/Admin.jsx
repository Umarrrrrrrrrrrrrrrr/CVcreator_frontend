import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../Navbar/Navbar";
import Footer from "../Footer/Footer";
import API_CONFIG, {
  getApiUrl,
  fetchWithAuth,
  ADMIN_PRIMARY_EMAIL,
} from "../../config/api";
import { useAuth } from "../../context/AuthContext";
import AdminJobsPanel from "./AdminJobsPanel";

const USERS_URL = () => getApiUrl(API_CONFIG.ENDPOINTS.ADMIN_USERS);

const emptyForm = {
  email: "",
  username: "",
  password: "",
  password_confirm: "",
  first_name: "",
  last_name: "",
  role: "user",
  is_active: true,
  is_verified: false,
  is_staff: false,
  is_superuser: false,
};

function formatApiErrors(data) {
  if (!data) return "Request failed";
  if (typeof data.detail === "string") return data.detail;
  if (data.message) return data.message;
  const parts = [];
  if (data.errors && typeof data.errors === "object") {
    Object.entries(data.errors).forEach(([k, v]) => {
      const msg = Array.isArray(v) ? v.join(", ") : String(v);
      parts.push(`${k}: ${msg}`);
    });
  }
  Object.entries(data).forEach(([k, v]) => {
    if (k === "detail" || k === "message" || k === "errors") return;
    if (typeof v === "object" && v !== null) {
      const msg = Array.isArray(v) ? v.join(", ") : String(v);
      parts.push(`${k}: ${msg}`);
    }
  });
  return parts.length ? parts.join("; ") : "Something went wrong";
}

const Admin = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isGuest, refreshUserProfile } = useAuth();

  /** Backend is the source of truth: only staff can GET /api/auth/admin/users/. */
  const [adminGate, setAdminGate] = useState(
    "checking"
  ); // 'signed_out' | 'checking' | 'allowed' | 'denied'

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // 'add' | 'edit' | null
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [adminTab, setAdminTab] = useState("users"); // 'users' | 'jobs'

  const verifyAdminAccess = useCallback(async () => {
    setError("");
    setLoading(true);
    await refreshUserProfile();
    try {
      const res = await fetchWithAuth(USERS_URL(), { method: "GET" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAdminGate("allowed");
        setUsers(Array.isArray(data) ? data : []);
        return;
      }
      if (res.status === 403) {
        setAdminGate("denied");
        setUsers([]);
        setError("");
        return;
      }
      if (res.status === 401) {
        setAdminGate("denied");
        setUsers([]);
        setError("Session expired. Log out and log in again.");
        return;
      }
      setAdminGate("denied");
      setUsers([]);
      setError(formatApiErrors(data));
    } catch (e) {
      setAdminGate("denied");
      setUsers([]);
      const m = e.message || "";
      setError(
        m.includes("fetch") || m.includes("Failed")
          ? "Cannot reach the API. Start the backend: in Terminal go to your Back_Back folder, activate .venv, then run: python manage.py runserver — then open http://localhost:8000 to confirm it loads."
          : m || "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [refreshUserProfile]);

  useEffect(() => {
    if (!isAuthenticated || isGuest) {
      setAdminGate("signed_out");
      setLoading(false);
      return undefined;
    }
    setAdminGate("checking");
    verifyAdminAccess();
    return undefined;
  }, [isAuthenticated, isGuest, verifyAdminAccess]);

  const loadUsers = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetchWithAuth(USERS_URL(), { method: "GET" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(formatApiErrors(data));
        setUsers([]);
        return;
      }
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Network error");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModal("add");
  };

  const openEdit = (u) => {
    setEditingId(u.id);
    setForm({
      email: u.email || "",
      username: u.username || "",
      password: "",
      password_confirm: "",
      first_name: u.first_name || "",
      last_name: u.last_name || "",
      role: u.role || "user",
      is_active: !!u.is_active,
      is_verified: !!u.is_verified,
      is_staff: !!u.is_staff,
      is_superuser: !!u.is_superuser,
    });
    setModal("edit");
  };

  const closeModal = () => {
    setModal(null);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (modal === "add") {
        if (form.password !== form.password_confirm) {
          setError("Passwords do not match.");
          setSaving(false);
          return;
        }
        const body = {
          email: form.email.trim(),
          username: form.username.trim(),
          password: form.password,
          password_confirm: form.password_confirm,
          first_name: form.first_name,
          last_name: form.last_name,
          role: form.role,
          is_active: form.is_active,
          is_verified: form.is_verified,
        };
        if (user?.is_superuser) {
          body.is_staff = form.is_staff;
          body.is_superuser = form.is_superuser;
        }
        const res = await fetchWithAuth(USERS_URL(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(formatApiErrors(data));
          setSaving(false);
          return;
        }
        closeModal();
        await loadUsers();
      } else if (modal === "edit" && editingId) {
        const body = {
          email: form.email.trim(),
          username: form.username.trim(),
          first_name: form.first_name,
          last_name: form.last_name,
          role: form.role,
          is_active: form.is_active,
          is_verified: form.is_verified,
        };
        if (user?.is_superuser) {
          body.is_staff = form.is_staff;
          body.is_superuser = form.is_superuser;
        }
        if (form.password && form.password.length >= 6) {
          body.password = form.password;
        }
        const res = await fetchWithAuth(`${USERS_URL()}${editingId}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(formatApiErrors(data));
          setSaving(false);
          return;
        }
        closeModal();
        await loadUsers();
      }
    } catch (err) {
      setError(err.message || "Request failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetchWithAuth(`${USERS_URL()}${deleteTarget.id}/`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(formatApiErrors(data));
        setSaving(false);
        return;
      }
      setDeleteTarget(null);
      await loadUsers();
    } catch (err) {
      setError(err.message || "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const djangoAdminUrl = `${API_CONFIG.BASE_URL.replace(/\/$/, "")}/admin/`;

  if (!isAuthenticated || isGuest) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="flex-1 max-w-lg mx-auto w-full px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Admin</h1>
          <p className="text-gray-600 mb-6">
            Sign in with a staff account to manage users.
          </p>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            Sign in
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  if (adminGate === "checking") {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <p className="text-gray-600">Opening admin…</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (adminGate === "denied") {
    const isNetworkError =
      typeof error === "string" &&
      (error.includes("Cannot reach") || error.includes("fetch"));
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="flex-1 max-w-md mx-auto w-full px-4 py-12 text-center">
          <div className="bg-white rounded-2xl shadow border border-gray-100 p-8">
            <h1 className="text-xl font-bold text-gray-900 mb-3">Admin</h1>
            {isNetworkError ? (
              <p className="text-gray-600 text-sm mb-4">
                The website can’t talk to the API. Start your Django server, then click{" "}
                <strong>Try again</strong>.
              </p>
            ) : (
              <p className="text-gray-600 text-sm mb-4">
                Sign in with your admin email, then open this page again.
              </p>
            )}
            <p className="text-xs text-gray-500 mb-4">
              Admin login:{" "}
              <span className="font-mono text-gray-700">{ADMIN_PRIMARY_EMAIL}</span>
            </p>
            {error && (
              <div className="mb-5 p-3 bg-amber-50 border border-amber-100 text-amber-950 rounded-lg text-xs text-left">
                {error}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={() => {
                  setAdminGate("checking");
                  verifyAdminAccess();
                }}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-700"
              >
                Try again
              </button>
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              >
                Log in
              </Link>
            </div>
            <a
              href={djangoAdminUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-sm text-blue-600 hover:underline"
            >
              Open Django Admin →
            </a>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
              Administration
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {adminTab === "users" ? "Users" : "Jobs"}
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              {adminTab === "users"
                ? "Add, edit, or remove user accounts."
                : "Manage job postings (CRUD). Active jobs show on Find Jobs."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 mr-1">
              <button
                type="button"
                onClick={() => setAdminTab("users")}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold ${
                  adminTab === "users"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Users
              </button>
              <button
                type="button"
                onClick={() => setAdminTab("jobs")}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold ${
                  adminTab === "jobs"
                    ? "bg-emerald-600 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Jobs
              </button>
            </div>
            {adminTab === "users" && (
              <button
                type="button"
                onClick={openAdd}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 shadow"
              >
                Add user
              </button>
            )}
            <a
              href={djangoAdminUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-100"
            >
              Django Admin
            </a>
          </div>
        </div>

        {error && adminTab === "users" && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
            {error}
          </div>
        )}

        {adminTab === "users" && (
          <>
            <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Email</th>
                      <th className="text-left px-4 py-3 font-semibold">Username</th>
                      <th className="text-left px-4 py-3 font-semibold">Role</th>
                      <th className="text-center px-2 py-3 font-semibold">Active</th>
                      <th className="text-center px-2 py-3 font-semibold">Staff</th>
                      <th className="text-center px-2 py-3 font-semibold">Super</th>
                      <th className="text-right px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                          Loading users…
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                          No users found.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900 max-w-[200px] truncate">
                            {u.email}
                          </td>
                          <td className="px-4 py-3">{u.username}</td>
                          <td className="px-4 py-3">{u.role}</td>
                          <td className="px-2 py-3 text-center">
                            {u.is_active ? "✓" : "—"}
                          </td>
                          <td className="px-2 py-3 text-center">
                            {u.is_staff ? "✓" : "—"}
                          </td>
                          <td className="px-2 py-3 text-center">
                            {u.is_superuser ? "✓" : "—"}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openEdit(u)}
                              className="text-blue-600 hover:underline font-medium mr-3"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(u)}
                              className="text-red-600 hover:underline font-medium"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              Non-superuser staff only see non-superuser accounts. Superusers see everyone.
            </p>
          </>
        )}

        {adminTab === "jobs" && <AdminJobsPanel />}
      </main>

      {/* Add / Edit modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
            role="dialog"
            aria-modal="true"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {modal === "add" ? "Add user" : "Edit user"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Email</span>
                  <input
                    name="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={handleFormChange}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Username</span>
                  <input
                    name="username"
                    required
                    value={form.username}
                    onChange={handleFormChange}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </label>
              </div>
              {modal === "add" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-medium text-gray-600">Password</span>
                    <input
                      name="password"
                      type="password"
                      required
                      minLength={6}
                      value={form.password}
                      onChange={handleFormChange}
                      className="mt-1 w-full border rounded-lg px-3 py-2"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-gray-600">
                      Confirm password
                    </span>
                    <input
                      name="password_confirm"
                      type="password"
                      required
                      minLength={6}
                      value={form.password_confirm}
                      onChange={handleFormChange}
                      className="mt-1 w-full border rounded-lg px-3 py-2"
                    />
                  </label>
                </div>
              )}
              {modal === "edit" && (
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">
                    New password (optional, min 6 chars)
                  </span>
                  <input
                    name="password"
                    type="password"
                    minLength={6}
                    value={form.password}
                    onChange={handleFormChange}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    placeholder="Leave blank to keep current"
                  />
                </label>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">First name</span>
                  <input
                    name="first_name"
                    value={form.first_name}
                    onChange={handleFormChange}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Last name</span>
                  <input
                    name="last_name"
                    value={form.last_name}
                    onChange={handleFormChange}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-medium text-gray-600">Role</span>
                <input
                  name="role"
                  value={form.role}
                  onChange={handleFormChange}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                />
              </label>
              <div className="flex flex-wrap gap-4 pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={form.is_active}
                    onChange={handleFormChange}
                  />
                  <span className="text-sm">Active</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_verified"
                    checked={form.is_verified}
                    onChange={handleFormChange}
                  />
                  <span className="text-sm">Verified</span>
                </label>
                {user?.is_superuser && (
                  <>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="is_staff"
                        checked={form.is_staff}
                        onChange={handleFormChange}
                      />
                      <span className="text-sm">Staff</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="is_superuser"
                        checked={form.is_superuser}
                        onChange={handleFormChange}
                      />
                      <span className="text-sm">Superuser</span>
                    </label>
                  </>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving…" : modal === "add" ? "Create" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete user?</h3>
            <p className="text-gray-600 text-sm mb-4">
              This will permanently remove{" "}
              <strong>{deleteTarget.email}</strong>. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg border border-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Admin;
