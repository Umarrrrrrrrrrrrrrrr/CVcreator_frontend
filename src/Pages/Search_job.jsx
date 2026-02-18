import React, { useEffect, useState } from "react";
import Naavbar from "./Naavbar";

const Search_job = () => {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [applicationData, setApplicationData] = useState({
    fullName: '',
    email: '',
    phone: '',
    coverLetter: '',
    resume: null
  });

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [jobTypeFilter, setJobTypeFilter] = useState("");
  const [salaryFilter, setSalaryFilter] = useState("");

  // Fetch jobs from backend API
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        // Update this endpoint to match your backend API for jobs
        const response = await fetch("http://127.0.0.1:8000/api/jobs/");
        
        if (!response.ok) {
          // If endpoint doesn't exist, use mock data for development
          console.warn("Jobs API endpoint not available, using mock data");
          const mockJobs = getMockJobs();
          setJobs(mockJobs);
          setFilteredJobs(mockJobs);
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        setJobs(data);
        setFilteredJobs(data);
      } catch (error) {
        console.error("Error fetching jobs:", error);
        // Use mock data on error for development
        const mockJobs = getMockJobs();
        setJobs(mockJobs);
        setFilteredJobs(mockJobs);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  // Mock jobs data for development/testing
  const getMockJobs = () => [
    {
      id: 1,
      jobTitle: "Senior Software Engineer",
      companyName: "Tech Innovations Inc.",
      location: "San Francisco, CA",
      employmentType: "Full-time",
      salaryRange: "$120,000 - $160,000",
      jobDescription: "We are looking for an experienced Senior Software Engineer to join our dynamic team. You will be responsible for designing, developing, and maintaining scalable web applications.",
      requirements: "5+ years of experience in software development\nStrong knowledge of React, Node.js, and TypeScript\nExperience with cloud platforms (AWS, Azure)\nExcellent problem-solving skills",
      skills: "React, Node.js, TypeScript, AWS, PostgreSQL",
      remoteOption: true,
      postedDate: "2024-01-15",
      applicationDeadline: "2024-02-15"
    },
    {
      id: 2,
      jobTitle: "UX/UI Designer",
      companyName: "Creative Solutions",
      location: "New York, NY",
      employmentType: "Full-time",
      salaryRange: "$80,000 - $110,000",
      jobDescription: "Join our design team to create beautiful and intuitive user experiences. You'll work closely with product managers and developers to bring designs to life.",
      requirements: "3+ years of UX/UI design experience\nProficiency in Figma, Sketch, Adobe XD\nStrong portfolio demonstrating design skills\nUnderstanding of user research methodologies",
      skills: "Figma, Sketch, Adobe XD, User Research, Prototyping",
      remoteOption: false,
      postedDate: "2024-01-14",
      applicationDeadline: "2024-02-20"
    },
    {
      id: 3,
      jobTitle: "Data Scientist",
      companyName: "Analytics Pro",
      location: "Remote",
      employmentType: "Full-time",
      salaryRange: "$100,000 - $140,000",
      jobDescription: "We're seeking a talented Data Scientist to help us extract insights from complex datasets and build predictive models.",
      requirements: "Master's degree in Data Science or related field\n3+ years of experience in machine learning\nProficiency in Python, R, SQL\nExperience with TensorFlow or PyTorch",
      skills: "Python, R, SQL, Machine Learning, TensorFlow, Data Visualization",
      remoteOption: true,
      postedDate: "2024-01-13",
      applicationDeadline: "2024-02-10"
    },
    {
      id: 4,
      jobTitle: "Product Manager",
      companyName: "Innovate Tech",
      location: "Austin, TX",
      employmentType: "Full-time",
      salaryRange: "$110,000 - $150,000",
      jobDescription: "Lead product development initiatives and work with cross-functional teams to deliver innovative solutions.",
      requirements: "5+ years of product management experience\nStrong analytical and strategic thinking\nExcellent communication skills\nExperience with Agile methodologies",
      skills: "Product Strategy, Agile, Analytics, Roadmapping",
      remoteOption: true,
      postedDate: "2024-01-12",
      applicationDeadline: "2024-02-25"
    },
    {
      id: 5,
      jobTitle: "Marketing Specialist",
      companyName: "Digital Marketing Hub",
      location: "Los Angeles, CA",
      employmentType: "Full-time",
      salaryRange: "$60,000 - $85,000",
      jobDescription: "Develop and execute marketing campaigns across various channels to drive brand awareness and customer acquisition.",
      requirements: "2+ years of marketing experience\nKnowledge of SEO, SEM, and social media marketing\nStrong writing and communication skills\nExperience with marketing analytics tools",
      skills: "SEO, SEM, Social Media, Content Marketing, Google Analytics",
      remoteOption: false,
      postedDate: "2024-01-11",
      applicationDeadline: "2024-02-18"
    }
  ];

  // Filter jobs based on search and filters
  useEffect(() => {
    let filtered = jobs;

    // Search by job title, company name, or location
    if (searchQuery) {
      filtered = filtered.filter(job =>
        job.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.skills.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by location
    if (locationFilter) {
      filtered = filtered.filter(job =>
        job.location.toLowerCase().includes(locationFilter.toLowerCase()) ||
        (locationFilter.toLowerCase() === "remote" && job.remoteOption)
      );
    }

    // Filter by job type
    if (jobTypeFilter) {
      filtered = filtered.filter(job =>
        job.employmentType.toLowerCase() === jobTypeFilter.toLowerCase()
      );
    }

    // Filter by salary (simplified - you can enhance this)
    if (salaryFilter) {
      filtered = filtered.filter(job => {
        if (salaryFilter === "high") {
          return job.salaryRange.includes("120") || job.salaryRange.includes("150") || job.salaryRange.includes("160");
        } else if (salaryFilter === "medium") {
          return job.salaryRange.includes("80") || job.salaryRange.includes("100") || job.salaryRange.includes("110");
        } else if (salaryFilter === "entry") {
          return job.salaryRange.includes("60") || job.salaryRange.includes("70");
        }
        return true;
      });
    }

    setFilteredJobs(filtered);
  }, [searchQuery, locationFilter, jobTypeFilter, salaryFilter, jobs]);

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
    
    try {
      // Here you would send the application to your backend
      // const formData = new FormData();
      // formData.append('jobId', selectedJob.id);
      // formData.append('fullName', applicationData.fullName);
      // formData.append('email', applicationData.email);
      // formData.append('phone', applicationData.phone);
      // formData.append('coverLetter', applicationData.coverLetter);
      // formData.append('resume', applicationData.resume);
      
      // const response = await fetch('http://127.0.0.1:8000/api/applications/', {
      //   method: 'POST',
      //   body: formData
      // });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert(`Application submitted successfully for ${selectedJob.jobTitle} at ${selectedJob.companyName}!`);
      
      // Reset form
      setApplicationData({
        fullName: '',
        email: '',
        phone: '',
        coverLetter: '',
        resume: null
      });
      
      setShowApplicationModal(false);
      setSelectedJob(null);
    } catch (error) {
      console.error("Error submitting application:", error);
      alert("Failed to submit application. Please try again.");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Naavbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
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
            {loading ? "Loading jobs..." : `Found ${filteredJobs.length} job${filteredJobs.length !== 1 ? 's' : ''}`}
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
            <p className="text-xl text-gray-600 mb-2">No jobs found</p>
            <p className="text-gray-500">Try adjusting your search criteria or filters</p>
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
                        <span className="capitalize">{job.employmentType.replace('-', ' ')}</span>
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

                    {job.skills && (
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Required Skills:</p>
                        <div className="flex flex-wrap gap-2">
                          {job.skills.split(',').slice(0, 5).map((skill, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                            >
                              {skill.trim()}
                            </span>
                          ))}
                          {job.skills.split(',').length > 5 && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                              +{job.skills.split(',').length - 5} more
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

              {selectedJob.skills && (
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.skills.split(',').map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full"
                      >
                        {skill.trim()}
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
                <label htmlFor="resume" className="block text-gray-700 font-semibold mb-2">
                  Resume/CV <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  id="resume"
                  name="resume"
                  onChange={handleApplicationChange}
                  required
                  accept=".pdf,.doc,.docx"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">Accepted formats: PDF, DOC, DOCX (Max 5MB)</p>
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
