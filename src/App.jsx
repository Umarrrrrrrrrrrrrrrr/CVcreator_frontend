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
import PdfUploader from "./Pages/PDFUploader/PDFUploader";
import Payment from "./Pages/Payment/Payment";
import ProtectedRoute from "./components/ProtectedRoute";

import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/search_job" element={<Search_job/>}/>
        <Route path="/find_job" element={<Find_job />} />
        
        {/* Protected Routes - Shows login modal if not authenticated */}
        <Route path="/create_cv" element={
          <ProtectedRoute>
            <Create_CV />
          </ProtectedRoute>
        } />
        <Route path="/choose_templates" element={
          <ProtectedRoute>
            <Choose_templates />
          </ProtectedRoute>
        } />
        <Route path="/fill_cv" element={
          <ProtectedRoute>
            <Fill_cv />
          </ProtectedRoute>
        } />
        <Route path="/create_job" element={
          <ProtectedRoute>
            <Create_job/>
          </ProtectedRoute>
        }/>
        <Route path="/pdfuploader" element={
          <ProtectedRoute>
            <PdfUploader/>
          </ProtectedRoute>
        }/>
        <Route path="/payment" element={
          <ProtectedRoute>
            <Payment/>
          </ProtectedRoute>
        }/>

        {/* Other routes */}
        <Route path="/naavbar" element={<Naavbar/>}/>
      </Routes>
    </Router>
  );
}

export default App;
