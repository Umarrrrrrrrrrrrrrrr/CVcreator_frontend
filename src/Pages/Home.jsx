import React from "react";
import Navbar from "./Navbar/Navbar";
import Paragraph from "./Paragraph/Paragraph";
import GradingSystem from "./GradingSystem/GradingSystem";
import Help from "./Help/Help";
import Footer from "./Footer/Footer";

const Home = () => {
  return (
    <div>
      <Navbar />
      <Paragraph />
      <GradingSystem />
      <Help />
      <Footer />
    </div>
  );
};

export default Home;
