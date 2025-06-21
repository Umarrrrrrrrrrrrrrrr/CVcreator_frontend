import React from "react";
import logoo from "../assets/logoo.png";
import x from "../assets/x.webp";
import fbb from "../assets/fbb.webp";
import link from "../assets/link.webp";
import { useNavigate } from "react-router-dom"; 

const Footer = () => {
  const navigate = useNavigate(); // Initialize navigate
  return (
    <div>
      <div className=" w-full h-[60px] bg-lightblue flex ">
        <p className="text-white text-xs w-[1120px] ml-48 mt-3">
          *The names and logos of the companies referred to above are all
          trademarks of their respective holders. Unless specifically stated
          otherwise, such references are not intended to imply any affiliation
          or association with Ansari.
        </p>
      </div>

      <div className=" w-full h-[490px]  bg-customBlue flex">
        <img className="w-44 h-20 ml-[190px] mt-[26px]" src={logoo} alt="logoo" />
        <p className="text-white w-48 mt-[100px] -ml-[150px] text-sm">
          Ansari is a career site fueled by the best career experts and a
          community of millions of readers yearly. We share knowledge, tips, and
          tools to help everyone find their dream job.
        </p>
        <button className="border-2 rounded-[30px] h-[50px] w-[200px] bg-yellow-400 text-black text-[16px] font-medium  -ml-[200px] mt-[260px]"
          onClick={() => navigate("/create_cv")} // Redirect to /create_cv
        >
          Create Your Resume
        </button>
        <img className="w-14 h-14 mt-[350px] -ml-[210px]" src={x} alt="x" />
        <img
          className="w-10 h-10 mt-[355px] ml-[10px]"
          src={fbb}
          alt="facebook"
        />
        <img
          className="w-10 h-10 mt-[355px] ml-[22px] rounded-full"
          src={link}
          alt="linkden"
        />
        <p className="mt-[410px] -ml-[150px] w-14 h-7    text-white text-sm ">
          Call us:
        </p>
        <p className="mt-[410px] ml-[10px] text-white w-24 h-7 text-sm  ">
          0000-000-00
        </p>

        <p className="mt-[440px] -ml-[160px] text-white w-14 h-7 text-sm">
          Email:
        </p>
        <p className="mt-[440px] ml-[10px] w-56 h-7 text-white text-sm">
          umarismyname581@gmail.com
        </p>
        <div className="felx flex-col  h-fit mt-11 space-y-3 text-white text-sm cursor-pointer">
          <p className="text-gray-500 hover:text-blue-500">Resume</p>
          <p className="hover:text-blue-500">Resume Builder</p>
          <p className="hover:text-blue-500">Resume Templates</p>
          <p className="hover:text-blue-500">Resume Examples</p>
          <p className="hover:text-blue-500">Resume Format</p>
          <p className="hover:text-blue-500">How to write a Resume</p>
          <p className="hover:text-blue-500">Resume Checker</p>
          <p className="hover:text-blue-500">Resume Help</p>
          <p className="hover:text-blue-500">Best Resume Templates</p>
          <p className="hover:text-blue-500">Resume</p>
        </div>

        <div className="felx flex-col  h-fit mt-11 ml-16 space-y-3 text-white text-sm cursor-pointer">
          <p className="text-gray-500 hover:text-blue-500">CV</p>
          <p className="hover:text-blue-500">CV Builder</p>
          <p className="hover:text-blue-500">CV Templates</p>
          <p className="hover:text-blue-500">CV Examples</p>
          <p className="hover:text-blue-500">CV Format</p>
          <p className="hover:text-blue-500">How to write a CV</p>
          <p className="hover:text-blue-500">CV Checker</p>
        </div>

        <div className="felx flex-col  h-fit mt-11 ml-20 space-y-3 text-white text-sm cursor-pointer">
          <p className="text-gray-500 hover:text-blue-500">Cover Letter</p>
          <p className="hover:text-blue-500">Cover Letter Builder</p>
          <p className="hover:text-blue-500">Cover Letter Templates</p>
          <p className="hover:text-blue-500">Cover Letter Examples</p>
          <p className="hover:text-blue-500">Cover Letter Format</p>
          <p className="hover:text-blue-500">How to write a Cover Letter</p>
          <p className="hover:text-blue-500">Cover Letter Checker</p>
        </div>

        <div className="felx flex-col  h-fit mt-11 ml-20 space-y-3 text-white text-sm cursor-pointer">
          <p className="text-gray-500 hover:text-blue-500">Support</p>
          <p className="hover:text-blue-500">About</p>
          <p className="hover:text-blue-500">Contact</p>
          <p className="hover:text-blue-500">Frequently Asked Question</p>
          <p className="hover:text-blue-500">Editorial Guidelines</p>
          <p className="hover:text-blue-500">Media Mentions</p>
          <p className="hover:text-blue-500">Accessibility</p>
          <p className="hover:text-blue-500">Privacy Policy</p>
          <p className="hover:text-blue-500">Terms Of Services</p>
          <p className="hover:text-blue-500">Cookies & Tracking Policy</p>
          <p className="hover:text-blue-500">Do Not Sell Or Share My Info</p>
        </div>
      </div>

      <div className="flex  w-full h-[150px] bg-lightblue text-sm text-white space-x-6 ">
        <p className=" text-gray-500 ml-48 mt-10">CHOOSE YOUR REGION</p>
        <div className="flex flex-row space-x-3 mt-10  w-[1050px] h-9 cursor-pointer ">
        <li className="list-none hover:text-blue-500">English (IN)</li>
        <li className="hover:text-blue-500">English (UK)</li>
        <li className="hover:text-blue-500">English (US)</li>
        <li className="hover:text-blue-500">Deutsch</li>
        <li className="hover:text-blue-500">Espanol (IN)</li>
        <li className="hover:text-blue-500">Francais (Canada)</li>
        <li className="hover:text-blue-500">Francais (France)</li>
        <li className="hover:text-blue-500">Italiano</li>
        <li className="hover:text-blue-500">Polski</li>
        <li className="hover:text-blue-500">Portugues (Brasil)</li>
        </div>
      </div>    

      <div className=" flex  w-full h-[80px] bg-customBlue">
        <p className="text-xs text-white ml-52 mt-8">© 2024 Works Limited. All Rights Reserved.</p>
      </div>
    </div>
  );
};

export default Footer;
