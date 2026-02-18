import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../config/api';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

    // state for data
    const [formData, setformData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        
    }); 

    //states for errors
    const [errors, setErrors] = useState("");


    //Handle input changes
    const handleChange = (e) => {
      setformData({
        ...formData,
        [e.target.id]: e.target.value
      });
      setErrors("");    //clear errors on input change
    };


    //validation function
    const validateForm = () => {
      const { username, email, password, confirmPassword } = formData;
      if (!username || !email || !password || !confirmPassword) {
        setErrors("All fields are required");
        return false;
      }
      if (password !== confirmPassword){
        setErrors("Passwords donot match");
        return false;
      }
      return true;
    };

    //handle form submission
    const handlesubmit = async(e) =>{
      e.preventDefault();
      if (!validateForm()){
        return;   //stop submission if validation fails
    }

    try{
      const requestData = {
        username: formData.username,
        email: formData.email,
        password: formData.password
      };
      
      console.log('Sending registration request to:', getApiUrl('/api/register/'));
      console.log('Request data:', { ...requestData, password: '***' }); // Don't log actual password
      
      const response = await fetch(getApiUrl('/api/register/'), {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
      if(response.ok){
        const data = await response.json();
        console.log('registration sucessful:', data);
        // Auto-login after registration
        login({
          username: formData.username,
          email: formData.email,
          id: data.user?.id || data.id,
          role: data.user?.role || data.role || 'user',
          is_verified: data.user?.is_verified || data.is_verified || false
        });
        alert("*Successfully Registered*")
        navigate('/home');    //redirect to home on success.

      }else{
        // Handle different HTTP status codes
        let errorMessage = "Registration failed. Please try again.";
        
        if (response.status === 404) {
          errorMessage = "API endpoint not found. Please check:\n1. Backend server is running on http://localhost:8000\n2. The endpoint '/api/register/' exists\n3. Check your backend URL configuration";
        } else if (response.status === 500) {
          // Try to get detailed error from backend
          try {
            const errorData = await response.json();
            console.error('Backend error details:', errorData);
            errorMessage = errorData.message || errorData.error || errorData.detail || 
                          errorData.error_message || "Server error. Please check backend logs.";
          } catch (parseError) {
            console.error('Could not parse error response:', parseError);
            errorMessage = "Server error (500). Please check:\n1. Backend server logs for details\n2. Database connection is working\n3. All required fields are being sent correctly";
          }
        } else if (response.status === 400) {
          // Bad request - try to get validation errors
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorData.detail || errorMessage;
            
            // Handle specific field errors
            if (errorData.username) {
              errorMessage = `Username: ${Array.isArray(errorData.username) ? errorData.username[0] : errorData.username}`;
            } else if (errorData.email) {
              errorMessage = `Email: ${Array.isArray(errorData.email) ? errorData.email[0] : errorData.email}`;
            } else if (errorData.password) {
              errorMessage = `Password: ${Array.isArray(errorData.password) ? errorData.password[0] : errorData.password}`;
            } else if (typeof errorData === 'object') {
              // Try to extract first error message
              const firstError = Object.values(errorData)[0];
              if (Array.isArray(firstError)) {
                errorMessage = firstError[0];
              } else if (typeof firstError === 'string') {
                errorMessage = firstError;
              }
            }
          } catch (parseError) {
            errorMessage = "Invalid data. Please check your input and try again.";
          }
        } else {
          // Try to parse error response for other status codes
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorData.detail || response.statusText || errorMessage;
          } catch (parseError) {
            errorMessage = response.statusText || `Server error (${response.status})`;
          }
        }
        setErrors(errorMessage);
      }
    } catch(error) {
      console.error('Registration error:', error);
      
      // Handle specific network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setErrors("Cannot connect to server. Please make sure the backend is running on http://localhost:8000");
      } else if (error.message) {
        setErrors(`Error: ${error.message}`);
      } else {
        setErrors("Something went wrong. Please try again.");
      }
    }
  };
  
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-red-50 py-12 px-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Create Account</h1>
            <p className="text-gray-600">Join us and start building your career</p>
          </div>

          {/* Register Form */}
          <form 
            onSubmit={handlesubmit}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            {errors && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                {errors}
              </div>
            )}
            
            {/* Username Field */}
            <div className="mb-4">
              <label htmlFor="username" className="block text-gray-700 font-semibold mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input 
                  type="text" 
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" 
                  id="username" 
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            
            {/* Email Field */}
            <div className="mb-4">
              <label htmlFor="email" className="block text-gray-700 font-semibold mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input 
                  type="email" 
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" 
                  id="email" 
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="text-sm text-gray-500 mt-1">We'll never share your email with anyone else.</div>
            </div>
            
            {/* Password Field */}
            <div className="mb-4">
              <label htmlFor="password" className="block text-gray-700 font-semibold mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input 
                  type="password" 
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" 
                  id="password" 
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            
            {/* Confirm Password Field */}
            <div className="mb-6">
              <label htmlFor="confirmPassword" className="block text-gray-700 font-semibold mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <input 
                  type="password" 
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" 
                  id="confirmPassword" 
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Create Account
            </button>

            {/* Divider */}
            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="px-4 text-sm text-gray-500">OR</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            {/* Login Link */}
            <div className="text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-purple-600 hover:text-purple-800 font-semibold">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    );
}

export default Register;
