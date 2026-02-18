import React from 'react';
import Navbar from './Navbar/Navbar';
import Footer from "./Footer/Footer";
import { useNavigate } from 'react-router-dom';
// import temp7 from '../assets/temp7.png';

const Create_CV = () => {
  const navigate = useNavigate();

  const handleCreateResumeClick = () => {
    navigate('/choose_templates');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />

      {/* Main Section */}
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          
          {/* Left Side: Text Content */}
          <div className="w-full lg:w-1/2 space-y-6 text-center lg:text-left">
            <div className="space-y-4">
              <h1 className="font-bold text-5xl lg:text-6xl text-gray-800 leading-tight">
                Free Resume Builder: 
                <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Make Your Resume Fast
                </span>
              </h1>
              <p className="text-2xl text-gray-600 font-medium">
                Free to use. Developed by hiring professionals.
              </p>
              <p className="text-lg text-gray-500 leading-relaxed">
                Hassle-free resume maker that can help you land your dream job in any industry.
                Trusted by job seekers and HR experts. Build your resume quickly and easily today.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-14 px-8 rounded-full text-lg font-semibold text-gray-800 hover:from-yellow-500 hover:to-yellow-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center"
                onClick={handleCreateResumeClick}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Your Resume Now
              </button>
              <button
                className="h-14 px-8 rounded-full text-lg font-semibold text-gray-700 border-2 border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all duration-300 flex items-center justify-center"
                onClick={() => navigate('/choose_templates')}
              >
                View Templates
              </button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8">
              <div className="flex items-center space-x-2">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-600">100% Free</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-600">Professional Templates</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-600">Easy to Use</span>
              </div>
            </div>
          </div>

          {/* Right Side: Visual Element */}
          <div className="w-full lg:w-1/2 flex justify-center lg:justify-end">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-3xl transform rotate-6 opacity-20"></div>
              <div className="relative bg-white rounded-3xl shadow-2xl p-8 transform -rotate-2 hover:rotate-0 transition-transform duration-300">
                <div className="space-y-4">
                  <div className="h-4 bg-blue-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-blue-200 rounded w-2/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                  <div className="h-4 bg-blue-200 rounded w-1/3"></div>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex space-x-4">
                    <div className="h-16 w-16 bg-blue-100 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Create_CV;
