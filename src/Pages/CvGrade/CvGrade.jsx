import React, { useState } from "react";
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
  const [cvText, setCvText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setCvText("");
    setResult(null);
    setError("");
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

    setLoading(true);
    try {
      let res;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        res = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.CV_GRADE), {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.CV_GRADE), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cv_text: cvText.trim() }),
        });
      }

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

  const gradeColor = result ? GRADE_COLORS[result.grade] || "bg-gray-500 text-white" : "";

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
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Grade:</span>
                <span className={`px-4 py-1.5 rounded-full font-semibold ${gradeColor}`}>{result.grade}</span>
              </div>
            </div>

            {result.suggestions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Suggestions</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  {result.suggestions.map((s, i) => (
                    <li key={i}>{typeof s === "string" ? s : s.text || s}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.enhanced_resume && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-gray-800">Enhanced resume</h3>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={result.enhanced_resume}
                  rows={12}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 resize-y"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CvGrade;
