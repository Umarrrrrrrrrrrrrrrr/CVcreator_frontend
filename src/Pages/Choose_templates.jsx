import React, { useState } from "react";
import logoo from "./assets/logoo.png";
import temp1 from "./assets/temp1.png";
import temp2 from "./assets/temp2.png";
import temp3 from "./assets/temp3.png";
import temp4 from "./assets/temp4.png";
import temp5 from "./assets/temp5.png";
import temp6 from "./assets/temp6.png";
import temp7 from "./assets/temp7.png";
import temp8 from "./assets/temp8.png";
import temp9 from "./assets/temp9.png";
import temp10 from "./assets/temp10.png";
import temp11 from "./assets/temp11.png";
import temp12 from "./assets/temp12.png";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Choose_templates = () => {
    const [selectedTemplate, setSelectedTemplate] = useState("");   
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [sortBy, setSortBy] = useState("default");
    const [previewTemplate, setPreviewTemplate] = useState(null);
    const navigate = useNavigate();
    const { isPremium } = useAuth();

    // Template data with categories
    const templates = [
        { id: 1, image: temp1, name: "Modern Professional", category: "modern", popular: true },
        { id: 2, image: temp2, name: "Classic Elegant", category: "classic", popular: false },
        { id: 3, image: temp3, name: "Creative Design", category: "creative", popular: true },
        { id: 4, image: temp4, name: "Corporate Standard", category: "professional", popular: false },
        { id: 5, image: temp5, name: "Minimalist Style", category: "modern", popular: true },
        { id: 6, image: temp6, name: "Traditional Layout", category: "classic", popular: false },
        { id: 7, image: temp7, name: "Bold Creative", category: "creative", popular: false },
        { id: 8, image: temp8, name: "Executive Format", category: "professional", popular: true },
        { id: 9, image: temp9, name: "Contemporary Design", category: "modern", popular: false },
        { id: 10, image: temp10, name: "Timeless Classic", category: "classic", popular: false },
        { id: 11, image: temp11, name: "Artistic Layout", category: "creative", popular: false },
        { id: 12, image: temp12, name: "Business Professional", category: "professional", popular: true }
    ];

    const categories = [
        { id: "all", name: "All Templates", icon: "📋" },
        { id: "modern", name: "Modern", icon: "✨" },
        { id: "classic", name: "Classic", icon: "📜" },
        { id: "creative", name: "Creative", icon: "🎨" },
        { id: "professional", name: "Professional", icon: "💼" }
    ];

    const handleClick = (templateId) => {
        const template = templates.find(t => t.id === templateId);
        
        // Check if template is popular/premium and user doesn't have premium access
        if (template && template.popular && !isPremium) {
            // Show premium required message and redirect to payment
            const confirmUpgrade = window.confirm(
                "This is a Premium template! Upgrade to Premium to access this template and unlock all premium features.\n\nWould you like to upgrade now?"
            );
            if (confirmUpgrade) {
                navigate("/payment");
            }
            return;
        }
        
        setSelectedTemplate(Number(templateId));
    }

    const handleChooseTemplateClick = () => {
        if(selectedTemplate) {
            const template = templates.find(t => t.id === selectedTemplate);
            
            // Final check before navigating to fill_cv
            if (template && template.popular && !isPremium) {
                alert("Please upgrade to Premium to use this template. Redirecting to payment page...");
                navigate("/payment");
                return;
            }
            
            navigate("/fill_cv", {
                state: { 
                    templateId: selectedTemplate
                }
            });
        } else {
            alert("please select the template");
        }
    };

    // Filter and sort templates
    const filteredTemplates = templates
        .filter(template => {
            const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
            return matchesSearch && matchesCategory;
        })
        .sort((a, b) => {
            if (sortBy === "popular") {
                return b.popular - a.popular;
            } else if (sortBy === "name") {
                return a.name.localeCompare(b.name);
            }
            return a.id - b.id; // default order
        });

    const handlePreview = (template) => {
        setPreviewTemplate(template);
    };

    const closePreview = () => {
        setPreviewTemplate(null);
    };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <img src={logoo} alt="Logo" className="h-12 w-auto cursor-pointer" onClick={() => navigate('/')} />
        </div>
      </nav>
      
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="font-bold text-4xl lg:text-5xl text-gray-800 mb-4">
            Choose Your Favorite Template Design
          </h1>
          <p className="text-lg text-gray-600">
            You can always change your template later.
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-8 space-y-6">
          {/* Search Bar */}
          <div className="bg-white rounded-xl shadow-lg p-4 max-w-2xl mx-auto">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search templates by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                >
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Category Filters and Sort */}
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
              {/* Category Filters */}
              <div className="flex flex-wrap gap-3 items-center">
                <span className="text-sm font-semibold text-gray-700 mr-2">Categories:</span>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedCategory === category.id
                        ? 'bg-blue-600 text-white shadow-md scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="mr-2">{category.icon}</span>
                    {category.name}
                  </button>
                ))}
              </div>

              {/* Sort Options */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-700">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="default">Default</option>
                  <option value="popular">Most Popular</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Results Count */}
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold text-blue-600">{filteredTemplates.length}</span> of {templates.length} templates
              </p>
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-24">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className={`relative group cursor-pointer transform transition-all duration-300 ${
                  selectedTemplate === template.id 
                    ? "scale-105 ring-4 ring-blue-500 ring-opacity-50" 
                    : "hover:scale-105"
                }`}
              >
                <div className={`bg-white rounded-xl shadow-lg overflow-hidden border-2 transition-all relative ${
                  template.popular && !isPremium 
                    ? 'border-purple-300' 
                    : 'border-transparent hover:border-blue-300'
                }`}>
                  <div className="relative">
                    <img 
                      src={template.image} 
                      alt={template.name} 
                      className={`w-full h-auto object-cover transition-all duration-300 ${
                        template.popular && !isPremium ? 'opacity-75' : ''
                      }`}
                    />
                    {template.popular && !isPremium && (
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center">
                        <div className="bg-white/90 backdrop-blur-sm rounded-full p-4 shadow-xl">
                          <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedTemplate === template.id && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-2 z-10">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  {template.popular && (
                    <div className="absolute top-2 left-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      Premium
                    </div>
                  )}
                  {/* Hover Overlay with Actions */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClick(template.id);
                    }}
                    className={`px-4 py-2 rounded-lg font-semibold transform hover:scale-105 transition-all ${
                      template.popular && !isPremium
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {template.popular && !isPremium ? 'Upgrade to Use' : 'Select'}
                  </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(template);
                      }}
                      className="bg-white text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transform hover:scale-105 transition-all"
                    >
                      Preview
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-center">
                  <p className="text-sm font-medium text-gray-700">{template.name}</p>
                  <p className="text-xs text-gray-500 mt-1">Template {template.id}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 mb-24">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xl font-semibold text-gray-600 mb-2">No templates found</p>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Preview Modal */}
        {previewTemplate && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
            onClick={closePreview}
          >
            <div 
              className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closePreview}
                className="absolute top-4 right-4 bg-gray-200 hover:bg-gray-300 rounded-full p-2 z-10 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{previewTemplate.name}</h3>
                <p className="text-gray-600 mb-4">Template {previewTemplate.id}</p>
                <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
                  <img 
                    src={previewTemplate.image} 
                    alt={previewTemplate.name} 
                    className="w-full h-auto"
                  />
                </div>
                <div className="mt-6 flex gap-4 justify-end">
                  <button
                    onClick={closePreview}
                    className="px-6 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      const template = templates.find(t => t.id === previewTemplate.id);
                      if (template && template.popular && !isPremium) {
                        closePreview();
                        const confirmUpgrade = window.confirm(
                          "This is a Premium template! Upgrade to Premium to access this template.\n\nWould you like to upgrade now?"
                        );
                        if (confirmUpgrade) {
                          navigate("/payment");
                        }
                      } else {
                        handleClick(previewTemplate.id);
                        closePreview();
                      }
                    }}
                    className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                      previewTemplate.popular && !isPremium
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {previewTemplate.popular && !isPremium ? 'Upgrade to Use' : 'Select This Template'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Fixed Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t-2 shadow-lg z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <button 
            onClick={() => navigate('/payment')}
            className="hidden sm:flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Go Premium
          </button>
          <div className="flex gap-4">
            <button 
              className="font-semibold text-lg text-blue-600 hover:text-blue-800 transition-colors px-6 py-2"
              onClick={() => navigate('/')}
            >
              Choose Later
            </button>
            <button 
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full h-12 px-8 text-lg font-semibold text-gray-800 hover:from-yellow-500 hover:to-yellow-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105" 
              onClick={handleChooseTemplateClick}
            >
              Choose Template
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Choose_templates;
