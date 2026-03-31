import React, { useEffect, useState, useCallback } from "react";
import Navbar from "./Navbar/Navbar";
import { getApiUrl, fetchWithAuth } from "../config/api";
import API_CONFIG from "../config/api";

/** API returns `skills` as [{ id, name }, ...]; UI expects a comma string for .split(',') */
function skillsToLabelString(skills, requiredSkills) {
  if (requiredSkills != null && typeof requiredSkills === "string") return requiredSkills;
  if (!skills) return "";
  if (Array.isArray(skills)) {
    return skills
      .map((s) => (typeof s === "string" ? s : s?.name ?? ""))
      .filter(Boolean)
      .join(", ");
  }
  return String(skills);
}

const normalizeJob = (raw) => {
  if (!raw) return null;
  const salaryMin = raw.salary_min ?? raw.salaryMin;
  const salaryMax = raw.salary_max ?? raw.salaryMax;
  const emp = raw.employment_type ?? raw.employmentType ?? "";
  const employmentType = String(emp).replace(/_/g, "-");
  let salaryRange = raw.salary_range ?? raw.salaryRange ?? null;
  if (!salaryRange && (salaryMin != null || salaryMax != null)) {
    const min = salaryMin != null ? Number(salaryMin).toLocaleString() : "?";
    const max = salaryMax != null ? Number(salaryMax).toLocaleString() : "?";
    salaryRange = `$${min} - $${max}`;
  }
  return {
    id: raw.id,
    jobTitle: raw.job_title ?? raw.jobTitle,
    companyName: raw.company_name ?? raw.companyName,
    location: raw.location,
    employmentType: employmentType || raw.employmentType || "",
    salaryRange,
    salaryMin: raw.salary_min ?? raw.salaryMin,
    salaryMax: raw.salary_max ?? raw.salaryMax,
    jobDescription: raw.job_description ?? raw.jobDescription,
    requirements: raw.requirements,
    skills: skillsToLabelString(raw.skills, raw.required_skills),
    remoteOption: raw.is_remote ?? raw.remoteOption ?? false,
    postedDate: raw.posted_date ?? raw.created_at ?? raw.postedDate,
    applicationDeadline: raw.application_deadline ?? raw.applicationDeadline,
  };
};

const Search_job = () => {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [applicationError, setApplicationError] = useState("");
  const [applicationData, setApplicationData] = useState({
    fullName: "",
    email: "",
    phone: "",
    coverLetter: "",
    resumeUrl: "",
    resume: null,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [jobTypeFilter, setJobTypeFilter] = useState("");
  const [salaryFilter, setSalaryFilter] = useState("");
  const [searchParams, setSearchParams] = useState({ search: "", location: "", employment_type: "" });
  const [loadError, setLoadError] = useState("");

  const fetchJobs = useCallback(async (params) => {
    try {
      setLoading(true);
      setLoadError("");
      const q = new URLSearchParams();
      if (params.search) q.set("search", params.search);
      if (params.location) q.set("location", params.location);
      if (params.employment_type) q.set("employment_type", params.employment_type);
      const url = `${getApiUrl(API_CONFIG.ENDPOINTS.JOBS)}?${q.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Jobs API returned ${response.status}`);
      }
      const data = await response.json();
      const results = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
      const normalized = results.map(normalizeJob).filter(Boolean);
      setJobs(normalized);
      setFilteredJobs(normalized);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setJobs([]);
      setFilteredJobs([]);
      setLoadError(
        error.message?.includes("fetch") || error.message?.includes("Failed")
          ? `Cannot reach the API at ${getApiUrl("")}. Start the Django backend: run "python manage.py runserver" in your Back_Back folder, then refresh this page.`
          : error.message || "Failed to load jobs."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs(searchParams);
  }, [searchParams, fetchJobs]);

  const handleSearchClick = () => {
    setSearchParams({
      search: searchQuery.trim(),
      location: locationFilter.trim(),
      employment_type: jobTypeFilter ? jobTypeFilter.replace("-", "_") : "",
    });
  };

  // Client-side filter by salary only (search/location/employment are sent to API)
  useEffect(() => {
    if (!salaryFilter) {
      setFilteredJobs(jobs);
      return;
    }
    const filtered = jobs.filter((job) => {
      const min = job.salaryMin != null ? Number(job.salaryMin) : null;
      const max = job.salaryMax != null ? Number(job.salaryMax) : null;
      const mid = min != null && max != null ? (min + max) / 2 : null;
      if (salaryFilter === "high") return mid != null && mid >= 120000;
      if (salaryFilter === "medium") return mid != null && mid >= 80000 && mid < 120000;
      if (salaryFilter === "entry") return mid != null && mid < 80000;
      return true;
    });
    setFilteredJobs(filtered);
  }, [salaryFilter, jobs]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleViewDetails = (job) => {
    setSelectedJob(job);
    setShowModal(true);
  };

  const handleApply = (job) => {
    setSelectedJob(job);
    setShowApplicationModal(true);
  };

  const handleApplicationChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "resume") {
      setApplicationData({ ...applicationData, resume: files[0] });
    } else {
      setApplicationData({ ...applicationData, [name]: value });
    }
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    setApplicationError("");
    try {
      const payload = {
        job_id: selectedJob.id,
        cover_letter: applicationData.coverLetter.trim(),
        resume_url: applicationData.resumeUrl.trim() || undefined,
      };
      const response = await fetchWithAuth(getApiUrl(API_CONFIG.ENDPOINTS.JOBS_APPLICATIONS), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.detail || errData.message || errData.error || `Application failed (${response.status})`
        );
      }
      alert(`Application submitted successfully for ${selectedJob.jobTitle} at ${selectedJob.companyName}!`);
      setApplicationData({
        fullName: "",
        email: "",
        phone: "",
        coverLetter: "",
        resumeUrl: "",
        resume: null,
      });
      setShowApplicationModal(false);
      setSelectedJob(null);
    } catch (error) {
      console.error("Error submitting application:", error);
      setApplicationError(error.message || "Failed to submit application. Please try again.");
    }
  };

  const formatDate = (dateString) => {
    if (dateString == null || dateString === "") return "—";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loadError && (
          <div className="mb-6 p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 text-sm">
            <p className="font-semibold mb-2">Could not load jobs from your database</p>
            <p className="mb-3">{loadError}</p>
            <button
              type="button"
              onClick={() => fetchJobs(searchParams)}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Find Your Dream Job</h1>
          <p className="text-gray-600">Discover opportunities that match your skills and career goals</p>
        </div>

        {/* Search and Filters Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Search jobs, companies, skills, or location..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleSearchClick}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 font-semibold"
              >
                Search
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Location</label>
              <input
                type="text"
                placeholder="City, State or Remote"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Job Type</label>
              <select
                value={jobTypeFilter}
                onChange={(e) => setJobTypeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="temporary">Temporary</option>
                <option value="internship">Internship</option>
                <option value="freelance">Freelance</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Salary Range</label>
              <select
                value={salaryFilter}
                onChange={(e) => setSalaryFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Ranges</option>
                <option value="entry">Entry Level ($50k - $80k)</option>
                <option value="medium">Mid Level ($80k - $120k)</option>
                <option value="high">Senior Level ($120k+)</option>
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchQuery || locationFilter || jobTypeFilter || salaryFilter) && (
            <div className="mt-4">
              <button
                onClick={() => {
                  setSearchQuery("");
                  setLocationFilter("");
                  setJobTypeFilter("");
                  setSalaryFilter("");
                }}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-600">
            {loading
              ? "Loading jobs..."
              : loadError
                ? "0 jobs (API unavailable)"
                : `Found ${filteredJobs.length} job${filteredJobs.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Job Listings */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading job opportunities...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <p className="text-xl text-gray-600 mb-2">
              {loadError ? "No jobs loaded" : "No jobs found"}
            </p>
            <p className="text-gray-500">
              {loadError
                ? "Fix the connection above, or check that jobs exist in the database and the API URL in your frontend config matches the backend."
                : "Try adjusting your search criteria or filters"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-200"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{job.jobTitle}</h2>
                    <p className="text-lg text-blue-600 font-semibold mb-3">{job.companyName}</p>
                    
                    <div className="flex flex-wrap gap-4 mb-4">
                      <div className="flex items-center text-gray-600">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{job.location}</span>
                        {job.remoteOption && (
                          <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded text-sm">Remote</span>
                        )}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="capitalize">
                          {(job.employmentType || "").replace(/-/g, " ")}
                        </span>
                      </div>
                      {job.salaryRange && (
                        <div className="flex items-center text-gray-600">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{job.salaryRange}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-gray-600 mb-4 line-clamp-2">{job.jobDescription}</p>

                    {job.skills && String(job.skills).trim() !== "" && (
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Required Skills:</p>
                        <div className="flex flex-wrap gap-2">
                          {String(job.skills)
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean)
                            .slice(0, 5)
                            .map((skill, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                              >
                                {skill}
                              </span>
                            ))}
                          {String(job.skills).split(",").filter((s) => s.trim()).length > 5 && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                              +
                              {String(job.skills).split(",").filter((s) => s.trim()).length - 5}{" "}
                              more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center text-sm text-gray-500">
                      <span>Posted: {formatDate(job.postedDate)}</span>
                      {job.applicationDeadline && (
                        <span className="ml-4">Deadline: {formatDate(job.applicationDeadline)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 md:min-w-[200px]">
                    <button
                      onClick={() => handleViewDetails(job)}
                      className="px-6 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition duration-200 font-semibold"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleApply(job)}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 font-semibold"
                    >
                      Apply Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Job Details Modal */}
      {showModal && selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 sticky top-0 bg-white border-b">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800">{selectedJob.jobTitle}</h2>
                  <p className="text-xl text-blue-600 font-semibold mt-1">{selectedJob.companyName}</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-gray-600">📍 {selectedJob.location}</span>
                <span className="text-gray-600">💼 {selectedJob.employmentType}</span>
                {selectedJob.salaryRange && (
                  <span className="text-gray-600">💰 {selectedJob.salaryRange}</span>
                )}
                {selectedJob.remoteOption && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded">Remote</span>
                )}
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Job Description</h3>
                <p className="text-gray-600 whitespace-pre-line">{selectedJob.jobDescription}</p>
              </div>
              
              {selectedJob.requirements && (
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Requirements</h3>
                  <p className="text-gray-600 whitespace-pre-line">{selectedJob.requirements}</p>
                </div>
              )}

              {selectedJob.skills && String(selectedJob.skills).trim() !== "" && (
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {String(selectedJob.skills)
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t flex gap-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    handleApply(selectedJob);
                  }}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 font-semibold"
                >
                  Apply Now
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition duration-200 font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Application Modal */}
      {showApplicationModal && selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Apply for {selectedJob.jobTitle}</h2>
                  <p className="text-lg text-blue-600 font-semibold mt-1">{selectedJob.companyName}</p>
                </div>
                <button
                  onClick={() => {
                    setShowApplicationModal(false);
                    setSelectedJob(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmitApplication} className="p-6 space-y-4">
              {applicationError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {applicationError}
                </div>
              )}
              <div>
                <label htmlFor="fullName" className="block text-gray-700 font-semibold mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={applicationData.fullName}
                  onChange={handleApplicationChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-gray-700 font-semibold mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={applicationData.email}
                  onChange={handleApplicationChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="john.doe@example.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-gray-700 font-semibold mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={applicationData.phone}
                  onChange={handleApplicationChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label htmlFor="resumeUrl" className="block text-gray-700 font-semibold mb-2">
                  Resume/CV URL
                </label>
                <input
                  type="url"
                  id="resumeUrl"
                  name="resumeUrl"
                  value={applicationData.resumeUrl}
                  onChange={handleApplicationChange}
                  placeholder="https://... (link to your resume)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">Optional. Paste a link to your resume (e.g. Google Drive, LinkedIn, or your portfolio).</p>
              </div>

              <div>
                <label htmlFor="coverLetter" className="block text-gray-700 font-semibold mb-2">
                  Cover Letter <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="coverLetter"
                  name="coverLetter"
                  value={applicationData.coverLetter}
                  onChange={handleApplicationChange}
                  required
                  rows="6"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                  placeholder="Tell us why you're interested in this position and what makes you a great fit..."
                />
              </div>

              <div className="pt-4 border-t flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 font-semibold"
                >
                  Submit Application
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowApplicationModal(false);
                    setSelectedJob(null);
                  }}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition duration-200 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Search_job;
