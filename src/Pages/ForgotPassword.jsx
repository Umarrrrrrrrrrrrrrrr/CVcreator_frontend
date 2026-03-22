import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import API_CONFIG, { getApiUrl } from "../config/api";

const ForgotPassword = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.DEV_RESET_PASSWORD), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          new_password: newPassword,
          new_password_confirm: confirm,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setMessage(data.message || "Password updated.");
        setNewPassword("");
        setConfirm("");
      } else if (res.status === 404 && data.detail === "Not found") {
        setError(
          "This reset page only works in local development (Django DEBUG=True). Use your terminal: python manage.py changepassword your@email.com"
        );
      } else {
        setError(data.message || "Could not reset password.");
      }
    } catch (err) {
      setError(
        err.message?.includes("fetch")
          ? "Cannot reach the server. Start the backend (python manage.py runserver)."
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {t("forgotPassword.title")}
          </h1>
          <p className="text-gray-600 text-sm">{t("forgotPassword.subtitle")}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fp-email" className="block text-gray-700 font-semibold mb-1 text-sm">
                {t("login.email")}
              </label>
              <input
                id="fp-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="fp-np" className="block text-gray-700 font-semibold mb-1 text-sm">
                {t("forgotPassword.newPassword")}
              </label>
              <input
                id="fp-np"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="fp-c" className="block text-gray-700 font-semibold mb-1 text-sm">
                {t("forgotPassword.confirmNew")}
              </label>
              <input
                id="fp-c"
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              }`}
            >
              {loading ? t("forgotPassword.saving") : t("forgotPassword.submit")}
            </button>
          </form>

          <p className="mt-4 text-xs text-gray-500 text-center">
            {t("forgotPassword.devNote")}
          </p>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">
              ← {t("forgotPassword.backToLogin")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
