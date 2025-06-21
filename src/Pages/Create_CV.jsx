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
    <div>
      <nav className="flex">
        <Navbar />
      </nav>

      {/* Main Section */}
      <div className="container mx-auto max-w-screen-xl h-[140mm] flex flex-col lg:flex-row items-center justify-between px-10 mt-16">
        
        {/* Left Side: Text Content */}
        <div className="w-full lg:w-1/2 space-y-5 text-center lg:text-left">
          <h1 className="font-semibold text-4xl">
            Free Resume Builder: Make Your Resume Fast
          </h1>
          <p className="text-2xl">Free to use. Developed by hiring professionals.</p>
          <p className="text-lg text-slate-500">
            Hassle-free resume maker that can help you land your dream job in any industry.
            Trusted by job seekers and HR experts. Build your resume quickly and easily today.
          </p>
          <button
            className="bg-yellow-500 h-16 w-60 rounded-full text-lg font-medium hover:bg-yellow-600 transition duration-300"
            onClick={handleCreateResumeClick}
          >
            Create Your Resume Now
          </button>
        </div>

        {/* Right Side: Image */}
        {/* <div className="w-full lg:w-1/2 flex justify-center lg:justify-end mt-10 lg:mt-0">
          <img src={newmew} alt="Resume Preview" className="w-[500px] h-auto" /> 
          <img className="w-[500px] h-auto" src={temp7} alt="temp7" />
        </div> */}
      </div>
      <Footer />
    </div>
  );
};

export default Create_CV;
