import React from "react";
import { useTranslation } from "react-i18next";
import bulb from "../assets/bulb.png";
import setting from "../assets/setting.png";
import expert from "../assets/expert.png";
import fbb from "../assets/fbb.webp";
import microsoft from "../assets/microsoft.png";
import ing from "../assets/ing.webp";
import { useNavigate } from "react-router-dom";
import resumePreview from "../assets/resume-preview.png";
import aiResumeFeedback from "../assets/ai-resume-feedback.png";
import genericVsTailored from "../assets/generic-vs-tailored.png";

const Paragraph = () => {
  const { t } = useTranslation();
  const Navigate = useNavigate();

  const handletryourresumeclick = () => {
    Navigate("/create_cv");
  };
  const handlefindyourjobclick = () => {
    Navigate("/find_job");
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-16 relative overflow-hidden">
      {/* AI Animated Background Elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-blue-200 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob"></div>
      <div className="absolute top-20 right-20 w-40 h-40 bg-purple-200 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-10 left-1/4 w-36 h-36 bg-pink-200 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob animation-delay-4000"></div>

      {/* AI Features Badge */}
      <div className="max-w-7xl mx-auto px-4 mb-8">
        <div className="flex flex-wrap justify-center gap-3">
          <div className="bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-md flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <span className="text-sm font-semibold text-gray-700">{t("home.aiPowered")}</span>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-md flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <span className="text-sm font-semibold text-gray-700">{t("home.instantAnalysis")}</span>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-md flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <span className="text-sm font-semibold text-gray-700">{t("home.smartMatching")}</span>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-md flex items-center gap-2">
            <span className="text-2xl">✨</span>
            <span className="text-sm font-semibold text-gray-700">{t("home.autoEnhance")}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
        <h1 className="font-bold text-5xl lg:text-6xl text-gray-800 mb-6">
          <span className="block">{t("home.heroTitle")}</span>
          <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mt-2">
            {t("home.heroSubtitle")}
          </span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          {t("home.heroDesc")}
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button 
            className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full text-lg font-semibold text-gray-800 hover:from-yellow-500 hover:to-yellow-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105" 
            onClick={handletryourresumeclick}
          >
            {t("home.tryResumeBuilder")}
          </button>
          <button 
            className="px-8 py-4 bg-white border-2 border-gray-300 rounded-full text-lg font-semibold text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-all duration-300 shadow-md hover:shadow-lg" 
            onClick={handlefindyourjobclick}
          >
            {t("home.findJobs")}
          </button>
        </div>
      </div>

      {/* Job Recommendations Section */}
      <div className="max-w-7xl mx-auto px-4 mt-12 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h2 className="text-xl md:text-2xl font-semibold text-gray-700">
              {t("home.recommendedJobs")}
            </h2>
          </div>
          <p className="text-sm text-gray-500 max-w-2xl mx-auto">
            {t("home.opportunitiesTailored")}
          </p>
        </div>

        {/* Recommended Jobs Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {[
            {
              id: 1,
              title: "Senior Full Stack Developer",
              company: "TechCorp Solutions",
              location: "San Francisco, CA",
              type: "Full-time",
              salary: "$120k - $160k",
              match: "95%",
              skills: ["React", "Node.js", "AWS"],
              remote: true,
              posted: "2 days ago",
              urgent: false
            },
            {
              id: 2,
              title: "UX/UI Designer",
              company: "Creative Studio",
              location: "New York, NY",
              type: "Full-time",
              salary: "$85k - $110k",
              match: "88%",
              skills: ["Figma", "User Research", "Prototyping"],
              remote: true,
              posted: "1 day ago",
              urgent: true
            },
            {
              id: 3,
              title: "Data Scientist",
              company: "Analytics Pro",
              location: "Remote",
              type: "Full-time",
              salary: "$100k - $140k",
              match: "92%",
              skills: ["Python", "Machine Learning", "SQL"],
              remote: true,
              posted: "3 days ago",
              urgent: false
            }
          ].map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition-all duration-300 border border-gray-200 relative group cursor-pointer"
              onClick={() => Navigate('/search_job')}
            >
              {/* Match Badge */}
              <div className="absolute top-3 right-3">
                <div className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                  {job.match} Match
                </div>
              </div>

              {/* Urgent Badge */}
              {job.urgent && (
                <div className="absolute top-3 left-3">
                  <div className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                    <span>🔥</span>
                    Urgent
                  </div>
                </div>
              )}

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">
                  {job.title}
                </h3>
                <p className="text-blue-600 text-sm font-medium mb-2">{job.company}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  <div className="flex items-center gap-1 text-gray-600 text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {job.location}
                  </div>
                  {job.remote && (
                    <div className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Remote
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-600 text-sm">{job.type}</span>
                  <span className="text-green-600 font-semibold">{job.salary}</span>
                </div>

                {/* Skills Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {job.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-gray-400 text-xs">Posted {job.posted}</span>
                  <div className="flex items-center gap-1 text-blue-600 text-xs font-medium group-hover:gap-1.5 transition-all">
                    <span>View</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Jobs Button */}
        <div className="text-center">
          <button
            onClick={() => Navigate('/search_job')}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all duration-300 flex items-center gap-2 mx-auto"
          >
            <span>{t("home.viewAllJobs")}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 mt-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <img className="w-10 h-10" src={setting} alt="setting" />
            </div>
            <h2 className="font-bold text-xl mb-2 text-gray-800">{t("home.cuttingEdgeTools")}</h2>
            <p className="text-gray-600">
              {t("home.cuttingEdgeDesc")}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <img className="w-10 h-10" src={bulb} alt="bulb" />
            </div>
            <h2 className="font-bold text-xl mb-2 text-gray-800">{t("home.extensiveExperience")}</h2>
            <p className="text-gray-600">
              {t("home.extensiveDesc")}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <img className="w-10 h-10" src={expert} alt="expert" />
            </div>
            <h2 className="font-bold text-xl mb-2 text-gray-800">{t("home.expertGuides")}</h2>
            <p className="text-gray-600">
              {t("home.expertDesc")}
            </p>
          </div>
        </div>
      </div>

      {/* AI-Powered Feedback Section */}
      <div className="max-w-7xl mx-auto px-4 mt-16">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col lg:flex-row items-center gap-8 p-8">
          <div className="flex-1">
            <h2 className="font-bold text-3xl lg:text-4xl text-gray-800 mb-4">
              {t("home.aiFeedbackTitle")}
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              {t("home.aiFeedbackDesc")}
            </p>
            <button
              onClick={() => Navigate('/cv-grade')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
            >
              {t("home.gradeYourCv")}
            </button>
          </div>
          <div className="flex-1 max-w-lg">
            <img src={aiResumeFeedback} alt="AI-powered resume analysis" className="w-full h-auto rounded-xl" />
          </div>
        </div>
      </div>

      {/* Visual story: one cohesive section (was two stacked full-bleed images) */}
      <div className="max-w-7xl mx-auto px-4 mt-20 mb-4">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="font-bold text-3xl lg:text-4xl text-gray-800 mb-4">
            {t("home.whyTailoredWin")}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            {t("home.whyTailoredDesc")}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 items-stretch">
          <figure className="flex flex-col bg-white rounded-2xl shadow-lg border border-gray-100/80 overflow-hidden ring-1 ring-gray-100">
            <figcaption className="px-5 py-4 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100 text-left">
              <h3 className="font-semibold text-gray-900">{t("home.visualStoryLeftTitle")}</h3>
              <p className="text-sm text-gray-500 mt-1 leading-snug">{t("home.visualStoryLeftCaption")}</p>
            </figcaption>
            <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-white min-h-[220px]">
              <img
                src={genericVsTailored}
                alt="Illustration comparing generic and tailored job applications"
                className="w-full max-h-[min(420px,45vh)] object-contain rounded-lg"
              />
            </div>
          </figure>

          <figure className="flex flex-col bg-white rounded-2xl shadow-lg border border-gray-100/80 overflow-hidden ring-1 ring-gray-100">
            <div className="flex-1 flex items-center justify-center p-4 sm:p-6 sm:pt-8 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 min-h-[220px]">
              <img
                src={resumePreview}
                alt="Professional resume template preview"
                className="w-full max-h-[min(420px,45vh)] object-contain rounded-lg shadow-sm"
              />
            </div>
          </figure>
        </div>
      </div>

      {/* Companies Section */}
      <div className="bg-gray-100 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-gray-600 mb-6 text-sm">
            {t("home.ourCustomersHired")}
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8">
            <div className="flex flex-col items-center">
              <img className="w-16 h-16 rounded-full object-cover" src={fbb} alt="Facebook" />
              <p className="mt-2 font-medium text-gray-700">Facebook</p>
            </div>
            <div className="flex flex-col items-center">
              <img className="w-16 h-16 rounded-full object-cover" src={microsoft} alt="Microsoft" />
              <p className="mt-2 font-medium text-gray-700">Microsoft</p>
            </div>
            <div className="flex flex-col items-center">
              <img className="w-16 h-16 rounded-full object-cover" src={ing} alt="ING" />
              <p className="mt-2 font-medium text-gray-700">ING</p>
            </div>
          </div>
        </div>
      </div>
      {/* About Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="font-bold text-4xl lg:text-5xl text-gray-800 mb-6">
            {t("home.whatIsAnsari")}
          </h2>
          <div className="max-w-3xl mx-auto space-y-4 text-lg text-gray-600 leading-relaxed">
            <p>{t("home.whatIsAnsariDesc1")}</p>
            <p>{t("home.whatIsAnsariDesc2")}</p>
            <p>{t("home.whatIsAnsariDesc3")}</p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mt-12">
          <div className="text-center">
            <p className="text-4xl font-bold text-blue-600 mb-2">41M+</p>
            <p className="text-sm text-gray-600">Job applications created</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-blue-600 mb-2">1400M+</p>
            <p className="text-sm text-gray-600">Free career guides</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-blue-600 mb-2">40M+</p>
            <p className="text-sm text-gray-600">Readers a year</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-blue-600 mb-2">30+</p>
            <p className="text-sm text-gray-600">Career Experts</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-blue-600 mb-2">10+</p>
            <p className="text-sm text-gray-600">Years in business</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-blue-600 mb-2">1000+</p>
            <p className="text-sm text-gray-600">Media mentions</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Paragraph;
