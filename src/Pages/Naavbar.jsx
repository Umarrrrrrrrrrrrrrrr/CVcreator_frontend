import React from 'react'
import Logo from "./assets/logoo.png"

const Naavbar = () => {
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
    </div>
  )
}

export default Naavbar