import React, { useState } from "react";
import resume from "../assets/resume.webp";
import file from "../assets/file.webp";
import jobs from "../assets/jobs.png";
import advice from "../assets/advice.png";
import check from "../assets/check.png";
import suggestion from "../assets/suggestion.png";
import blank from "../assets/blank.webp";
import link from "../assets/link.webp";

const slides = [
  {
    id: 1,
    Image: blank,
    title: "Smart Boy",
    subtitle: "Interview Coach & Career Blogger",
    description:
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptates velit unde quia autem sapiente laboriosam inventore magni sunt aut reprehenderit impedit facilis atque possimus earum, ipsa harum iusto qui fugiat. Nam aut accusamus delectus esse dolor deleniti expedita eaque porro quia dolorum, itaque veniam, dolore sequi! Ipsum similique aliquam in velit iure quidem! Architecto, perspiciatis non doloremque repellat animi explicabo?",
  },
  {
    id: 2,
    Image: blank,
    title: "Chutya",
    subtitle: "Product Manager",
    description:
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptates velit unde quia autem sapiente laboriosam inventore magni sunt aut reprehenderit impedit facilis atque possimus earum, ipsa harum iusto qui fugiat. Nam aut accusamus delectus esse dolor deleniti expedita eaque porro quia dolorum, itaque veniam, dolore sequi! Ipsum similique aliquam in velit iure quidem! Architecto, perspiciatis non doloremque repellat animi explicabo?",
  },
  {
    id: 3,
    Image: blank,
    title: "KP Oli",
    subtitle: "Career Counceeler",
    description:
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptates velit unde quia autem sapiente laboriosam inventore magni sunt aut reprehenderit impedit facilis atque possimus earum, ipsa harum iusto qui fugiat. Nam aut accusamus delectus esse dolor deleniti expedita eaque porro quia dolorum, itaque veniam, dolore sequi! Ipsum similique aliquam in velit iure quidem! Architecto, perspiciatis non doloremque repellat animi explicabo?",
  },
  // Add more slides if needed
];

const Help = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [iscontentVisible, setiscontentVisible] = useState(false);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentSlide((prev) =>
      prev >= slides.length - 1 ? 0 : prev + 1
    );
  };

//   const toggleContentVisibility = () => {
//     setiscontentVisible(!iscontentVisible);

    // const displayedSlides = [
    //     slides[currentSlide],
    //     slides[(currentSlide + 1) % slides.length],
    // ]
  

  return (
    <div>
      <div className="w-full h-[600px] border bg-slate-50">
        <div className="flex justify-center">
          <h1 className="font-semibold text-3xl mt-16">
            HOW CAN WE HELP YOU?
          </h1>
        </div>
        <div className="flex flex-row mt-12 ml-60 space-x-4">
          <img className="w-20 h-20" src={resume} alt="resume" />
          <div className="w-[250px]">
            <p className="font-medium">Resume Builder</p>
            <p>
              Zety’s resume builder will save you time and provide expert tips
              every step of the way. Creating a resume has never been easier.
            </p>
          </div>
          <img className="w-20 h-20" src={file} alt="file" />
          <div className="w-[250px]">
            <p className="font-medium">Cover Letter Builder</p>
            <p>
              Smoothly generate a job-winning cover letter with our
              drag-and-drop interface.
            </p>
          </div>
          <img className="w-20 h-20" src={jobs} alt="jobs" />
          <div className="w-[250px]">
            <p className="font-medium">ATS-Friendly Resume Templates</p>
            <p>
              Grab recruiters’ attention with one of 18 professional resume
              templates designed by career experts.
            </p>
          </div>
        </div>
        <div className="flex flex-row mt-16 ml-60 space-x-4">
          <img className="w-20 h-20" src={advice} alt="advice" />
          <div className="w-[250px]">
            <p className="font-medium">Free Career Advice Resources</p>
            <p>
              Consciously shape your career with helpful guides and resume
              examples. Writing the perfect job application? Asking for a raise?
              Learn it all (and more) on our blog.
            </p>
          </div>
          <img className="w-20 h-20" src={check} alt="check" />
          <div className="w-[250px]">
            <p className="font-medium">Resume Check</p>
            <p>
              Score and check your resume in real-time with our resume checker.
              Get actionable tips to improve your resume.
            </p>
          </div>
          <img className="w-20 h-20" src={suggestion} alt="suggestion" />
          <div className="w-[250px]">
            <p className="font-medium">Ready-Made Content Suggestions</p>
            <p>
              Discover expert-crafted content suggestions and create a
              professional job application in minutes.
            </p>
          </div>
        </div>
      </div>

      {/* HR Professional Recommendation Section */}
      <div className="w-full h-[600px] border ">
        <div className="flex flex-col justify-center items-center mt-6">
          <h1 className="font-semibold text-4xl">
            HR Professionals Recommend ANSARI
          </h1>
          <br />
          <p>Industry experts recommend Zety as a proven way to boost your career.</p>
        </div>

        <div className="flex  mt-10  justify-start">
          <div className="relative w-full max-w-4xl ">
            <div
              className="flex flex-row w-full transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {slides.map((slide) => (
                <div
                  key={slide.id}
                  className="flex-shrink-0 w-[759px] h-[300px] p-4 bg-blue-400 rounded-2xl "
                >
                  <div className="flex items-center justify-between ">
                    <img
                      className="w-20 h-20 rounded-full"
                      src={slide.Image}
                      alt="profile"
                    />
                    <img className="w-8 h-8" src={link} alt="link" />
                  </div>
                  <div className="-mt-20 ml-20">
                    <h1 className="font-semibold text-lg text-white p-2">
                      {slide.title}
                    </h1>
                    <p className="text-sm text-gray-500 w-60 p-2">
                      {slide.subtitle}
                    </p>
                  </div>
                  <p className="w-full mt-4 p-2">{slide.description}</p>
                </div>
              ))}
            </div>

            <button
              className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-gray-600 text-white p-2 rounded-full"
              onClick={prevSlide}
            >
              &lt;
            </button>
            <button
              className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-gray-600 text-white p-2 rounded-full"
              onClick={nextSlide}
            >
              &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;
