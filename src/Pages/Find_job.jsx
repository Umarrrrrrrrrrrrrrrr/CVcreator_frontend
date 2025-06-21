import React, { useState, useEffect, useRef } from 'react'
// import Logo from "./Pages/assets/logoo.png";
import Logo from "./assets/logoo.png";
import { useNavigate } from 'react-router-dom';

const Find_job = () => {
  const [selectedDiv, setselectedDiv] = useState(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();






  //fetch companies from the django API


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setselectedDiv(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    };
  },[containerRef]);  

  const handledivClick = (divID)=> {setselectedDiv(divID)};

  const handleSubmit = () => {
    if(selectedDiv === 1){
      navigate('/create_job')
    } else if (selectedDiv === 2){
      navigate('/search_job')
    }
  }
  

  return (
    <div>
    <nav className="  flex w-full mt-[80px]  h-[100px]" >
      <img src={Logo} alt="" className="h-[100px] w-[250px] ml-[120px]"/>
      <ul className=" text-lg w-[550px] space-x-4  list-none gap-6 flex flex-row justify-center ml-[250px] mt-[35px] ">
        <li className="relative group cursor-pointer ">
          Tools
          <div className="before:content-[''] before:block before:w-0 before:h-0 before:border-l-4 before:border-r-4 before:border-b-4 before:border-transparent before:border-b-black before:ml-[50px] before:-mt-[14px]  before:mr-2 w-[15px] "></div>
          <div className="absolute hidden group-hover:block bg-white border-2 text-black text-xs rounded py-1 px-2 buttom-full mb-2 h-[300px] w-[250px] ">
            add something here
          </div>  
        </li>
        <li className="relative group cursor-pointer  ">
          CV
          <div className="before:content-[''] before:block before:w-0 before:h-0 before:border-l-4 before:border-r-4 before:border-b-4 before:border-transparent before:border-b-black before:ml-[25px] before:-mt-[14px]  before:mr-2 w-[15px]"></div>
          <div className="absolute hidden group-hover:block bg-white border-2 text-black text-xs rounded py-1 px-2 buttom-full mb-2 h-[300px] w-[250px]">
            add something here
          </div>
        </li>
        <li className="relative group cursor-pointer  ">
          Cover Letter
          <div className="before:content-[''] before:block before:w-0 before:h-0 before:border-l-4 before:border-r-4 before:border-b-4 before:border-transparent before:border-b-black before:ml-[100px] before:-mt-[14px]  before:mr-2 w-[15px]"></div>
          <div className="absolute hidden group-hover:block bg-white border-2 text-black text-xs rounded py-1 px-2 buttom-full mb-2 h-[300px] w-[250px]" >
            add something here
          </div>
        </li>
        <li className="relative group cursor-pointer  ">
          Career Blog
          <div className="before:content-[''] before:block before:w-0 before:h-0 before:border-l-4 before:border-r-4 before:border-b-4 before:border-transparent before:border-b-black before:ml-[95px] before:-mt-[14px]  before:mr-2 w-[15px]"></div>
          <div className="absolute hidden group-hover:block bg-white border-2 text-black text-xs rounded py-1 px-2 buttom-full mb-2 h-[300px] w-[250px]">
            add something here
          </div>
        </li>
        <li className="relative group cursor-pointer  ">
          About
          <div className="before:content-[''] before:block before:w-0 before:h-0 before:border-l-4 before:border-r-4 before:border-b-4 before:border-transparent before:border-b-black before:ml-[55px] before:-mt-[14px]  before:mr-2 w-[15px]"></div>
          <div className="absolute hidden group-hover:block bg-white border-2 text-black text-xs rounded py-1 px-2 buttom-full mb-2 h-[300px] w-[250px]">
            add something here
          </div>
          
          
        </li>
      </ul>
      
    </nav>
    <div className=' w-[400px] flex justify-center ml-[550px] mt-6'>
      <p className='font-semibold text-xl'>Join as a client or search for a Job</p>
    </div>
    <div ref={containerRef} className='flex flex-row gap-6 ml-[350px] mt-6'>
      <div className='border-2 h-[200px] w-[400px] flex justify-center items-center' onClick={() => handledivClick(1)}>
        <p>I'M a client, looking for employee</p>
        <div className={`border-black border-2 rounded-full h-4 w-4  mt-[-150px] ml-[100px] ${  selectedDiv === 1 ? 'bg-blue-800' : 'bg-white'} `}></div>
        </div>
      <div className='border-2 h-[200px] w-[400px] flex justify-center items-center' onClick={() => handledivClick(2)} >
        <p> I'M a freelancer, looking for work </p>
      <div className={`border-black border-2 rounded-full h-4 w-4  mt-[-150px] ml-[100px] ${selectedDiv === 2 ?'bg-blue-800' : 'bg-white' }`}></div>
      </div>
      <div className='flex relative right-[500px] '>
      <button className='h-9 w-[100px] rounded-2xl mt-[220px]  bg-blue-600 hover hover:bg-green-600' onClick={handleSubmit}>Submit</button>
      </div>
    </div>
    </div>
  );
};
export default Find_job