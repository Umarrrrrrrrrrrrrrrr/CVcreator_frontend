import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const navigate = useNavigate();

    // stste for data
    const [formData, setformData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        terms: false
    }); 

    const handleChange = (e) => {
      setformData({
        ...formData,
        [e.target.id]: e.target.value
      });
    };

    
    const handlesubmit = async(e) =>{
      e.preventDefault();
      if (formData.password !== formData.confirmPassword){
        alert("password donot match");
        return;
    }

    try{
      const response = await fetch('http://localhost:8000/api/register/', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: formData.username,
        email: formData.email,
        password: formData.password
      })
    });
    
      
    
    
      if(response.ok){
        const data = await response.json();
        // return response.json();
        console.log('registration sucessful:', data);
        alert("*Sucessfully login*")
        navigate('/home');

      }else{
        const errorData = await response.json();
        // return response.json().then(err => {
          throw new Error(JSON.stringify(err));
        };
        
      }
    
    catch(error) {
      console.error('Error:', error);
    }
  };
  
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
      <form className="bg-white p-8 rounded-lg shadow-xl w-full max-w-sm">
        <h2 className="text-3xl font-extrabold mb-6 text-center text-gray-800">Register</h2>
        
        {/* Username Field */}
        <div className="mb-4">
          <label htmlFor="username" className="block text-gray-700 font-semibold mb-2">Username</label>
          <input 
            type="text" 
            className="form-control w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
            id="username" 
            placeholder="Enter your username"
            value={formData.username}
            onChange={handleChange}
          />
        </div>
        
        {/* Email Field */}
        <div className="mb-4">
          <label htmlFor="email" className="block text-gray-700 font-semibold mb-2">Email Address</label>
          <input 
            type="email" 
            className="form-control w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
            id="email" 
            aria-describedby="emailHelp"    
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
          />
          <div id="emailHelp" className="text-sm text-gray-600 mt-2">We'll never share your email with anyone else.</div>
        </div>
        
        {/* Password Field */}
        <div className="mb-4">
          <label htmlFor="password" className="block text-gray-700 font-semibold mb-2">Password</label>
          <input 
            type="password" 
            className="form-control w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
            id="password" 
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
          />
        </div>
        
        {/* Confirm Password Field */}
        <div className="mb-4">
          <label htmlFor="confirmPassword" className="block text-gray-700 font-semibold mb-2">Confirm Password</label>
          <input 
            type="password" 
            className="form-control w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
            id="confirmPassword" 
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleChange}
          />
        </div>
        


        {/* Submit Button */}
        <button 
          onClick={handlesubmit}
          type="submit" 
          className="w-full bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 transition duration-200"
        >
          Register
        </button>
      </form>
    </div>
  );
}

export default Register;
