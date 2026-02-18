import React, { useState } from "react";
import { AiOutlineUpload, AiOutlineFilePdf } from "react-icons/ai";

const PdfUploader = () => {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
    } else {
      alert("Please upload a valid PDF file");
    }
  };

  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    const selectedFile = e.dataTransfer.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
    } else {
      alert("Please upload a valid PDF file");
    }
  };

  const handleClear = () => setFile(null);

  return (
    <div className="w-full max-w-xl mx-auto mt-12 p-6 bg-white rounded-lg shadow-lg border border-gray-300">
      <h2 className="text-2xl font-bold text-center mb-6">Upload Your Resume</h2>

      {/* Drag & Drop Zone */}
      <div
        className="flex flex-col items-center justify-center border-2 border-dashed border-gray-400 rounded-lg h-48 cursor-pointer hover:border-blue-500 transition"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => document.getElementById("pdfInput").click()}
      >
        <AiOutlineUpload className="text-5xl text-gray-400 mb-4" />
        <p className="text-gray-500">Drag & drop your PDF here, or click to browse</p>
        <input
          type="file"
          id="pdfInput"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Preview Section */}
      {file && (
        <div className="flex items-center justify-between mt-4 bg-gray-100 p-3 rounded-lg">
          <div className="flex items-center space-x-3">
            <AiOutlineFilePdf className="text-red-500 text-3xl" />
            <p className="text-gray-700 font-medium">{file.name}</p>
          </div>
          <button
            onClick={handleClear}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded-lg transition"
          >
            Remove
          </button>
        </div>
      )}

      {/* Action Button */}
      <button
        disabled={!file}
        className={`mt-6 w-full py-2 rounded-lg text-white font-semibold transition ${
          file ? "bg-green-500 hover:bg-green-600" : "bg-gray-400 cursor-not-allowed"
        }`}
      >
        Grade Resume
      </button>
    </div>
  );
};

export default PdfUploader;
