import React from "react";
// import Logo from "./Logo/Logo";
import Navbar from "./Navbar/Navbar";
import Paragraph from "./Paragraph/Paragraph";
import Help from "./Help/Help";
import Footer from "./Footer/Footer";



const Home = () => {
 



  return (
    <div>
      <div className="flex">
        {/* <Logo  /> */}
        <Navbar />
       
         

      </div>
      <Paragraph />
      <Help/>
      <Footer />
    </div>
  );
};

export default Home;
