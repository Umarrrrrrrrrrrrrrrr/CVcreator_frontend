import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../config/api';

const Login = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { login } = useAuth();

  const toggleLanguage = () => i18n.changeLanguage(i18n.language === "en" ? "ne" : "en");
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData({
      ...formData,
      [id]: value
    });
    setErrors('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors('');

    try {
      const response = await fetch(getApiUrl('/api/login/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });

      if (response.ok) {
        const data = await response.json();
        login(
          {
            email: data.user?.email || formData.email,
            username: data.user?.username || formData.email.split('@')[0],
            id: data.user?.id,
            role: data.user?.role,
            full_name: data.user?.full_name,
            first_name: data.user?.first_name,
            last_name: data.user?.last_name,
            phone: data.user?.phone,
            location: data.user?.location,
            bio: data.user?.bio,
            linkedin_url: data.user?.linkedin_url,
            website_url: data.user?.website_url,
            profile_photo_url: data.user?.profile_photo_url,
          },
          data.tokens ? { access: data.tokens.access, refresh: data.tokens.refresh } : null
        );
        navigate('/');
      } else {
        const errData = await response.json().catch(() => ({}));
        setErrors(errData.message || 'Invalid email or password. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors(error.message?.includes('fetch') ? 'Cannot connect to server. Is the backend running?' : 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4">
      <button
        onClick={toggleLanguage}
        className="absolute top-4 right-4 px-3 py-1.5 text-sm font-semibold text-gray-700 rounded-lg border border-gray-200 hover:bg-blue-50"
      >
        {i18n.language === "en" ? "ने" : "EN"}
      </button>
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">{t("login.welcomeBack")}</h1>
          <p className="text-gray-600 mb-1">{t("login.signInToContinue")}</p>
          <p className="text-sm text-gray-500">{t("login.signInOnly")}</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {errors && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {errors}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-gray-700 font-semibold mb-2">
                {t("login.email")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  type="email"
                  id="email"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-gray-700 font-semibold mb-2">
                {t("login.password")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  id="password"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Forgot Password */}
            <div className="flex items-center justify-end">
              <a href="#" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                {t("login.forgotPassword")}
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
              }`}
            >
              {loading ? t("login.signingIn") : t("login.signIn")}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-sm text-gray-500">OR</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Register Link */}
          <div className="text-center">
            <p className="text-gray-600">
              {t("login.noAccount")}{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-800 font-semibold">
                {t("login.registerFirst")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
