import React from "react";
import { useTranslation } from "react-i18next";
import Navbar from "./Navbar/Navbar";
import Paragraph from "./Paragraph/Paragraph";
import GradingSystem from "./GradingSystem/GradingSystem";
import Help from "./Help/Help";
import Footer from "./Footer/Footer";
import atsWorkflow from "./assets/ats-workflow.png";

const Home = () => {
  const { t } = useTranslation();
  return (
    <div>
      <Navbar />
      <section id="features"><Paragraph /></section>
      <GradingSystem />
      {/* How ATS Works - Below Grading System */}
      <div className="bg-gray-900 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="font-bold text-3xl lg:text-4xl text-white mb-4">
              {t("home.howAtsWorks")}
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              {t("home.howAtsDesc")}
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <img src={atsWorkflow} alt="How Applicant Tracking System works" className="w-full h-auto rounded-lg" />
          </div>
        </div>
      </div>
      <section id="about"><Help /></section>
      <Footer />
    </div>
  );
};

export default Home;
