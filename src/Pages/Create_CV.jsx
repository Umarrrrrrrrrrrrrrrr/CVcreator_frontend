import React from 'react'
import Logo from "./Logo/Logo";

import Navbar from './Navbar/Navbar';
import { useNavigate } from 'react-router-dom';

const Create_CV = () => {

    const Navigate = useNavigate();
 
    const handleCreateResumeClick = () => {
        Navigate('/choose_templates')
    };

  return (
    <div>
      <nav className="flex ">
        
        <Navbar />
        

      </nav>

        <div className='space-y-3 w-[600px] ml-10 mt-[80px]'>
            <h1 className='font-semibold text-4xl  w-[450px] ml-32 mt-12'>Free Resume Builder: Make Your Resume Fast</h1>
            <p className='ml-32  text-2xl '>Free to use. Developed by hiring professionals.</p>
            <p className='ml-32  text-lg w-[470px] text-slate-500'>Hassle-free resume maker that can help you land your dream job in any industry. Trusted by job seekers and HR experts. Build your resume quickly and easily today.</p>
            <button className='bg-yellow-500 h-16 w-60 rounded-full mt-[400px] ml-[200px]' onClick={handleCreateResumeClick}>Create Your Resume Now</button>
        </div>
         

      </div>
  )
}

export default Create_CV