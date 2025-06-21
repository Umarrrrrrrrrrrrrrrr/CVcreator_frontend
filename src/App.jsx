import React from "react";
import Register from "./Pages/Register";
import Login from "./Pages/Login";
import Home from "./Pages/Home";
import Create_CV from "./Pages/Create_CV";
import Choose_templates from "./Pages/Choose_templates";
import Fill_cv from "./Pages/Fill_CV/Fill_cv";
import Find_job from "./Pages/Find_job";
import Search_job from "./Pages/Search_job";
import Create_job from "./Pages/Create_job";
import Naavbar from "./Pages/Naavbar";

import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

function App() {
  return (
    <React.StrictMode>
      <Router>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/create_cv" element={<Create_CV />} />
          <Route path="/choose_templates" element={<Choose_templates />} />
          <Route path="/fill_cv" element={<Fill_cv />} />
          <Route path="/find_job" element={<Find_job />} />
          <Route path="/create_job" element={<Create_job/>}/>
          <Route path="/search_job" element={<Search_job/>}/>
          <Route path="/naavbar" element={<Naavbar/>}/>
          
        </Routes>
      </Router>
    </React.StrictMode>
  );
}

export default App;
