import React, { useState, useEffect } from "react";
import Logo from "../assets/logoo.png";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const PROFILE_PHOTO_KEY = "userProfile_photo";

const Navbar = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isGuest, logout } = useAuth();
  const canAccessApp = isAuthenticated || isGuest;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);

  useEffect(() => {
    setProfilePhoto(localStorage.getItem(PROFILE_PHOTO_KEY));
  }, [canAccessApp]);

  useEffect(() => {
    const handlePhotoUpdate = () => setProfilePhoto(localStorage.getItem(PROFILE_PHOTO_KEY));
    window.addEventListener("profilePhotoUpdated", handlePhotoUpdate);
    return () => window.removeEventListener("profilePhotoUpdated", handlePhotoUpdate);
  }, []);

  const projectLinks = [
    { label: "Home", path: "/" },
    { label: "Contact Support", path: "/contact-support" },
    { label: "About", path: "/#about" },
  ];

  const appLinks = [
    { label: "Templates", path: "/choose_templates" },
    { label: "Find Jobs", path: "/find_job" },
  ];

  const handleNav = (path) => {
    setMobileMenuOpen(false);
    setAccountOpen(false);
    if (path.startsWith("/#")) {
      const hash = path.slice(2);
      if (window.location.pathname !== "/") navigate("/");
      setTimeout(() => {
        window.location.hash = hash;
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return;
    }
    if (path === "/contact-support") {
      navigate("/contact-support");
      return;
    }
    navigate(path);
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex-shrink-0 flex items-center">
            <img
              src={Logo}
              alt="Logo"
              className="h-16 w-auto cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate("/")}
            />
          </div>

          {/* Desktop: project info + app links (locked when not logged in) */}
          <div className="hidden md:flex md:items-center md:gap-1">
            {projectLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => handleNav(link.path)}
                className="px-4 py-2 text-gray-700 font-medium rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all duration-200"
              >
                {link.label}
              </button>
            ))}
            {appLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => handleNav(link.path)}
                title={!canAccessApp ? "Sign in to access" : undefined}
                className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
                  canAccessApp
                    ? "text-gray-700 font-medium hover:bg-blue-50 hover:text-blue-600"
                    : "text-gray-400 cursor-pointer hover:bg-gray-100 hover:text-gray-500"
                }`}
              >
                {!canAccessApp && (
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                )}
                {link.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex md:items-center md:gap-3">
            <div className="relative">
              <button
                onMouseEnter={() => setAccountOpen(true)}
                onClick={() => setAccountOpen(!accountOpen)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>My Account</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            {accountOpen && (
              <div
                className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50"
                onMouseLeave={() => setAccountOpen(false)}
              >
                {canAccessApp ? (
                  <>
                    <button onClick={() => handleNav("/profile")} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 text-left">Profile</button>
                    <button onClick={() => handleNav("/cv-grade")} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 text-left">CV Grading</button>
                    <button onClick={() => handleNav("/payment")} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 text-left">Upgrade / Payment</button>
                    <hr className="my-2 border-gray-100" />
                    <button onClick={() => { logout(); handleNav("/"); }} className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left">Sign out</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleNav("/login")} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 text-left">Sign in</button>
                    <button onClick={() => handleNav("/register")} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 text-left">Register</button>
                  </>
                )}
              </div>
            )}
            </div>
            {canAccessApp && (
              <button
                onClick={() => handleNav("/profile")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                title="View your profile"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden border-2 border-gray-200">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                <span className="font-semibold text-gray-700">Profile</span>
              </button>
            )}
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {projectLinks.map((link) => (
              <button key={link.path} onClick={() => handleNav(link.path)} className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md font-medium">{link.label}</button>
            ))}
            {appLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => handleNav(link.path)}
                className={`block w-full text-left px-3 py-2 rounded-md font-medium flex items-center gap-2 ${
                  canAccessApp ? "text-gray-700 hover:bg-blue-50 hover:text-blue-600" : "text-gray-400 hover:bg-gray-100"
                }`}
              >
                {!canAccessApp && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>}
                {link.label}
              </button>
            ))}
            {!canAccessApp ? (
              <>
                <button onClick={() => handleNav("/login")} className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md font-medium">Sign in</button>
                <button onClick={() => handleNav("/register")} className="w-full mt-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2.5 rounded-lg font-semibold">Register</button>
              </>
            ) : (
              <>
                <button onClick={() => handleNav("/profile")} className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-blue-50 rounded-md font-medium">Profile</button>
                <button onClick={() => handleNav("/cv-grade")} className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-blue-50 rounded-md font-medium">CV Grading</button>
                <button onClick={() => handleNav("/payment")} className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-blue-50 rounded-md font-medium">Upgrade / Payment</button>
                <button onClick={() => { logout(); handleNav("/"); setMobileMenuOpen(false); }} className="block w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-md font-medium">Sign out</button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
