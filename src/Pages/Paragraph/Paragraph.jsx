import React from "react";
import bulb from "../assets/bulb.png";
import setting from "../assets/setting.png";
import expert from "../assets/expert.png";
import fbb from "../assets/fbb.webp";
import microsoft from "../assets/microsoft.png";
import ing from "../assets/ing.webp";
import { useNavigate } from "react-router-dom";
import pic from "../assets/pic.png";

const Paragraph = () => {

  const Navigate = useNavigate();

  const handletryourresumeclick = () => {
    Navigate("/create_cv");
  };

  return (
    <div>
      <h1 className=" w-[900px] ml-[350px] mt-12 font-medium text-5xl">
        <p>Professional Resume & Cover Letter Tools </p>
        <p className="ml-72"> For Any Job </p>
      </h1>
      <p className="ml-[500px] mt-[20px]">
        Create a job-winning resume in minutes with our easy-to-use builder.
      </p>
      <button className="w-56 h-12 bg-yellow-400 rounded-[20px] ml-[650px] mt-4 cursor-pointer transition duration-300 hover:bg-yellow-700 " onClick={handletryourresumeclick}>
        Try Our Resume Builder
      </button>

      <div className=" relative flex space-x-14 ml-[350px] mt-10 ">
        <img className="absolute  w-12 h-12  " src={setting} alt="setting" />

        <div className="w-56 h-24 ">
          <h1 className="font-semibold text-lg">Cutting Edge Career Tools</h1>
          <p className="text-sm">
            Build a matching resume and cover letter with step-by-step guidance
            and expert tips.
          </p>
        </div>

        <img
          className="absolute left-[230px] w-12 h-12 "
          src={bulb}
          alt="bulb"
        />

        <div className="w-56 h-24   ">
          <h1 className="font-semibold text-lg">Extensive Experience</h1>
          <p className="text-sm">
            Use our vast industry expertise to land your dream job faster.
          </p>
        </div>

        <img
          className="absolute left-[500px] w-10 h-10  "
          src={expert}
          alt="expert"
        />

        <div className="w-56 h-24   ">
          <h1 className="font-semibold text-lg">
            Expert-Crafted Guides and Examples
          </h1>
          <p className="text-sm">
            Grow your career with our expert blog cited by universities and top
            media outlets.
          </p>
        </div>
      </div>
      <div className="w-[500px] min-h-80 border-2 ml-[500px] mt-24 bg-blue-400">
        <img src={pic} alt="" />
      </div>

      <div className="relative w-full h-20 mt-10 bg-gray-400">
        <p className="absolute w-36 ml-44 mt-4 ">
          Our customer have been hired by:*
        </p>
        <img
          className=" absolute w-10 h-10 ml-[500px] mt-5 rounded-full"
          src={fbb}
          alt="fbb"
        />
        <p className="absolute w-36 ml-[550px] mt-7 font-medium ">facebook</p>
        <img
          className="absolute w-10 h-10 ml-[700px] mt-5"
          src={microsoft}
          alt=""
        />
        <p className="absolute w-36 ml-[750px] mt-7 font-medium">Microsoft</p>
        <img className="absolute w-10 h-10 ml-[900px] mt-5" src={ing} alt="" />
        <p className="absolute w-36 ml-[950px] mt-7 font-medium">ING</p>
      </div>
      <div className="  flex  h-[450px] w-full ">
        <h1 className="h-11 font-semibold text-4xl ml-[700px] mt-14  ">
          What is ANSARI?
        </h1>
        <div className="w-[620px] h-56 mt-[130px] -ml-[280px] space-y-4  ">
          <p>
            Zety is an all-in-one career platform powered by some of the best
            career experts and a community of 40 million readers a year.
          </p>
          <p>
            We offer you the best online resume and cover letter builder, as
            well as free professional advice from career experts. We know how
            stressful the job search can be. That’s why we want to make it as
            easy and smooth as possible.
          </p>
          <p>
            We’ll not only help you build your resume but also teach you how to
            ace a job interview, negotiate your salary, and more. You can trust
            us on your professional journey.
          </p>
        </div>
        <div className=" absolute w-fit flex flex-row space-x-12 text-blue-900 h-14 font-bold text-4xl   left-[170px] mt-20">
          <p>41M+</p>
          <p>1400M+</p>
          <p>40M+</p>
        </div>

        <div className=" flex flex-row h-fit space-x-10 w-[430px] absolute mt-32 ml-44 text-sm text-slate-500">
          <p>Job applications created</p>
          <p>Free career guides</p>
          <p>Readers a year</p>
        </div>

        <div className=" absolute w-fit flex flex-row space-x-24 text-blue-900 h-14 font-bold text-4xl   left-[170px] mt-60">
          <p>30+</p>
          <p>10+</p>
          <p>1000+</p>

          
        </div>
        <div className=" flex flex-row h-fit space-x-28 w-[430px] absolute mt-72 ml-44 text-sm text-slate-500">
          <p>Career Experts</p>
          <p>Years in business</p>
          <p>Mentions by universities and media</p>
        </div>
      </div>
    </div>
  );
};

export default Paragraph;
