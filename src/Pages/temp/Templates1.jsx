import React from 'react';

const Templates1 = () => {
  return (
    <div className="w-full max-w-3xl mx-auto p-4 border border-gray-300">
      <div className="flex">
        {/* Left Column */}
        <div className="w-1/3 bg-blue-900 text-white p-4">
          <h1 className="text-3xl font-bold">Dfbd</h1>
          <h2 className="text-xl">Dfvfwft</h2>
          <p className="text-lg italic">Profession</p>

          <div className="mt-8">
            <h3 className="text-xl font-bold">Contact</h3>
            <div className="mt-4">
              <p><strong>Address</strong></p>
              <p>Dsfrwe 3333</p>
              <p><strong>Phone</strong></p>
              <p>3453523</p>
              <p><strong>E-mail</strong></p>
              <p>dwdwed@gmail.com</p>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-xl font-bold">Skills</h3>
            <ul className="mt-4 space-y-2">
              <li>Skill 1</li>
              <li>Skill 2</li>
              <li>Skill 3</li>
              <li>Skill 4</li>
            </ul>
          </div>
        </div>

        {/* Right Column */}
        <div className="w-2/3 bg-white text-gray-800 p-4">
          <div className="mb-6">
            <h3 className="text-xl font-bold">Work History</h3>
            <p className="mt-2">
              Summarize your work experience by listing each job and your responsibilities in 2-3 lines. Start with your most recent job and work backwards using the format below.
            </p>
            <div className="mt-4">
              <p className="font-bold">Job Title 1</p>
              <p className="italic">Company Name</p>
              <ul className="list-disc pl-5">
                <li>Responsibilities</li>
                <li>Responsibilities</li>
                <li>Responsibilities</li>
              </ul>
            </div>
            <div className="mt-4">
              <p className="font-bold">Job Title 2</p>
              <p className="italic">Company Name</p>
              <ul className="list-disc pl-5">
                <li>Responsibilities</li>
                <li>Responsibilities</li>
                <li>Responsibilities</li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold">Education</h3>
            <div className="mt-4">
              <p>09/2017 - 07/2020</p>
              <p className="font-bold">Degree: Field of Study</p>
              <p>School Name - City - Mention (if applicable)</p>
            </div>
            <div className="mt-4">
              <p>09/2017 - 07/2020</p>
              <p className="font-bold">Degree: Field of Study</p>
              <p>School Name - City - Mention (if applicable)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Templates1;
