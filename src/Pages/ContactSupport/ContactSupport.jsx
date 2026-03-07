import React, { useState } from "react";
import Navbar from "../Navbar/Navbar";
import Footer from "../Footer/Footer";

const ContactSupport = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Contact Support</h1>
          <p className="text-lg text-gray-600">Get help or reach out to our team</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Project Overview */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">About Our Project</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                <strong className="text-gray-800">ANSARI</strong> is a professional career platform that helps job seekers and employers connect. Our platform combines AI-powered tools with traditional job search features.
              </p>
              <h3 className="font-semibold text-gray-800 mt-4">Key Features</h3>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>AI-Powered CV Grading</strong> – Upload your resume and get an instant score with improvement suggestions</li>
                <li><strong>Resume Builder</strong> – Create professional resumes using customizable templates</li>
                <li><strong>Job Board</strong> – Find jobs and apply directly from the platform</li>
                <li><strong>Job Posting</strong> – Employers can post job openings and reach qualified candidates</li>
                <li><strong>Payment Integration</strong> – Support for eSewa and Khalti (Nepal payment gateways)</li>
                <li><strong>User Profiles</strong> – Manage your account, bio, and professional details</li>
              </ul>
              <h3 className="font-semibold text-gray-800 mt-4">Technology Stack</h3>
              <p>
                Built with React (Vite), Django REST Framework, PostgreSQL (Neon), JWT authentication, and machine learning for CV analysis.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Send us a message</h2>
            {submitted ? (
              <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-green-700">
                <p className="font-semibold">Thank you for your message!</p>
                <p className="mt-2">We'll get back to you as soon as possible.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="How can we help?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Message</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    placeholder="Your message..."
                  />
                </div>
                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
                >
                  Send Message
                </button>
              </form>
            )}

            {/* Alternative Contact */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-2">Other ways to reach us</h3>
              <p className="text-gray-600 text-sm">
                For urgent technical support or questions about your account, please ensure you're logged in and check the Help section on the home page.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ContactSupport;
