import React, { useState } from 'react'
import Naavbar from './Naavbar'

const Create_job = () => {
  const [formData, setFormData] = useState({
    jobTitle: '',
    companyName: '',
    location: '',
    employmentType: '',
    salaryRange: '',
    jobDescription: '',
    responsibilities: '',
    requirements: '',
    qualifications: '',
    experience: '',
    skills: '',
    benefits: '',
    applicationDeadline: '',
    contactEmail: '',
    companyWebsite: '',
    remoteOption: false
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target
    setFormData({
      ...formData,
      [id]: type === 'checkbox' ? checked : value
    })
    // Clear error for this field when user starts typing
    if (errors[id]) {
      setErrors({
        ...errors,
        [id]: ''
      })
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.jobTitle.trim()) {
      newErrors.jobTitle = 'Job title is required'
    }
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required'
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required'
    }
    if (!formData.employmentType) {
      newErrors.employmentType = 'Employment type is required'
    }
    if (!formData.jobDescription.trim()) {
      newErrors.jobDescription = 'Job description is required'
    }
    if (!formData.requirements.trim()) {
      newErrors.requirements = 'Requirements are required'
    }
    if (!formData.contactEmail.trim()) {
      newErrors.contactEmail = 'Contact email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Please enter a valid email address'
    }
    if (!formData.applicationDeadline) {
      newErrors.applicationDeadline = 'Application deadline is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    
    try {
      // Here you would typically send the data to your backend API
      // const response = await fetch('http://localhost:8000/api/jobs/', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(formData)
      // })
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log('Job posting data:', formData)
      alert('Job posted successfully!')
      
      // Reset form
      setFormData({
        jobTitle: '',
        companyName: '',
        location: '',
        employmentType: '',
        salaryRange: '',
        jobDescription: '',
        responsibilities: '',
        requirements: '',
        qualifications: '',
        experience: '',
        skills: '',
        benefits: '',
        applicationDeadline: '',
        contactEmail: '',
        companyWebsite: '',
        remoteOption: false
      })
    } catch (error) {
      console.error('Error posting job:', error)
      alert('Failed to post job. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Naavbar/>
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Post a Job Opening</h1>
          <p className="text-gray-600">Fill out the form below to post your job and reach qualified candidates</p>
        </div>

        {/* Job Posting Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          
          {/* Job Title */}
          <div>
            <label htmlFor="jobTitle" className="block text-gray-700 font-semibold mb-2">
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="jobTitle"
              value={formData.jobTitle}
              onChange={handleChange}
              placeholder="e.g., Senior Software Engineer"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.jobTitle ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.jobTitle && <p className="text-red-500 text-sm mt-1">{errors.jobTitle}</p>}
          </div>

          {/* Company Name and Location Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="companyName" className="block text-gray-700 font-semibold mb-2">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="Your company name"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.companyName ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.companyName && <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>}
            </div>

            <div>
              <label htmlFor="location" className="block text-gray-700 font-semibold mb-2">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., New York, NY or Remote"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.location ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
            </div>
          </div>

          {/* Employment Type and Salary Range Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="employmentType" className="block text-gray-700 font-semibold mb-2">
                Employment Type <span className="text-red-500">*</span>
              </label>
              <select
                id="employmentType"
                value={formData.employmentType}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.employmentType ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select employment type</option>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="temporary">Temporary</option>
                <option value="internship">Internship</option>
                <option value="freelance">Freelance</option>
              </select>
              {errors.employmentType && <p className="text-red-500 text-sm mt-1">{errors.employmentType}</p>}
            </div>

            <div>
              <label htmlFor="salaryRange" className="block text-gray-700 font-semibold mb-2">
                Salary Range (Optional)
              </label>
              <input
                type="text"
                id="salaryRange"
                value={formData.salaryRange}
                onChange={handleChange}
                placeholder="e.g., $80,000 - $120,000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Remote Option Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="remoteOption"
              checked={formData.remoteOption}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="remoteOption" className="ml-2 text-gray-700 font-medium">
              Remote work available
            </label>
          </div>

          {/* Job Description */}
          <div>
            <label htmlFor="jobDescription" className="block text-gray-700 font-semibold mb-2">
              Job Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="jobDescription"
              value={formData.jobDescription}
              onChange={handleChange}
              rows="5"
              placeholder="Provide a comprehensive overview of the position and what makes it exciting..."
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y ${
                errors.jobDescription ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.jobDescription && <p className="text-red-500 text-sm mt-1">{errors.jobDescription}</p>}
          </div>

          {/* Key Responsibilities */}
          <div>
            <label htmlFor="responsibilities" className="block text-gray-700 font-semibold mb-2">
              Key Responsibilities (Optional)
            </label>
            <textarea
              id="responsibilities"
              value={formData.responsibilities}
              onChange={handleChange}
              rows="4"
              placeholder="List the main responsibilities and duties for this role (one per line)..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            />
          </div>

          {/* Requirements */}
          <div>
            <label htmlFor="requirements" className="block text-gray-700 font-semibold mb-2">
              Requirements <span className="text-red-500">*</span>
            </label>
            <textarea
              id="requirements"
              value={formData.requirements}
              onChange={handleChange}
              rows="4"
              placeholder="List the required skills, experience, or qualifications (one per line)..."
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y ${
                errors.requirements ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.requirements && <p className="text-red-500 text-sm mt-1">{errors.requirements}</p>}
          </div>

          {/* Qualifications and Experience Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="qualifications" className="block text-gray-700 font-semibold mb-2">
                Preferred Qualifications (Optional)
              </label>
              <textarea
                id="qualifications"
                value={formData.qualifications}
                onChange={handleChange}
                rows="3"
                placeholder="Preferred but not required qualifications..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
              />
            </div>

            <div>
              <label htmlFor="experience" className="block text-gray-700 font-semibold mb-2">
                Years of Experience (Optional)
              </label>
              <input
                type="text"
                id="experience"
                value={formData.experience}
                onChange={handleChange}
                placeholder="e.g., 3-5 years"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Required Skills */}
          <div>
            <label htmlFor="skills" className="block text-gray-700 font-semibold mb-2">
              Required Skills (Optional)
            </label>
            <input
              type="text"
              id="skills"
              value={formData.skills}
              onChange={handleChange}
              placeholder="e.g., JavaScript, React, Node.js, AWS (comma-separated)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Benefits */}
          <div>
            <label htmlFor="benefits" className="block text-gray-700 font-semibold mb-2">
              Benefits & Perks (Optional)
            </label>
            <textarea
              id="benefits"
              value={formData.benefits}
              onChange={handleChange}
              rows="3"
              placeholder="List benefits and perks (e.g., Health insurance, 401(k), Flexible hours)..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            />
          </div>

          {/* Application Deadline and Contact Email Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="applicationDeadline" className="block text-gray-700 font-semibold mb-2">
                Application Deadline <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="applicationDeadline"
                value={formData.applicationDeadline}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.applicationDeadline ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.applicationDeadline && <p className="text-red-500 text-sm mt-1">{errors.applicationDeadline}</p>}
            </div>

            <div>
              <label htmlFor="contactEmail" className="block text-gray-700 font-semibold mb-2">
                Contact Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="contactEmail"
                value={formData.contactEmail}
                onChange={handleChange}
                placeholder="hr@company.com"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.contactEmail ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.contactEmail && <p className="text-red-500 text-sm mt-1">{errors.contactEmail}</p>}
            </div>
          </div>

          {/* Company Website */}
          <div>
            <label htmlFor="companyWebsite" className="block text-gray-700 font-semibold mb-2">
              Company Website (Optional)
            </label>
            <input
              type="url"
              id="companyWebsite"
              value={formData.companyWebsite}
              onChange={handleChange}
              placeholder="https://www.company.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 px-6 rounded-lg font-bold text-white transition duration-200 ${
                isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              }`}
            >
              {isSubmitting ? 'Posting Job...' : 'Post Job Opening'}
            </button>
          </div>

          {/* Required Fields Note */}
          <p className="text-sm text-gray-500 text-center">
            <span className="text-red-500">*</span> Indicates required fields
          </p>
        </form>
      </div>
    </div>
  )
}

export default Create_job