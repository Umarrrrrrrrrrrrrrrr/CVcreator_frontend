import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(!isAuthenticated);

  const handleLogin = () => {
    setShowModal(false);
    navigate('/login');
  };

  const handleRegister = () => {
    setShowModal(false);
    navigate('/register');
  };

  const handleSkip = () => {
    setShowModal(false);
    // Allow access without login
  };

  if (isAuthenticated) {
    return children;
  }

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Login Required</h2>
              <p className="text-gray-600">
                Please login or register to access this feature. You can also continue as a guest.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleLogin}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Login
              </button>
              <button
                onClick={handleRegister}
                className="w-full bg-white border-2 border-blue-600 text-blue-600 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-all duration-300"
              >
                Register
              </button>
              <button
                onClick={handleSkip}
                className="w-full text-gray-600 py-2 rounded-lg font-medium hover:text-gray-800 transition-colors"
              >
                Continue as Guest
              </button>
            </div>
          </div>
        </div>
      )}
      {!showModal && children}
    </>
  );
};

export default ProtectedRoute;
