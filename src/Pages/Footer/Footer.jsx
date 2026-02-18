import React from "react";
import logoo from "../assets/logoo.png";
import x from "../assets/x.webp";
import fbb from "../assets/fbb.webp";
import link from "../assets/link.webp";
import { useNavigate } from "react-router-dom"; 

const Footer = () => {
  const navigate = useNavigate(); // Initialize navigate
  return (
    <div className="bg-gray-900 text-white">
      {/* Disclaimer */}
      <div className="bg-blue-900 py-3">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs text-blue-100 text-center">
            *The names and logos of the companies referred to above are all
            trademarks of their respective holders. Unless specifically stated
            otherwise, such references are not intended to imply any affiliation
            or association with Ansari.
          </p>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <img className="w-40 h-auto mb-4" src={logoo} alt="Logo" />
            <p className="text-gray-300 text-sm mb-6 max-w-xs">
              Ansari is a career site fueled by the best career experts and a
              community of millions of readers yearly. We share knowledge, tips, and
              tools to help everyone find their dream job.
            </p>
            <button 
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full h-12 px-6 text-black font-semibold hover:from-yellow-500 hover:to-yellow-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 mb-6"
              onClick={() => navigate("/create_cv")}
            >
              Create Your Resume
            </button>
            <div className="flex items-center space-x-4 mb-6">
              <a href="#" className="hover:opacity-80 transition-opacity">
                <img className="w-10 h-10" src={x} alt="Twitter" />
              </a>
              <a href="#" className="hover:opacity-80 transition-opacity">
                <img className="w-10 h-10 rounded-full" src={fbb} alt="Facebook" />
              </a>
              <a href="#" className="hover:opacity-80 transition-opacity">
                <img className="w-10 h-10 rounded-full" src={link} alt="LinkedIn" />
              </a>
            </div>
            <div className="space-y-2 text-sm">
              <p className="flex items-center">
                <span className="text-gray-400 mr-2">Call us:</span>
                <span className="text-white">0000-000-00</span>
              </p>
              <p className="flex items-center">
                <span className="text-gray-400 mr-2">Email:</span>
                <span className="text-white">umarismyname581@gmail.com</span>
              </p>
            </div>
          </div>

          {/* Resume Links */}
          <div>
            <h3 className="font-semibold text-gray-400 mb-4 uppercase text-xs">Resume</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">Resume Builder</a></li>
              <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">Resume Templates</a></li>
              <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">Resume Examples</a></li>
              <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">Resume Format</a></li>
              <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">How to write a Resume</a></li>
              <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">Resume Checker</a></li>
              <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">Resume Help</a></li>
            </ul>
          </div>

          {/* CV Links */}
          <div>
            <h3 className="font-semibold text-gray-400 mb-4 uppercase text-xs">CV</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">CV Builder</a></li>
              <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">CV Templates</a></li>
              <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">CV Examples</a></li>
              <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">CV Format</a></li>
              <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">How to write a CV</a></li>
              <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">CV Checker</a></li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="font-semibold text-gray-400 mb-4 uppercase text-xs">Support</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">About</a></li>
              <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">Contact</a></li>
              <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">FAQ</a></li>
              <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Language Selector */}
      <div className="border-t border-gray-800 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">CHOOSE YOUR REGION</p>
            <div className="flex flex-wrap gap-4 text-sm">
              {['English (IN)', 'English (UK)', 'English (US)', 'Deutsch', 'Espanol', 'Francais', 'Italiano', 'Polski', 'Portugues'].map((lang) => (
                <a key={lang} href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">
                  {lang}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-gray-800 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs text-gray-400 text-center">
            © 2024 Works Limited. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Footer;
