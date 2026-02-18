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
    <div className="w-full bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col items-center py-16">
      <div className="max-w-7xl mx-auto px-4 text-center mb-12">
        <h1 className="text-4xl lg:text-5xl font-bold text-gray-800 mb-4">
          HR Professionals Recommend ANSARI
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Industry experts recommend Ansari as a proven way to boost your career.
        </p>
      </div>
      
      <div className="relative w-full max-w-6xl mx-auto px-4">
        <div className="overflow-hidden rounded-2xl">
          <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentSlide * 50}%)` }}>
            {slides.map((slide) => (
              <div key={slide.id} className="flex-shrink-0 w-1/2 p-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-2 shadow-xl">
                <div className="flex items-start justify-between mb-4">
                  <img className="w-16 h-16 rounded-full border-4 border-white shadow-lg" src={slide.Image} alt="profile" />
                  <img className="w-8 h-8 opacity-80 hover:opacity-100 transition-opacity" src={link} alt="link" />
                </div>
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-white mb-1">{slide.title}</h2>
                  <p className="text-blue-100 font-medium">{slide.subtitle}</p>
                </div>
                <p className="text-white leading-relaxed">{slide.description}</p>
              </div>
            ))}
          </div>
        </div>
        <button 
          className="absolute top-1/2 left-0 bg-white text-blue-600 p-3 rounded-full shadow-lg hover:bg-blue-50 transition-all duration-200 transform hover:scale-110 -translate-x-4" 
          onClick={prevSlide}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button 
          className="absolute top-1/2 right-0 bg-white text-blue-600 p-3 rounded-full shadow-lg hover:bg-blue-50 transition-all duration-200 transform hover:scale-110 translate-x-4" 
          onClick={nextSlide}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Help;
