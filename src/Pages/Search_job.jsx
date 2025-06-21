import React, { useEffect, useState } from "react";
import Naavbar from "./Naavbar";

const Search_job = () => {
  const [query, setQuery] = useState("");
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);

  //fetch companies from django backend
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/companies"); 
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setCompanies(data);
        setFilteredCompanies(data); // Initially show all companies
      } catch (error) {
        console.error("Error fetching companies:", error);
      }
    };
    

    fetchCompanies();
  }, []);

  //function to handle input change
  const handleInputChange = (e) => {
    const searchQuery = e.target.value.toLowerCase();
    setQuery(searchQuery);

    //filter query based on the search input
    if (searchQuery) {
      const filtered = companies.filter((company) =>
        company.name.toLowerCase().includes(searchQuery)
      );
      setFilteredCompanies(filtered);
    } else {
      setFilteredCompanies(companies);
    }
  };

  //function to handle form submission
  const handleSubmit = (e) => {
    e.preventDefault(); //prevent default form submission
    console.log("search Query:", query);
  };
  return (
    <div>
      {/*import garako navbaar*/}
      <Naavbar />

      {/*Search bar */}
      <p className=" w-[300px] text-xl ml-[600px] font-bold text-blue-500">
        Search your dream job with us
      </p>
      <div>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Search..."
            value={query}
            onChange={handleInputChange}
            className="border p-2 rounded-md w-[400px] ml-[500px] mt-4"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white p-2 rounded-md ml-2"
          >
            Search
          </button>
        </form>

        {/* To display companies  */}
        <div className="mt-4 ml-[500px]">
          {filteredCompanies.length > 0 ? (
            filteredCompanies.map((company) => (
              <div
                key={company.id}
                className="border p-2 rounded-md w-[400px] mb-2"
              >
                <p className="font-semibold">{company.name}</p>
                <p className="text-sm">{company.location}</p>
                <p className="text-sm">{company.industry}</p>
              </div>
            ))
          ) : (
            <p className="text-red-500">
              Sorry for the disturbance no companies to show
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Search_job;
