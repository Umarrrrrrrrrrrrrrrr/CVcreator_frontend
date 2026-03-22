import React, { useCallback, useEffect, useState } from "react";
import API_CONFIG, { getApiUrl, fetchWithAuth } from "../../config/api";

const JOBS_MANAGE = () => getApiUrl(API_CONFIG.ENDPOINTS.ADMIN_JOBS_MANAGE);

const EMPLOYMENT = [
  { value: "full_time", label: "Full time" },
  { value: "part_time", label: "Part time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "freelance", label: "Freelance" },
];

const STATUS_OPTS = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "closed", label: "Closed" },
];

const emptyJob = {
  job_title: "",
  company_name: "",
  location: "",
  employment_type: "full_time",
  job_description: "",
  application_deadline: "",
  contact_email: "",
  salary_min: "",
  salary_max: "",
  is_remote: false,
  status: "active",
  required_skills: "",
  requirements: "",
  key_responsibilities: "",
};

function formatJobErrors(data) {
  if (!data) return "Request failed";
  if (typeof data.detail === "string") return data.detail;
  if (data.message) return data.message;
  const parts = [];
  const collect = (obj, prefix = "") => {
    if (!obj || typeof obj !== "object") return;
    Object.entries(obj).forEach(([k, v]) => {
      const key = prefix ? `${prefix}.${k}` : k;
      if (Array.isArray(v)) parts.push(`${key}: ${v.join(", ")}`);
      else if (typeof v === "object" && v !== null) collect(v, key);
      else parts.push(`${key}: ${v}`);
    });
  };
  collect(data);
  return parts.length ? parts.join("; ") : "Validation failed";
}

const AdminJobsPanel = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyJob);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadJobs = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetchWithAuth(JOBS_MANAGE(), { method: "GET" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(formatJobErrors(data));
        setJobs([]);
        return;
      }
      const list = data.results ?? data;
      setJobs(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e.message || "Failed to load jobs");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const openAdd = () => {
    setForm(emptyJob);
    setEditingId(null);
    setModal("add");
  };

  const openEdit = (j) => {
    setEditingId(j.id);
    const deadline =
      j.application_deadline?.slice?.(0, 10) || j.application_deadline || "";
    const skillsStr = Array.isArray(j.skills)
      ? j.skills.map((s) => (typeof s === "string" ? s : s.name)).join(", ")
      : "";
    setForm({
      job_title: j.job_title || "",
      company_name: j.company_name || "",
      location: j.location || "",
      employment_type: j.employment_type || "full_time",
      job_description: j.job_description || "",
      application_deadline: deadline,
      contact_email: j.contact_email || "",
      salary_min: j.salary_min != null ? String(j.salary_min) : "",
      salary_max: j.salary_max != null ? String(j.salary_max) : "",
      is_remote: !!j.is_remote,
      status: j.status || "active",
      required_skills: skillsStr,
      requirements: j.requirements || "",
      key_responsibilities: j.key_responsibilities || "",
    });
    setModal("edit");
  };

  const closeModal = () => {
    setModal(null);
    setEditingId(null);
    setForm(emptyJob);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const buildPayload = () => {
    const salaryMin = form.salary_min.trim() ? Number(form.salary_min) : null;
    const salaryMax = form.salary_max.trim() ? Number(form.salary_max) : null;
    const skillsList = form.required_skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      job_title: form.job_title.trim(),
      company_name: form.company_name.trim(),
      location: form.location.trim(),
      employment_type: form.employment_type,
      job_description: form.job_description.trim(),
      application_deadline: form.application_deadline || null,
      contact_email: form.contact_email.trim(),
      salary_min: Number.isFinite(salaryMin) ? salaryMin : null,
      salary_max: Number.isFinite(salaryMax) ? salaryMax : null,
      is_remote: form.is_remote,
      status: form.status,
      skills_list: skillsList,
      requirements: form.requirements.trim() || "",
      key_responsibilities: form.key_responsibilities.trim() || "",
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = buildPayload();
      const url =
        modal === "edit" && editingId
          ? `${JOBS_MANAGE()}${editingId}/`
          : JOBS_MANAGE();
      const res = await fetchWithAuth(url, {
        method: modal === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(formatJobErrors(data));
        setSaving(false);
        return;
      }
      closeModal();
      await loadJobs();
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetchWithAuth(`${JOBS_MANAGE()}${deleteTarget.id}/`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(formatJobErrors(data));
        setSaving(false);
        return;
      }
      setDeleteTarget(null);
      await loadJobs();
    } catch (err) {
      setError(err.message || "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Jobs</h2>
          <p className="text-gray-600 text-sm mt-1">
            Create and edit listings. These appear on Find Jobs when status is Active.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-emerald-700 hover:to-teal-700 shadow"
        >
          Add job
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Title</th>
                <th className="text-left px-4 py-3 font-semibold">Company</th>
                <th className="text-left px-4 py-3 font-semibold">Location</th>
                <th className="text-left px-3 py-3 font-semibold">Type</th>
                <th className="text-left px-3 py-3 font-semibold">Status</th>
                <th className="text-left px-3 py-3 font-semibold">Deadline</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    Loading jobs…
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    No jobs yet. Run{" "}
                    <code className="text-xs bg-gray-100 px-1 rounded">
                      python manage.py seed_jobs
                    </code>{" "}
                    in the backend folder to add samples, or click Add job.
                  </td>
                </tr>
              ) : (
                jobs.map((j) => (
                  <tr key={j.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px] truncate">
                      {j.job_title}
                    </td>
                    <td className="px-4 py-3">{j.company_name}</td>
                    <td className="px-4 py-3">{j.location}</td>
                    <td className="px-3 py-3 capitalize whitespace-nowrap">
                      {String(j.employment_type || "").replace(/_/g, " ")}
                    </td>
                    <td className="px-3 py-3 capitalize">{j.status}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {j.application_deadline || "—"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEdit(j)}
                        className="text-blue-600 hover:underline font-medium mr-3"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(j)}
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

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            role="dialog"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {modal === "add" ? "Add job" : "Edit job"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block sm:col-span-2">
                  <span className="text-xs font-medium text-gray-600">Job title *</span>
                  <input
                    name="job_title"
                    required
                    value={form.job_title}
                    onChange={handleChange}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Company *</span>
                  <input
                    name="company_name"
                    required
                    value={form.company_name}
                    onChange={handleChange}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Location *</span>
                  <input
                    name="location"
                    required
                    value={form.location}
                    onChange={handleChange}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Employment type *</span>
                  <select
                    name="employment_type"
                    value={form.employment_type}
                    onChange={handleChange}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  >
                    {EMPLOYMENT.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Status</span>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  >
                    {STATUS_OPTS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-medium text-gray-600">Description *</span>
                  <textarea
                    name="job_description"
                    required
                    rows={4}
                    value={form.job_description}
                    onChange={handleChange}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Application deadline *</span>
                  <input
                    name="application_deadline"
                    type="date"
                    required
                    value={form.application_deadline}
                    onChange={handleChange}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Contact email *</span>
                  <input
                    name="contact_email"
                    type="email"
                    required
                    value={form.contact_email}
                    onChange={handleChange}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Salary min</span>
                  <input
                    name="salary_min"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.salary_min}
                    onChange={handleChange}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Salary max</span>
                  <input
                    name="salary_max"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.salary_max}
                    onChange={handleChange}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </label>
                <label className="flex items-center gap-2 mt-6">
                  <input
                    type="checkbox"
                    name="is_remote"
                    checked={form.is_remote}
                    onChange={handleChange}
                  />
                  <span className="text-sm text-gray-700">Remote OK</span>
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-medium text-gray-600">
                    Skills (comma-separated)
                  </span>
                  <input
                    name="required_skills"
                    value={form.required_skills}
                    onChange={handleChange}
                    placeholder="React, Python, SQL"
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-medium text-gray-600">Requirements</span>
                  <textarea
                    name="requirements"
                    rows={2}
                    value={form.requirements}
                    onChange={handleChange}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-medium text-gray-600">Key responsibilities</span>
                  <textarea
                    name="key_responsibilities"
                    rows={2}
                    value={form.key_responsibilities}
                    onChange={handleChange}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </label>
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
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? "Saving…" : modal === "add" ? "Create job" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete job?</h3>
            <p className="text-gray-600 text-sm mb-4">
              Remove <strong>{deleteTarget.job_title}</strong> at {deleteTarget.company_name}?
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
    </div>
  );
};

export default AdminJobsPanel;
