import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const GradingSystem = () => {
  const navigate = useNavigate();
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [animatedMetrics, setAnimatedMetrics] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    // Trigger animation when component mounts
    const timer = setTimeout(() => {
      setAnimatedMetrics(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const gradingFeatures = [
    {
      id: 1,
      title: "AI-Powered CV Analysis",
      icon: "🤖",
      description: "Get instant AI-powered analysis of your resume with detailed scoring and improvement suggestions.",
      score: "0-100",
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-50",
      iconBg: "bg-blue-100",
      features: [
        "ATS Compatibility Check",
        "Keyword Optimization",
        "Format Analysis",
        "Content Quality Score"
      ]
    },
    {
      id: 2,
      title: "Resume Grading & Scoring",
      icon: "⭐",
      description: "Comprehensive grading system that evaluates your CV across multiple dimensions.",
      score: "A+ to F",
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-50",
      iconBg: "bg-purple-100",
      features: [
        "Overall Grade Calculation",
        "Section-wise Scoring",
        "Industry Benchmarking",
        "Improvement Roadmap"
      ]
    },
    {
      id: 3,
      title: "Job Match Scoring",
      icon: "🎯",
      description: "See how well your resume matches specific job postings with percentage compatibility.",
      score: "0-100%",
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-50",
      iconBg: "bg-green-100",
      features: [
        "Job Description Matching",
        "Skill Alignment Score",
        "Experience Relevance",
        "Cultural Fit Analysis"
      ]
    },
    {
      id: 4,
      title: "Real-time Feedback",
      icon: "💬",
      description: "Receive instant, actionable feedback to improve your resume quality and job prospects.",
      score: "Live",
      color: "from-orange-500 to-red-500",
      bgColor: "bg-orange-50",
      iconBg: "bg-orange-100",
      features: [
        "Live Editing Suggestions",
        "Grammar & Spell Check",
        "Style Recommendations",
        "Best Practice Tips"
      ]
    }
  ];

  const gradingMetrics = [
    { label: "Content Quality", value: 85, color: "bg-blue-500" },
    { label: "Format & Design", value: 92, color: "bg-purple-500" },
    { label: "ATS Compatibility", value: 78, color: "bg-green-500" },
    { label: "Keyword Optimization", value: 88, color: "bg-orange-500" },
    { label: "Industry Relevance", value: 90, color: "bg-pink-500" }
  ];

  // PDF Upload Handler
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setUploadedFile(selectedFile);
    } else {
      alert("Please upload a valid PDF file");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const selectedFile = e.dataTransfer.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setUploadedFile(selectedFile);
    } else {
      alert("Please upload a valid PDF file");
    }
  };

  const handleClear = () => {
    setUploadedFile(null);
    setIsAnalyzing(false);
  };

  const handleAnalyze = () => {
    if (uploadedFile) {
      setIsAnalyzing(true);
      // Simulate analysis
      setTimeout(() => {
        setIsAnalyzing(false);
        // Could navigate to results page or show results
      }, 2000);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-20 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-0 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h2 className="text-5xl lg:text-6xl font-bold text-gray-800 mb-4 animate-fade-in">
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Intelligent Grading System
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Advanced AI-powered resume evaluation and grading system that helps you create job-winning CVs
          </p>
        </div>

        {/* Main Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {gradingFeatures.map((feature, index) => (
            <div
              key={feature.id}
              className={`${feature.bgColor} rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-transparent hover:border-${feature.color.split('-')[1]}-300`}
              onMouseEnter={() => setHoveredFeature(feature.id)}
              onMouseLeave={() => setHoveredFeature(null)}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={`${feature.iconBg} w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0`}>
                  {feature.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-bold text-gray-800">{feature.title}</h3>
                    <span className={`bg-gradient-to-r ${feature.color} text-white px-4 py-1 rounded-full text-sm font-semibold`}>
                      {feature.score}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4">{feature.description}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                {feature.features.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-gray-700">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {hoveredFeature === feature.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => navigate('/create_cv')}
                    className={`w-full bg-gradient-to-r ${feature.color} text-white py-3 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-300`}
                  >
                    Try {feature.title} →
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Grading Metrics Visualization */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-16 transform hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-gray-800">
              Live Grading Metrics
            </h3>
          </div>
          <div className="space-y-6">
            {gradingMetrics.map((metric, index) => (
              <div key={index} className="space-y-2 group">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">
                    {metric.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800">{metric.value}%</span>
                    {metric.value >= 90 && (
                      <span className="text-green-500 font-bold">✓ Excellent</span>
                    )}
                    {metric.value >= 75 && metric.value < 90 && (
                      <span className="text-blue-500 font-bold">✓ Good</span>
                    )}
                    {metric.value < 75 && (
                      <span className="text-orange-500 font-bold">⚠ Needs Improvement</span>
                    )}
                  </div>
                </div>
                <div className="w-full h-5 bg-gray-200 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full ${metric.color} rounded-full transition-all duration-1000 ease-out relative`}
                    style={{ 
                      width: animatedMetrics ? `${metric.value}%` : '0%',
                      transitionDelay: `${index * 100}ms`
                    }}
                  >
                    <div className="absolute inset-0 bg-white bg-opacity-30 animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <div className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-center gap-2 mb-2">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <div className="text-5xl font-bold">A+</div>
              </div>
              <div className="text-xl font-semibold">Overall Grade</div>
              <div className="text-sm mt-2 opacity-90">Based on 5 Key Metrics</div>
            </div>
          </div>
        </div>

        {/* PDF Uploader Section */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10 mb-16 border-2 border-blue-100">
          <div className="text-center mb-8">
            <div className="inline-block mb-4">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
            </div>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
              Upload Your Resume for Grading
            </h3>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Upload your existing PDF resume or create a new one to get instant AI-powered analysis and grading
            </p>
          </div>

          {/* Drag & Drop Zone */}
          <div
            className={`relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300 ${
              isDragging
                ? 'border-blue-500 bg-blue-50 scale-105'
                : uploadedFile
                ? 'border-green-400 bg-green-50'
                : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !uploadedFile && document.getElementById("pdfInput").click()}
          >
            {!uploadedFile ? (
              <div className="text-center cursor-pointer">
                <div className="mb-6">
                  <svg className="w-20 h-20 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h4 className="text-2xl font-bold text-gray-700 mb-2">
                  {isDragging ? 'Drop your PDF here' : 'Drag & Drop your PDF Resume'}
                </h4>
                <p className="text-gray-500 mb-4">
                  or <span className="text-blue-600 font-semibold">click to browse</span>
                </p>
                <p className="text-sm text-gray-400">
                  Supported format: PDF (Max size: 10MB)
                </p>
                <input
                  type="file"
                  id="pdfInput"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              <div className="text-center">
                <div className="mb-6">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-lg max-w-md mx-auto mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-800">{uploadedFile.name}</p>
                        <p className="text-sm text-gray-500">
                          {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClear();
                      }}
                      className="text-red-500 hover:text-red-700 transition-colors p-2"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className={`px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 shadow-lg transform hover:scale-105 ${
                    isAnalyzing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                  }`}
                >
                  {isAnalyzing ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analyzing Resume...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      Analyze & Grade Resume
                    </span>
                  )}
                </button>
                <p className="text-sm text-gray-500 mt-4">
                  Or <button onClick={handleClear} className="text-blue-600 hover:text-blue-800 font-semibold">upload a different file</button>
                </p>
              </div>
            )}
          </div>

          {/* Alternative Options */}
          {!uploadedFile && (
            <div className="mt-8 text-center">
              <p className="text-gray-600 mb-4">Don't have a resume yet?</p>
              <button
                onClick={() => navigate('/create_cv')}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                Create a New Resume →
              </button>
            </div>
          )}
        </div>

        {/* How It Works Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-2xl p-8 md:p-12 text-white">
          <h3 className="text-4xl font-bold mb-8 text-center">How Our Grading System Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Upload CV", desc: "Upload your resume or create one using our builder" },
              { step: "2", title: "AI Analysis", desc: "Our AI analyzes your CV across multiple dimensions" },
              { step: "3", title: "Get Scores", desc: "Receive detailed scores and grades for each section" },
              { step: "4", title: "Improve", desc: "Follow suggestions to improve your CV quality" }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h4 className="text-xl font-bold mb-2">{item.title}</h4>
                <p className="text-blue-100">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <h3 className="text-3xl font-bold text-gray-800 mb-4">
            Ready to Get Your CV Graded?
          </h3>
          <p className="text-gray-600 mb-8 text-lg">
            Create a professional CV and get instant AI-powered feedback and grading
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => navigate('/create_cv')}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Start Grading Your CV
            </button>
            <button
              onClick={() => navigate('/search_job')}
              className="px-8 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-full text-lg font-semibold hover:border-blue-500 hover:text-blue-600 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              View Job Matches
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GradingSystem;
