import React, { useState } from "react";
import logoo from "./assets/logoo.png";
import temp1 from "./assets/temp1.png";
import temp2 from "./assets/temp2.png";
import temp3 from "./assets/temp3.png";
import temp4 from "./assets/temp4.png";
import temp5 from "./assets/temp5.png";
import temp6 from "./assets/temp6.png";
import temp7 from "./assets/temp7.png";
import temp8 from "./assets/temp8.png";
import temp9 from "./assets/temp9.png";
import temp10 from "./assets/temp10.png";
import temp11 from "./assets/temp11.png";
import temp12 from "./assets/temp12.png";
import { useNavigate } from "react-router-dom";

const Choose_templates = () => {

    // const [selectedColor, setSelectedColor] = useState("");
    const [selectedTemplate, setSelectedTemplate] = useState("");   
    const navigate = useNavigate();

    // const handleColorClick = (color) => {
    //     setSelectedColor(color);
    // };

    const handleClick =(templateId) => {
        setSelectedTemplate(Number(templateId));
    }

    const handleChooseTemplateClick = () => {
        if(selectedTemplate) {
            navigate("/fill_cv", {state: { templateId: selectedTemplate}});

        } else {
            alert("please select the template");
        }
    };

  return (
    <div>
      <nav className=" flex  bg-blue-950 h-20">
        <div className=" w-[200px] h-10  ml-14">
          <img src={logoo} alt="" />
        </div>
      </nav>
      <div className="mt-10 ml-[450px]">
        <h1 className="font-semibold text-3xl">
          Choose your favorite template design
        </h1>
        <p className="ml-20">You can always change your template later.</p>
      </div>
      <hr className="mt-4" />

      {/*  colors */}
      {/* colors */}
      <div className="absolute  mt-10  w-[200px] h-[200px] ml-[150px] cursor-pointer">
        <p className="font-semibold text-LG">COLOR</p>
        <div className="grid grid-cols-5 grid-rows-2 gap-3 mt-5 ">
          <div className="border-2 w-8 h-8 rounded-full bg-white  hover:scale-125"></div>
          <div className="border-2 w-8 h-8 rounded-full bg-gray-500 hover:scale-125"></div>
          <div className="border-2 w-8 h-8 rounded-full bg-blue-600 hover:scale-125"></div>
          <div className="border-2 w-8 h-8 rounded-full bg-blue-900 hover:scale-125"></div>
          <div className="border-2 w-8 h-8 rounded-full bg-purple-600 hover:scale-125"></div>
          <div className="border-2 w-8 h-8 rounded-full bg-blue-400 hover:scale-125"></div>
          <div className="border-2 w-8 h-8 rounded-full bg-green-500 hover:scale-125"></div>
          <div className="border-2 w-8 h-8 rounded-full bg-red-600 hover:scale-125"></div>
          <div className="border-2 w-8 h-8 rounded-full bg-pink-600 hover:scale-125"></div>
          <div className="border-2 w-8 h-8 rounded-full bg-yellow-400 hover:scale-125"></div>
        </div>
        <p className="text-sm text-blue-500 ml-[70px] mt-3">Pick a color you like</p>
      </div>

      {/* templates */}

      <div className="grid grid-row-4 grid-cols-3  w-[1100px] h-full gap-4  ml-[370px]   mt-7 ">
        
        {[temp1,temp2,temp3,temp4,temp5,temp6,temp7,temp8,temp9,temp10,temp11,temp12].map((temp,index) => (
            <div
            key={index}
            className={`border-4 ${
              selectedTemplate === index + 1 ? "border-blue-500 scale-110" : "border-transparent hover:scale-110"
            } w-[350px] h-[400px] rounded-2xl flex items-center justify-center hover:scale-110 transition ease-in-out`}
            onClick={() => handleClick(index + 1)}
          > 
          <img src={temp} alt={`Template ${index + 1}`} className="W-full h-full rounded-2xl border-2" />
          </div>
        ))}
      </div>

      <footer className="position: fixed bottom-[-5px] bg-white h-24 border-2 mt-auto w-full ">
        <div className="flex flex-row gap-7 ml-[900px] mt-4">
          <button className="font-semibold text-xl text-blue-600">
            Choose later
          </button>
          <button className=" bg-yellow-500 rounded-3xl h-12 w-52 text-lg" onClick={ handleChooseTemplateClick}>
            Choose Templates
          </button>
        </div>
      </footer>
    </div>                          
  );
};

export default Choose_templates;
