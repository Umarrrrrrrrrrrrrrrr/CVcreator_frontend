import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Naavbar from "../Naavbar";
import { getApiUrl } from "../../config/api";
import API_CONFIG from "../../config/api";

const GRADE_COLORS = {
  Poor: "bg-red-500 text-white",
  Average: "bg-amber-500 text-white",
  Good: "bg-blue-500 text-white",
  Excellent: "bg-green-500 text-white",
};

const CvGrade = () => {
  const navigate = useNavigate();
  const [cvText, setCvText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const isValidFileType = (f) => {
    if (!f) return false;
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "application/octet-stream",
    ];
    const validExt = /\.(pdf|docx|doc)$/i.test(f.name || "");
    return validTypes.includes(f.type) || validExt;
  };

  const gradeFile = async (f) => {
    if (!f) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", f);
      const res = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.CV_GRADE), {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.message || data.error || `Request failed (${res.status})`);
      }
      setResult({
        score: data.score ?? 0,
        grade: data.grade ?? "Average",
        suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        enhanced_resume: data.enhanced_resume ?? "",
      });
    } catch (err) {
      setError(err.message || "Failed to grade CV. Check backend and CORS.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setCvText("");
    setResult(null);
    setError("");
    if (f && !isValidFileType(f)) {
      setError("Please upload a valid PDF, DOCX, or DOC file.");
      return;
    }
    if (f) {
      await gradeFile(f);
    }
  };

  const handleTextChange = (e) => {
    setCvText(e.target.value);
    setFile(null);
    setResult(null);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!cvText.trim() && !file) {
      setError("Paste CV text or upload a PDF/DOCX file.");
      return;
    }

    if (file) {
      await gradeFile(file);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.CV_GRADE), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_text: cvText.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || errData.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      setResult({
        score: data.score ?? 0,
        grade: data.grade ?? "Average",
        suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        enhanced_resume: data.enhanced_resume ?? "",
      });
    } catch (err) {
      setError(err.message || "Failed to grade CV. Check backend and CORS.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.enhanced_resume) return;
    navigator.clipboard.writeText(result.enhanced_resume);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegradeEnhanced = async () => {
    if (!result?.enhanced_resume) return;
    setLoading(true);
    setError("");
    const previousScore = result.score;
    try {
      const res = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.CV_GRADE), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_text: result.enhanced_resume }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.detail || data.message || `Request failed (${res.status})`);
      }
      setResult({
        score: data.score ?? 0,
        grade: data.grade ?? "Average",
        suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        enhanced_resume: data.enhanced_resume ?? result.enhanced_resume,
        previousScore,
      });
    } catch (err) {
      setError(err.message || "Failed to regrade. Check backend and CORS.");
    } finally {
      setLoading(false);
    }
  };

  const gradeColor = result ? GRADE_COLORS[result.grade] || "bg-gray-500 text-white" : "";
  const hasUseInTemplate = localStorage.getItem("useInTemplateAccess") === "true";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <Naavbar />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">CV Grading</h1>
          <p className="text-gray-600">Paste your CV text or upload a PDF/DOCX to get a score, grade, and suggestions.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 md:p-8 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
              <span className="font-medium">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Paste CV text</label>
            <textarea
              value={cvText}
              onChange={handleTextChange}
              placeholder="Paste your CV or resume text here..."
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
              disabled={!!file}
            />
          </div>

          <div className="flex items-center gap-4">
            <span className="text-gray-500 text-sm">or</span>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Upload PDF or DOCX</label>
            <input
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={handleFileChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700"
            />
            {file && <p className="mt-2 text-sm text-gray-500">Selected: {file.name}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || (!cvText.trim() && !file)}
            className={`w-full py-3 rounded-xl font-semibold transition-all ${
              loading || (!cvText.trim() && !file)
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
            }`}
          >
            {loading ? "Grading..." : "Grade my CV"}
          </button>
        </form>

        {result && (
          <div className="mt-10 bg-white rounded-2xl shadow-xl p-6 md:p-8 space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Results</h2>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Score:</span>
                <span className="text-2xl font-bold text-gray-800">{result.score}/100</span>
                {result.previousScore != null && (
                  <span className="text-sm text-green-600 font-medium">
                    (was {result.previousScore} ↑ +{result.score - result.previousScore})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Grade:</span>
                <span className={`px-4 py-1.5 rounded-full font-semibold ${gradeColor}`}>{result.grade}</span>
              </div>
            </div>

            {result.suggestions.length > 0 && (
              <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl mb-6">
                <h3 className="text-lg font-semibold text-amber-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Apply These Improvements
                </h3>
                <ul className="space-y-2 text-gray-700">
                  {result.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-200 text-amber-800 text-sm font-bold flex-shrink-0">{i + 1}</span>
                      <span>{typeof s === "string" ? s : s.text || s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.enhanced_resume && (
              <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 via-white to-purple-50 border-2 border-blue-200 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">AI-Enhanced Resume</h3>
                      <p className="text-sm text-gray-600">Your finest CV — optimized by our AI model</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">✓ Improvements Applied</span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-l-2 border-t-2 border-blue-400 rounded-tl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-r-2 border-b-2 border-purple-400 rounded-br-lg" />
                  <textarea
                    readOnly
                    value={result.enhanced_resume}
                    rows={12}
                    className="w-full px-5 py-4 border-2 border-blue-100 rounded-xl bg-white/80 text-gray-800 resize-y font-medium leading-relaxed focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-3 justify-end">
                  <button
                    type="button"
                    onClick={handleRegradeEnhanced}
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 shadow-lg flex items-center gap-2 disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Regrade Enhanced CV
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const hasUseInTemplate = localStorage.getItem('useInTemplateAccess') === 'true';
                      if (!hasUseInTemplate) {
                        sessionStorage.setItem('pendingEnhancedResume', result?.enhanced_resume || '');
                        navigate('/payment', { state: { product: 'useInTemplate', message: 'Pay NRS 500 to use your enhanced CV in templates.' } });
                      } else {
                        navigate('/choose_templates', { state: { enhancedResume: result?.enhanced_resume } });
                      }
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 shadow-lg flex items-center gap-2 relative"
                  >
                    {!hasUseInTemplate && (
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )}
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                    <span>Use in Template</span>
                    <span className="px-2 py-0.5 bg-white/25 rounded-md text-sm font-medium">NRS 500</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CvGrade;
