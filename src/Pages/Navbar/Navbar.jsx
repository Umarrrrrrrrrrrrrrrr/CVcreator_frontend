import React from "react";
import Logo from "../assets/logoo.png";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();

  const handleclick = () => {
    navigate("/register");
  };

  return (
    <nav className="flex w-full mt-[80px] h-[100px]">
      <img src={Logo} alt="" className="h-[100px] w-[250px] ml-[120px]" />
      <ul className="text-lg w-[550px] space-x-4 list-none gap-6 flex flex-row justify-center ml-[250px] mt-[35px]">
        {/* Tools Dropdown */}
        <li className="relative group cursor-pointer px-4 py-2 rounded-md hover:bg-gray-100 transition duration-300 w-[50px">
          Tools
          <div className="absolute hidden group-hover:block bg-white border shadow-lg text-black text-sm rounded-md py-2 px-4 w-[250px] mt-2 z-10">
            <p className="py-1 hover:bg-gray-200 px-2 rounded-md">Resume Builder</p>
            <p className="py-1 hover:bg-gray-200 px-2 rounded-md">Cover Letter Generator</p>
            <p className="py-1 hover:bg-gray-200 px-2 rounded-md">Job Tracking</p>
          </div>
        </li>

        {/* CV Dropdown */}
        <li className="relative group cursor-pointer px-4 py-2 rounded-md hover:bg-gray-100 transition duration-300 ">
          CV
          <div className="absolute hidden group-hover:block bg-white border shadow-lg text-black text-sm rounded-md py-2 px-4 w-[250px] mt-2 z-10">
            <p className="py-1 hover:bg-gray-200 px-2 rounded-md">CV Templates</p>
            <p className="py-1 hover:bg-gray-200 px-2 rounded-md">CV Writing Guide</p>
            <p className="py-1 hover:bg-gray-200 px-2 rounded-md">CV Samples</p>
          </div>
        </li>

        {/* Cover Letter Dropdown */}
        <li className="relative group cursor-pointer px-4 py-2 rounded-md hover:bg-gray-100 transition duration-300 ">
          Templates
          <div className="absolute hidden group-hover:block bg-white border shadow-lg text-black text-sm rounded-md py-2 px-4 w-[250px] mt-2 z-10">
            <p className="py-1 hover:bg-gray-200 px-2 rounded-md">Cover Letter Templates</p>
            <p className="py-1 hover:bg-gray-200 px-2 rounded-md">How to Write a Cover Letter</p>
            <p className="py-1 hover:bg-gray-200 px-2 rounded-md">Examples & Samples</p>
          </div>
        </li>

        {/* Career Blog Dropdown */}
        <li className="relative group cursor-pointer px-4 py-2 rounded-md hover:bg-gray-100 transition duration-300 ">
          Blog
          <div className="absolute hidden group-hover:block bg-white border shadow-lg text-black text-sm rounded-md py-2 px-4 w-[250px] mt-2 z-10">
            <p className="py-1 hover:bg-gray-200 px-2 rounded-md">Resume Tips</p>
            <p className="py-1 hover:bg-gray-200 px-2 rounded-md">Interview Preparation</p>
            <p className="py-1 hover:bg-gray-200 px-2 rounded-md">Career Growth Strategies</p>
          </div>
        </li>

        {/* About Dropdown */}
        <li className="relative group cursor-pointer px-4 py-2 rounded-md hover:bg-gray-100 transition duration-300">
          About
          <div className="absolute hidden group-hover:block bg-white border shadow-lg text-black text-sm rounded-md py-2 px-4 w-[250px] mt-2 z-10">
            <p className="py-1 hover:bg-gray-200 px-2 rounded-md">Who We Are</p>
            <p className="py-1 hover:bg-gray-200 px-2 rounded-md">Our Mission</p>
            <p className="py-1 hover:bg-gray-200 px-2 rounded-md">Contact Us</p>
          </div>
        </li>
      </ul>
      <button
        className="bg-blue-700 mt-[30px] text-white h-12 w-32 rounded-[20px] cursor-pointer transition duration-500 ease-in-out hover:bg-green-500"
        onClick={handleclick}
      >
        My Account
      </button>
    </nav>
  );
};

export default Navbar;
