import React, { useState } from "react";
import blank from "../assets/blank.webp";
import link from "../assets/link.webp";

const slides = [
  { id: 1, Image: blank, title: "Yoshij Stha", subtitle: "Interview Coach & Career Blogger", description: "A Software Engineer is an IT professional who designs, develops, and maintains computer software at a company. They use their creativity and technical skills to apply the principles of software engineering to help solve new and ongoing problems for an organization." },
  { id: 2, Image: blank, title: "Bidur Siwakoti", subtitle: "Product Manager", description: "A Product Manager is responsible for overseeing a product throughout its lifecycle, from conception through end-of-life. This includes understanding customer needs, identifying market trends, and assessing competition to ensure the product aligns with the company’s overall strategy and goals." },
  { id: 3, Image: blank, title: "KP Oli", subtitle: "Career Counceeler", description: "The term fake man can refer to different contexts. In one context, it can describe a man who is not genuinely committed to a relationship, often used in the or when hooking up with someone without a clear label." },
];

const Help = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 2 : prev - 1));
  };
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev >= slides.length - 2 ? 0 : prev + 1));
  };

  return (
    <div className="w-full h-[700px] bg-gray-100 flex flex-col items-center py-12">
      <h1 className="text-4xl font-bold mb-6">HR Professionals Recommend ANSARI</h1>
      <p className="text-lg text-gray-600 mb-10">Industry experts recommend Ansari as a proven way to boost your career.</p>
      
      <div className="relative w-full max-w-6xl  overflow-hidden">
        <div className="flex transition-transform duration-500 h-[400px]" style={{ transform: `translateX(-${currentSlide * 50}%)` }}>
          {slides.map((slide) => (
            <div key={slide.id} className="flex-shrink-0 w-1/2 p-6 bg-blue-400 rounded-2xl mx-2">
              <div className="flex items-center justify-between">
                <img className="w-20 h-20 rounded-full" src={slide.Image} alt="profile" />
                <img className="w-8 h-8" src={link} alt="link" />
              </div>
              <div className="ml-4 mt-4">
                <h1 className="text-xl font-semibold text-white">{slide.title}</h1>
                <p className="text-gray-300">{slide.subtitle}</p>
              </div>
              <p className="text-white mt-4">{slide.description}</p>
            </div>
          ))}
        </div>
        <button className="absolute top-1/2 left-4 bg-gray-600 text-white p-4 rounded-full" onClick={prevSlide}>&lt;</button>
        <button className="absolute top-1/2 right-4 bg-gray-600 text-white p-4 rounded-full" onClick={nextSlide}>&gt;</button>
      </div>
    </div>
  );
};

export default Help;
