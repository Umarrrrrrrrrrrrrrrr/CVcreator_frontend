import React, { useState } from "react";
import { useRef } from "react";
import { useLocation } from "react-router-dom";
// import html2pdf from "html2pdf.js";
// import { html2pdf } from "html2pdf.js";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import Logo from "../assets/logoo.png"


const Fill_cv = () => {
  const location = useLocation();
  const templateId = Number(location.state?.templateId);
  const selectedColor = location.state?.selectedColor || null;
  const cvRef = useRef(null); // ref to capture the cv section
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Color mapping function - returns inline style object
  const getColorStyle = (defaultColor = 'blue-900', shade = 'default') => {
    if (!selectedColor) return {};
    
    // Map color names to hex/rgb values
    const colorValues = {
      'white': { default: '#ffffff', light: '#f9fafb', dark: '#f3f4f6' },
      'gray': { default: '#6b7280', light: '#d1d5db', dark: '#374151' },
      'blue': { default: '#2563eb', light: '#60a5fa', dark: '#1e3a8a' },
      'dark blue': { default: '#1e3a8a', light: '#1e40af', dark: '#1e3a8a' },
      'purple': { default: '#9333ea', light: '#c084fc', dark: '#581c87' },
      'light blue': { default: '#60a5fa', light: '#93c5fd', dark: '#2563eb' },
      'green': { default: '#22c55e', light: '#4ade80', dark: '#15803d' },
      'red': { default: '#dc2626', light: '#f87171', dark: '#991b1b' },
      'pink': { default: '#db2777', light: '#f472b6', dark: '#9f1239' },
      'yellow': { default: '#facc15', light: '#fde047', dark: '#ca8a04' }
    };
    
    const colorValue = colorValues[selectedColor.name];
    if (!colorValue) return {};
    
    // Determine shade based on default color
    let selectedShade = colorValue.default;
    if (defaultColor.includes('700') || defaultColor.includes('800')) {
      selectedShade = colorValue.dark || colorValue.default;
    } else if (defaultColor.includes('100') || defaultColor.includes('200')) {
      selectedShade = colorValue.light || colorValue.default;
    }
    
    return { backgroundColor: selectedShade };
  };

  // Get text color based on background (for contrast)
  const getTextColor = () => {
    if (!selectedColor) return 'text-white';
    
    const lightColors = ['white', 'yellow', 'light blue'];
    return lightColors.includes(selectedColor.name) ? 'text-gray-800' : 'text-white';
  };

  // Get color class for Tailwind (fallback)
  const getColorClass = (defaultColor = 'blue-900') => {
    if (!selectedColor) return `bg-${defaultColor}`;
    return `bg-${defaultColor}`; // Keep default for non-colored elements
  };


   

    // Helper function to wait for all images to load
    const waitForImages = (element) => {
      return new Promise((resolve) => {
        const images = element.querySelectorAll('img');
        if (images.length === 0) {
          resolve();
          return;
        }

        let loadedCount = 0;
        const totalImages = images.length;

        const checkComplete = () => {
          loadedCount++;
          if (loadedCount === totalImages) {
            resolve();
          }
        };

        images.forEach((img) => {
          if (img.complete) {
            checkComplete();
          } else {
            img.onload = checkComplete;
            img.onerror = checkComplete; // Continue even if image fails to load
            // Force reload if src is a blob URL
            if (img.src.startsWith('blob:')) {
              const newImg = new Image();
              newImg.onload = () => {
                img.src = newImg.src;
                checkComplete();
              };
              newImg.onerror = checkComplete;
              newImg.src = img.src;
            }
          }
        });
      });
    };

    // Enhanced download function with high quality - captures ALL content
    const handleDownload = async (format = 'pdf') => {
      if (!cvRef.current) {
        alert('CV content not found. Please try again.');
        return;
      }

      setIsDownloading(true);
      setDownloadProgress(10);

      try {
        // Find the actual template content (might be nested)
        let element = cvRef.current;
        
        // If the ref is on a wrapper, find the actual template div
        const templateDiv = element.querySelector('div[style*="height"], div[class*="max-w"]');
        if (templateDiv && templateDiv !== element) {
          // Check if templateDiv is a direct child or nested
          const isDirectChild = Array.from(element.children).includes(templateDiv);
          if (isDirectChild || templateDiv.offsetHeight > 500) {
            element = templateDiv;
          }
        }

        // Store original styles to restore later
        const originalStyles = {
          border: element.style.border,
          boxShadow: element.style.boxShadow,
          overflow: element.style.overflow,
          height: element.style.height,
          maxHeight: element.style.maxHeight,
          position: element.style.position,
          transform: element.style.transform,
          opacity: element.style.opacity,
          display: element.style.display
        };

        // Prepare element for full content capture
        setDownloadProgress(15);
        
        // Remove ALL height restrictions to show all content
        element.style.overflow = 'visible';
        element.style.height = 'auto';
        element.style.maxHeight = 'none';
        element.style.border = 'none';
        element.style.boxShadow = 'none';
        element.style.position = 'relative';
        element.style.transform = 'none';
        element.style.opacity = '1';
        element.style.display = 'block';

        // Also ensure ALL child elements show full content
        const allChildren = element.querySelectorAll('*');
        const childStyles = new Map();
        
        allChildren.forEach((child) => {
          const childElement = child;
          const computedStyle = getComputedStyle(childElement);
          
          // Store original styles
          childStyles.set(childElement, {
            overflow: childElement.style.overflow,
            maxHeight: childElement.style.maxHeight,
            height: childElement.style.height,
            display: childElement.style.display,
            visibility: childElement.style.visibility
          });
          
          // Remove overflow hidden from children
          if (computedStyle.overflow === 'hidden' || computedStyle.overflow === 'auto') {
            childElement.style.overflow = 'visible';
          }
          
          // Remove ALL height restrictions
          if (computedStyle.height && computedStyle.height !== 'auto') {
            if (childElement.tagName === 'DIV' || childElement.tagName === 'SECTION') {
              childElement.style.height = 'auto';
            }
          }
          
          // Remove max-height restrictions
          if (computedStyle.maxHeight && computedStyle.maxHeight !== 'none') {
            childElement.style.maxHeight = 'none';
          }
          
          // Ensure textareas show ALL content
          if (childElement.tagName === 'TEXTAREA') {
            // First, set height to auto to let it expand
            childElement.style.height = 'auto';
            childElement.style.overflow = 'visible';
            childElement.style.resize = 'none';
            // Force expansion to show all content
            const scrollHeight = childElement.scrollHeight;
            if (scrollHeight > 0) {
              childElement.style.height = scrollHeight + 'px';
              childElement.style.minHeight = scrollHeight + 'px';
            }
          }
          
          // Ensure inputs are visible
          if (childElement.tagName === 'INPUT') {
            childElement.style.visibility = 'visible';
            childElement.style.opacity = '1';
          }
          
          // Ensure all content is visible
          childElement.style.display = computedStyle.display === 'none' ? 'block' : '';
          childElement.style.visibility = 'visible';
        });

        // Force multiple reflows to ensure all styles are applied
        void element.offsetHeight;
        void element.scrollHeight;
        await new Promise(resolve => setTimeout(resolve, 50));
        void element.offsetHeight;

        // Wait for all images to load
        setDownloadProgress(25);
        await waitForImages(element);
        
        // Additional delay to ensure all content is rendered
        await new Promise(resolve => setTimeout(resolve, 200));

        // Scroll to top to ensure we capture from the beginning
        if (element.scrollTop > 0) {
          element.scrollTop = 0;
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        setDownloadProgress(40);

        // Get the actual content dimensions (including overflow)
        const contentWidth = Math.max(
          element.scrollWidth,
          element.offsetWidth,
          element.clientWidth
        );
        const contentHeight = Math.max(
          element.scrollHeight,
          element.offsetHeight,
          element.clientHeight
        );

        // High-quality canvas capture with improved settings - captures FULL content
        const canvas = await html2canvas(element, {
          scale: 4, // High resolution for print quality
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false,
          width: contentWidth,
          height: contentHeight,
          windowWidth: contentWidth,
          windowHeight: contentHeight,
          scrollX: 0,
          scrollY: 0,
          removeContainer: false, // Keep container to capture everything
          imageTimeout: 20000, // 20 second timeout for images
          onclone: (clonedDoc, clonedElement) => {
            // Ensure all content is visible in cloned document
            clonedElement.style.overflow = 'visible';
            clonedElement.style.height = 'auto';
            clonedElement.style.maxHeight = 'none';
            
            // Make all children visible
            const clonedChildren = clonedElement.querySelectorAll('*');
            clonedChildren.forEach((child) => {
              const childEl = child;
              childEl.style.overflow = 'visible';
              childEl.style.maxHeight = 'none';
              
              // Ensure textareas show ALL content
              if (childEl.tagName === 'TEXTAREA') {
                childEl.style.height = 'auto';
                childEl.style.overflow = 'visible';
                childEl.style.resize = 'none';
                // Force expansion
                const scrollHeight = childEl.scrollHeight;
                if (scrollHeight > 0) {
                  childEl.style.height = scrollHeight + 'px';
                  childEl.style.minHeight = scrollHeight + 'px';
                }
              }
              
              // Ensure inputs are visible
              if (childEl.tagName === 'INPUT') {
                childEl.style.visibility = 'visible';
                childEl.style.opacity = '1';
              }
            });

            // Ensure all images are properly loaded
            const images = clonedElement.querySelectorAll('img');
            images.forEach((img) => {
              img.style.visibility = 'visible';
              img.style.opacity = '1';
              if (img.src && !img.complete) {
                const newImg = new Image();
                newImg.crossOrigin = 'anonymous';
                newImg.src = img.src;
                img.src = newImg.src;
              }
            });
          }
        });

        // Restore all original styles
        Object.keys(originalStyles).forEach((key) => {
          if (originalStyles[key] !== undefined && originalStyles[key] !== null) {
            element.style[key] = originalStyles[key];
          } else {
            element.style[key] = '';
          }
        });

        // Restore children styles
        childStyles.forEach((styles, child) => {
          Object.keys(styles).forEach((key) => {
            if (styles[key] !== undefined && styles[key] !== null) {
              child.style[key] = styles[key];
            } else {
              child.style[key] = '';
            }
          });
        });

        setDownloadProgress(60);

        if (format === 'png') {
          // Download as PNG
          const link = document.createElement('a');
          link.download = `CV_Template_${templateId}_${new Date().getTime()}.png`;
          link.href = canvas.toDataURL('image/png', 1.0); // Maximum quality
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setDownloadProgress(100);
        } else {
          // Download as PDF
          const imgData = canvas.toDataURL('image/png', 1.0);
          
          setDownloadProgress(70);

          // A4 dimensions in mm
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
          });

          const imgWidth = 210; // A4 width in mm
          const pageHeight = 297; // A4 height in mm
          const pageWidth = 210;
          
          // Calculate image dimensions maintaining aspect ratio
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          // Ensure we capture the full image height
          const totalHeight = Math.max(imgHeight, canvas.height * (imgWidth / canvas.width));
          
          let heightLeft = totalHeight;
          let position = 0;
          let pageNumber = 1;

          // Add first page with full content
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, totalHeight, undefined, 'FAST');
          heightLeft -= pageHeight;

          setDownloadProgress(85);

          // Add additional pages if content overflows - ensure NO content is cut off
          while (heightLeft > 0) {
            position = heightLeft - pageHeight;
            // Ensure we don't skip any content
            if (position < 0) {
              position = 0;
            }
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, totalHeight, undefined, 'FAST');
            heightLeft -= pageHeight;
            pageNumber++;
            
            // Safety check to prevent infinite loop
            if (pageNumber > 50) {
              console.warn('PDF generation stopped at 50 pages to prevent infinite loop');
              break;
            }
          }

          setDownloadProgress(95);

          // Generate filename with timestamp
          const timestamp = new Date().toISOString().split('T')[0];
          const filename = `CV_Template_${templateId}_${timestamp}.pdf`;
          
          pdf.save(filename);
          setDownloadProgress(100);
        }

        // Show success message
        setTimeout(() => {
          setIsDownloading(false);
          setDownloadProgress(0);
        }, 1000);

      } catch (error) {
        console.error('Download error:', error);
        alert('Failed to download CV. Please try again or check the console for details.');
        setIsDownloading(false);
        setDownloadProgress(0);
      }
    };

  //state for the editable field template 1

  const [contact, setContact] = useState("Contact Info");
  const [addressLabel, setAddressLabel] = useState("Address");
  const [phoneLabel, setPhoneLabel] = useState("Phone");
  const [emailLabel, setEmailLabel] = useState("E-mail");
  const [skillsLabel, setSkillsLabel] = useState("Skills");

  const [name, setName] = useState("Name");
  const [profession, setProfession] = useState("Profession");
  const [address, setAddress] = useState("Your Address");
  const [phone, setPhone] = useState("0000000000");
  const [email, setEmail] = useState("3453523");
  const [skills, setSkills] = useState([
    "Skill 1",
    "Skill 2",
    "Skill 3",
    "Skill 4",
  ]);

  const [work, setWork] = useState("Work History");

  const [brief, setBrief] = useState(
    "Summarize your work experience by listing each job and your responsibilities in 2-3 lines. Start with your most recent job and work backwards using the format below."
  );
  const [title1, setTitle1] = useState("Job Title 1");
  const [company1, setCompany1] = useState("Company Name");
  const [responsibilities1, setResponsibilities1] = useState([
    "Responsibilities",
    "Responsibilities",
    "Responsibilities",
  ]);
  const [title2, setTitle2] = useState("Job Title 2");
  const [company2, setCompany2] = useState("Company Name");
  const [responsibilities2, setResponsibilities2] = useState([
    "Responsibilities",
    "Responsibilities",
    "Responsibilities",
  ]);
  const [education, setEducation] = useState("Education");
  const [date1, setDate1] = useState("09/2017 - 07/2020");
  const [degree1, setDegree1] = useState("Degree: Field of Study");
  const [school, setSchool] = useState(
    "School Name - City - Mention (if applicable)"
  );

  const [date2, setDate2] = useState("09/2017 - 07/2020");
  const [degree2, setDegree2] = useState("Degree: Field of Study");
  const [college, setCollege] = useState(
    "College Name - City - Mention (if applicable)"
  );

  const handleSkillChange = (index, value) => {
    const newSkills = [...skills];
    newSkills[index] = value;
    setSkills(newSkills);
  };

  const handleResponsibilitiesChange1 = (index, value) => {
    const newResponsibilities1 = [...responsibilities1];
    newResponsibilities1[index] = value;
    setResponsibilities1(newResponsibilities1);
  };

  const handleResponsibilitiesChange2 = (index, value) => {
    const newResponsibilities2 = [...responsibilities2];
    newResponsibilities2[index] = value;
    setResponsibilities2(newResponsibilities2);
  };

  //template one states completed here
  //States for the template two

  const [contactInfotemp2, setContactInfotemp2] = useState(
    "Contact Information"
  );
  const [nametemp2, setNametemp2] = useState("Name: Sarah Lee");
  const [emailtemp2, setEmailtemp2] = useState("Email: sarah.lee@example.com");
  const [phonetemp2, setPhonetemp2] = useState("Phone: (555) 555-5555");
  const [websitetemp2, setWebsitetemp2] = useState("Website: www.sarahlee.com");

  const [skillsLabeltemp2, setskillsLabeltemp2] = useState("Skills");
  const [skillstemp2, setSkillstemp2] = useState([
    "JavaScript",
    "React",
    "Node.js",
    "Python",
  ]);
  const handleskillstemp2Change = (index, value) => {
    const newskillstemp2 = [...skillstemp2];
    newskillstemp2[index] = value;
    setSkillstemp2(newskillstemp2);
  };

  //   const [jstemp2, setJstemp2] = useState("JavaScript");
  //   const [reacttemp2, setReacttemp2] = useState("React");
  //   const [nodetemp2, setNodetemp2] = useState("Node.js");
  //   const [pythontemp2, setPythontemp2] = useState("Python");

  const [educationLabeltemp2, setEducationLabeltemp2] = useState("Education");
  const [educationtemp2, setEducationtemp2] = useState(
    "Bachelor of Science in Computer Science"
  );
  const [universitytemp2, setUniversitytemp2] = useState("State University");
  const [datetemp2, setDatetemp2] = useState("09/2014 - 06/2018");

  const [profiletemp2, setProfileTemp2] = useState("Profile");
  const [profileinfotemp2, setProfileinfoTemp2] = useState(
    "Full-stack developer with a passion for building efficient and scalable applications. Proficient in both frontend and backend technologies."
  );

  const [experiencetemp2, setExperiencetemp2] = useState("Experience");

  const [post1temp2, setPost1temp2] = useState("Full Stack Developer");

  const [company1temp2, setCompany1temp2] = useState("Tech Corp");
  const [workdone1temp2, setWorkdone1temp2] = useState([
    "Developed and maintained web applications using JavaScript, React, and Node.js.",
    "Collaborated with design teams to create user-friendly interfaces.",
    "Implemented RESTful APIs to improve data retrieval.",
  ]);
  const handleWorkdone1Change = (index, value) => {
    const newworkdone1 = [...workdone1temp2];
    newworkdone1[index] = value;
    setWorkdone1temp2(newworkdone1);
  };

  const [post2temp2, setPost2temp2] = useState("Junior Developer");
  const [company2temp2, setCompany2temp2] = useState("Innovatech");
  const [workdone2temp2, setWorkdone2temp2] = useState([
    "Assisted in the development of web applications using JavaScript and Python.",
    "Worked with senior developers to troubleshoot and debug software issues.",
    "Participated in code reviews and contributed to the development of best practices.",
  ]);

  const handleWorkdone2Change = (index, value) => {
    const newworkdone2 = [...workdone2temp2];
    newworkdone2[index] = value;
    setWorkdone2temp2(newworkdone2);
  };

  //end of states for the template 2

  //states for the template 3

  const [nametemp3, setNametemp3] = useState("John Doe");
  const [professiontemp3, setProfessiontemp3] = useState("Web Developer");
  const [contactlabeltemp3, setContactLabeltemp3] = useState(
    "Contact Information"
  );
  const [addresstemp3, setAddresstemp3] = useState("1234 Elm Street");
  const [numbertemp3, setNumbertemp3] = useState("(123) 456-7890");
  const [emailtemp3, setEmailtemp3] = useState("john.doe@example.com");
  const [skillsLabeltemp3, setSkillsLabeltemp3] = useState("Skills");
  const [skillstemp3, setSkillstemp3] = useState([
    "JavaScript",
    "Python",
    "React",
    "Django",
  ]);
  const handleSkillsChange = (index, value) => {
    const newskillstemp3 = [...skillstemp3];
    newskillstemp3[index] = value;
    setSkillstemp3(newskillstemp3);
  };

  const [educationLabeltemp3, setEducationLabeltemp3] = useState("Education");
  const [facultytemp3, setFacultytemp3] = useState("B.SC. Computer Science");
  const [universitytemp3, setUniversitytemp3] = useState(
    "University of Technology"
  );
  const [graduationtemp3, setGraduationtemp3] = useState("09/2015 - 06/2019");

  const [languagesLabeltemp3, setLanguagesLabeltemp3] = useState("Languages");
  const [languagesListtemp3, setLanguagesListtemp3] = useState([
    "English",
    "Spanish",
    "French",
  ]);
  const handleLanguagesListChange = (index, value) => {
    const newlanguagesList = [...languagesListtemp3];
    newlanguagesList[index] = value;
    setLanguagesListtemp3(newlanguagesList);
  };

  const [workexpLabeltemp3, setWorkexpLabeltemp3] = useState("Work Experience");
  const [posttemp3, setPosttemp3] = useState("Front-End Developer");
  const [companytemp3, setCompanytemp3] = useState("XYZ company");
  const [workdonetemp3, setWorkdonetemp3] = useState([
    "Developed responsive websites and web applications.",
    "Collaborated with designers and back-end developers.",
    "Optimized code for performance and scalability.",
  ]);
  const handleWorkdonetemp3Change = (index, value) => {
    const newworkdonetemp3 = [...workdonetemp3];
    newworkdonetemp3[index] = value;
    setWorkdonetemp3(newworkdonetemp3);
  };

  const [post2temp3, setPost2temp3] = useState("Junior Developer");
  const [company2temp3, setCompany2temp3] = useState("ABC company");
  const [workdone2temp3, setWorkdone2temp3] = useState([
    "Assisted in developing and maintaining websites.",
    "Wrote clean, efficient, and maintainable code.",
    "Performed testing and debugging of web applications.",
  ]);
  const handleWorkdone2temp3Change = (index, value) => {
    const newworkdone2temp3 = [...workdone2temp3];
    newworkdone2temp3[index] = value;
    setWorkdone2temp3(newworkdone2temp3);
  };

  //end of template 3

  //state for the template 4
  //state for the template 4
  //state for the template 4
  //state for the template 4
  //state for the template 4
  const [nametemp4, setNametemp4] = useState("Michael Smith");
  const [profession4, setProfessiontemp4] = useState("Software Engineer");
  const [aboutmetemp4, setAboutmetemp4] = useState("About Me");
  const [aboutmeinfotemp4, setAboutmeinfotemp4] = useState(
    "Dedicated software engineer with 7 years of experience in developing high-performance web applications. Proficient in JavaScript, Python, and cloud technologies."
  );
  const [skillslabeltemp4, setSkillslabeltemp4] = useState("Skills");
  const [skillstemp4, setSkillstemp4] = useState([
    "JavaScript",
    "React",
    "Node.js",
    "Python",
    "AWS",
  ]);
  const handleskillstemp4Change = (index, value) => {
    const newskillstemp4 = [...skillstemp4];
    newskillstemp4[index] = value;
    setSkillstemp4(newskillstemp4);
  };
  const [experiencetemp4, setExperiencetemp4] = useState("Experience");
  const [posttemp4, setPosttemp4] = useState("Senior Software Engineer");
  const [companytemp4, setCompanytemp4] = useState("Tech Solutions");
  const [workdonetemp4, setWorkdonetemp4] = useState([
    "Led the development of a scalable e-commerce platform.",
    "Integrated RESTful APIs and third-party services veery efficiently and well.",
    "Mentored junior developers and conducted code reviews.",
  ]);

  const handleworkdoneChange = (index, value) => {
    const newworkdonetemp4 = [...workdonetemp4];
    newworkdonetemp4[index] = value;
    setWorkdonetemp4(newworkdonetemp4);
  };

  const [post2temp4, setPost2temp4] = useState("Software Engineer");
  const [company2temp4, setCompany2temp4] = useState("Innovatech");
  const [workdone2temp4, setWorkdone2temp4] = useState([
    "Developed and maintained web applications using React and Node.js.",
    "Collaborated with cross-functional teams to deliver projects on time.",
    "Optimized applications for maximum speed and scalability.",
  ]);
  const handleworkdone2Change = (index, value) => {
    const newworkdone2temp4 = [...workdone2temp4];
    newworkdone2temp4[index] = value;
    setWorkdone2temp4(newworkdone2temp4);
  };

  const [educationtemp4, setEducationtemp4] = useState("Education");
  const [facultytemp4, setFacultytemp4] = useState(
    "Bachelor of Science in Computer Science"
  );
  const [collegetemp4, setCollegetemp4] = useState("State University");
  const [datetemp4, setDatetemp4] = useState("09/2010 - 06/2014");

  //end of the states of the temp4

  //states for the temp5
  //states for the temp5
  //states for the temp5
  //states for the temp5
  //states for the temp5
  //states for the temp5
  //states for the temp5
  //states for the temp5

  const [nametemp5, setNametemp5] = useState("Emily Johnson");
  const [professiontemp5, setProfessiontemp5] = useState(
    "Digital Marketing Specialist"
  );
  const [emailtemp5, setEmailtemp5] = useState(
    "mily.johnson@example.com | (555) 555-5555"
  );
  //   const [phonetemp5, setPhonetemp5] = useState(" (555) 555-5555");
  const [summary, setSummary] = useState("Summary");
  const [summarydetailstemp5, setSummarydetailtemo5] = useState(
    "Dynamic marketing professional with 6+ years of experience in digital campaigns, SEO, and content creation. Adept at leading cross-functional teams to deliver high-impact projects."
  );
  const [experiencetemp5, setExperiencetemp5] = useState("Experience");
  const [post1temp5, setPost1temp5] = useState(
    "Senior Digital Marketing Manager"
  );
  const [company1temp5, setCompany1temp5] = useState("XYZ Marketing Solutions");
  const [workdone1temp5, setWorkdonetemp5] = useState([
    "Led a team of 10 to develop and implement comprehensive marketing strategies.",
    "Increased online sales by 30% through targeted campaigns.",
    "Managed a $500k annual marketing budget.",
  ]);
  const handleworkdonetemp5Change = (index, value) => {
    const newworkdone1temp5 = [...workdone1temp5];
    newworkdone1temp5[index] = value;
    setWorkdonetemp5(newworkdone1temp5);
  };

  const [post2temp5, setPost2temp5] = useState("Digital Marketing Specialist");
  const [company2temp5, setCompany2temp5] = useState("ABC Tech");
  const [workdone2temp5, setWorkdone2temp5] = useState([
    "Optimized SEO for a website with 1 million monthly visitors.",
    "Developed content strategies that increased engagement by 40%.",
    "Collaborated with the sales team to align marketing strategies.",
  ]);
  const handleworkdone2temp5Change = (index, value) => {
    const newworkdone2temp5 = [...workdone2temp5];
    newworkdone2temp5[index] = value;
    setWorkdone2temp5(newworkdone2temp5);
  };
  const [educationtemp5, setEducationtemp5] = useState("Education");
  const [facultytemp5, setFacultytemp5] = useState(
    "Bachelor of Science in Marketing"
  );
  const [universitytemp5, setUniversitytemp5] = useState("State University");
  const [datetemp5, setDatetemp5] = useState("09/2008 - 06/2012");

  const [skillstemp5, setSkillstemp5] = useState("Skills");
  const [skillsdetailtemp5, setskillsdetailtemp5] = useState([
    "SEO & SEM",
    "Google Analytics",
    "Content Marketing",
    "Email Campaigns",
  ]);
  const handleskillstemp5Change = (index, value) => {
    const newskillsdetailtemp5 = [...skillsdetailtemp5];
    newskillsdetailtemp5[index] = value;
    setskillsdetailtemp5(newskillsdetailtemp5);
  };
  //end of the state for temp5
  //start of the state for temp6
  //start of the state for temp6
  //start of the state for temp6
  //start of the state for temp6
  //start of the state for temp6
  //start of the state for temp6
  //start of the state for temp6

  const [nametemp6, setNametemp6] = useState("John Doe");
  const [professiontemp6, setProfessiontemp6] = useState("Software Engineer");
  const [emailtemp6, setEmailtemp6] = useState("Email: john.doe@example.com");
  const [phonetemp6, setPhonetemp6] = useState("Phone: (555) 555-5555");
  const [webemailtemp6, setWebemailtemp6] = useState(
    "Website: www.johndoe.com"
  );
  const [profiletemp6, setProfiletemp6] = useState("Profile");
  const [profileinfotemp6, setProfileinfotemp6] = useState(
    "Experienced software engineer with a strong background in developing scalable web applications. Expertise in JavaScript, Python, and cloud services."
  );

  const [educationlabeltemp6, setEducationlabeltemp6] = useState("Education");
  const [facultytemp6, setFacultytemp6] = useState(
    "Bachelor  in Computer Science"
  );
  const [universitytemp6, setUniversitytemp6] = useState("State University");
  const [datetemp6, setDatetemp6] = useState("09/2010 - 06/2014");
  const [experiencetemp6, setExpriencetemp6] = useState("Experience");
  const [post1temp6, setPost1temp6] = useState("Senior Software Engineer");
  const [company1temp6, setComapny1temp6] = useState("Tech Solutions");
  const [workdone1temp6, setWorkdone1temp6] = useState([
    "Led the development of a scalable e-commerce platform.",
    "Integrated RESTful APIs and third-party services.",
    "Mentored junior developers and conducted code reviews.",
  ]);
  const handleworkdone1temp6Change = (index, value) => {
    const newworkdone1temp6 = [...workdone1temp6];
    newworkdone1temp6[index] = value;
    setWorkdone1temp6(newworkdone1temp6);
  };
  const [post2temp6, setPost2temp6] = useState("Software Engineer");
  const [company2temp6, setCompany2temp6] = useState("Innovatech");
  const [workdone2temp6, setWorkdone2temp6] = useState([
    "Developed and maintained web applications using React and Node.js.",
    "Collaborated with cross-functional teams to deliver projects on time.",
    "Optimized applications for maximum speed and scalability.",
  ]);

  const handleworkdone2temp6Change = (index, value) => {
    const newworkdone2temp6 = [...workdone2temp6];
    newworkdone2temp6[index] = value;
    setWorkdone2temp6(workdone2temp6);
  };


  

  //end of the state 6

  //state for the template 7
  //state for the template 7
  //state for the template 7
  //state for the template 7
  //state for the template 7
  //state for the template 7
  //state for the template 7

  const [nametemp7, setNametemp7] = useState("John Doe");
  const [professiontemp7, setProfessiontemp7] = useState("Software Engineer");
  const [contactlabeltemp7, setContactlabeltemp7] = useState("Contact");
  const [addresslabeltemp7, setAddresslabeltemp7] = useState("Address:");
  const [addresstemp7, setAddresstemp7] = useState(
    "1234 Elm Street, Springfield, IL"
  );
  const [phonetemp7, setPhonetemp7] = useState("Phone: (555) 555-5555");
  const [emaillabeltemp7, setEmaillabeltemp7] = useState("E-mail:");
  const [emailtemp7, setEmailtemp7] = useState("john.doe@example.com");
  const [skillslabeltemp7, setSkillslabeltemp7] = useState("Skills");
  const [skillstemp7, setSkillstemp7] = useState([
    "JavaScript",
    "React",
    "Node.js",
    "Python",
  ]);

  const handleskillstemp7Change = (index, value) => {
    const newskillstemp7 = [...skillstemp7];
    newskillstemp7[index] = value;
    setSkillstemp7(setSkillstemp7);
  };

  const [workhistorylabeltemp7, setWorkhistorylabeltemp7] =
    useState("Work History");
  const [workhistoryinfotemp7, setWorkhistoryinfotemp7] = useState(
    "Summarize your work experience by listing each job and your responsibilities in 2-3 lines. Start with your most recent job and work backwards using the format below."
  );
  const [post1temp7, setPost1temp7] = useState("Senior Developer");
  const [company1temp7, setCompany1temp7] = useState("Tech Innovations Inc.");
  const [workdone1temp7, setWorkdone1temp7] = useState([
    "- Led development of key features in a major product.",
    "- Collaborated with design teams to enhance user experience.",
    "- Optimized backend performance and scalability.",
  ]);

  const handleworkdone1temp7Change = (index, value) => {
    const newworkdone1temp7 = [...workdone1temp7];
    newworkdone1temp7[index] = value;
    newworkdone1temp7(setWorkdone1temp7);
  };

  const [post2temp7, setPost2temp7] = useState("Junior Developer");
  const [company2temp7, setCompany2temp7] = useState("Web Solutions Ltd.");
  const [workdone2temp7, setWorkdone2temp7] = useState([
    "- Worked on developing front-end components using React.",
    "- Participated in code reviews and contributed to team meetings.",
    "- Maintained and updated existing codebases.",
  ]);

  const handleworkdone2temp7Change = (index, value) => {
    const newworkdone2temp7 = [...workdone2temp7];
    newworkdone2temp7[index] = value;
    newworkdone2temp7(setWorkdone2temp7);
  };

  const [educationlabeltemp7, setEducationlabeltemp7] = useState("Education");
  const [facultytemp7, setFacultytemp7] = useState(
    "Bachelor of Science in Computer Science"
  );
  const [universitytemp7, setUniversitytemp7] = useState(
    "State University - Springfield, IL"
  );
  const [datetemp7, setDatetemp7] = useState("09/2015 - 05/2019");

  const [schooltemp7, setSchooltemp7] = useState("High School Diploma");
  const [facultyschooltemp7, setFacultyschooltemp7] = useState(
    "Springfield High School - Springfield, IL"
  );
  const [date2temp7, setDate2temp7] = useState("09/2011 - 05/2015");

  //end of the temp7

  //start of the state for the temp8
  //start of the state for the temp8
  //start of the state for the temp8
  //start of the state for the temp8
  //start of the state for the temp8
  //start of the state for the temp8

  const [contactinfolabeltemp8, setContactinfolabeltemp8] = useState(
    "Contact Information"
  );
  const [nametemp8, setNametemp8] = useState("Name: Sarah Lee");
  const [emailtemp8, setEmailtemp8] = useState("Email: sarah.lee@example.com");
  const [phonetemp8, setPhonetemp8] = useState("Phone: (555) 555-5555");
  const [websitetemp8, setWebsitetemp8] = useState("Website: www.sarahlee.com");
  const [skillslabeltemp8, setSkillslabeltemp8] = useState("Skills");
  const [skillstemp8, setSkillstemp8] = useState([
    "JavaScript",
    "React",
    "Node.js",
    "Python",
  ]);

  const handleskillstemp8Change = (index, value) => {
    const newskillstemp8 = [...skillstemp8];
    newskillstemp8[index] = value;
    setSkillstemp8(newskillstemp8);
  };

  const [educationlabeltemp8, setEducationlabeltemp8] = useState("Education");
  const [facultytemp8, setFacultytemp8] = useState(
    "Bachelor of Science in Computer Science"
  );
  const [universitytemp8, setUniversitytemp8] = useState("State University");
  const [datetemp8, setDatetemp8] = useState("09/2014 - 06/2018");
  const [profilelabeltemp8, setProfilelabeltemp8] = useState("Profile");
  const [profileinfotemp8, setProfileinfotemp8] = useState(
    "Full-stack developer with a passion for building efficient and scalable applications. Proficient in both frontend and backend technologies."
  );
  const [experiencelabeltemp8, setExperiencelabeltemp8] =
    useState("Experience");
  
  const [post1temp8, setPost1temp8] = useState("Full Stack Devloper");
  const [company1temp8, setCompany1temp8] = useState("Tech Corp");
  const [workdone1temp8, setWorkdonetemp8] = useState([
    "- Developed and maintained web applications using JavaScript, React, and Node.js.",
    "- Collaborated with design teams to create user-friendly interfaces.",
    "- Implemented RESTful APIs to improve data retrieval.",
  ]);

  const handleworkdone1temp8Chnage = (index, value) => {
    const newworkdone1temp8 = [...workdone1temp8];
    newworkdone1temp8[index] = value;
    setWorkdonetemp8(workdone1temp8);
  };

  const [post2temp8, setPost2temp8] = useState("Junior Developer");
  const [company2temp8, setCompany2temp8] = useState("Web Solutions Ltd.");
  const [workdone2temp8, setWorkdone2temp8] = useState([
    "- Assisted in the development of web applications using JavaScript and Python.",
    "- Worked with senior developers to troubleshoot and debug software issues.",
    "- Participated in code reviews and contributed to the development of best practices.",
  ]);

  const handleworkdone2temp8Change = (index, value) => {
    const newworkdone2temp8 = [...workdone2temp8];
    newworkdone2temp8[index] = value;
    setWorkdone2temp8(newworkdone2temp8);
  };

  //end of the temp8 states

  //states for the temp 9
  //states for the temp 9
  //states for the temp 9
  //states for the temp 9
  //states for the temp 9
  //states for the temp 9
  //states for the temp 9

  const [nametemp9, setNametemp9] = useState("John Doe");
  const [professiontemp9, setProfessiontemp9] = useState("Web Developer");
  const [contactinfolabeltemp9, setContactinfolabeltemp9] = useState(
    "Contact Information"
  );
  const [addresstemp9, setAddresstemp9] = useState("1234 Elm Street");
  const [phonetemp9, setPhonetemp9] = useState("(123) 456-7890");
  const [emailtemp9, setEmailtemp9] = useState("john.doe@example.com");
  const [skillslabeltemp9, setSkillslabeltemp9] = useState("Skills");
  const [skillstemp9, setSkillstemp9] = useState([
    "HTML/CSS",
    "JavaScripts",
    "React",
    "Node.js",
  ]);
  const handelskillstemp9 = (index, value) => {
    const newskillstemp9 = [...skillstemp9];
    newskillstemp9[index] = value;
    setSkillstemp9(newskillstemp9);
  };

  const [educationlabeltemp9, setEducationlabeltemp9] = useState("Education");
  const [facultytemp9, setFacultytemp9] = useState("B.Sc. Computer Science");
  const [universitytemp9, setUniversitytemp9] = useState(
    "University of Technology"
  );
  const [datetemp9, setDatetemp9] = useState("09/2015 - 06/2019");

  const [languageslabeltemp9, setLanguageslabeltemp9] = useState("Languages");
  const [languagetemp9, setLanguagetemp9] = useState([
    "English",
    "Spanish",
    "French",
  ]);

  const handlelanguagetemp9Change = (index, value) => {
    const newlanguagetemp9 = [...languagetemp9];
    newlanguagetemp9[index] = value;
    setLanguagetemp9(newlanguagetemp9);
  };

  const [workexperiencelabeltemp9, setWorkexperiencelabeltemp9] =
    useState("Work Experience");
  const [post1temp9, setPost1temp9] = useState("Front-End Developer");
  const [company1temp9, setCompanytemp9] = useState("XYZ Company");
  const [wrokdone1temp9, setWorkdone1temp9] = useState([
    "- Developed responsive websites and web applications.",
    "- Collaborated with designers and back-end developers.",
    "- Optimized code for performance and scalability.",
  ]);

  const handlewrokdone1temp9Change = (index, value) => {
    const newwrokdone1temp9 = [...wrokdone1temp9];
    newwrokdone1temp9[index] = value;
    setWorkdone1temp9(newwrokdone1temp9);
  };

  const [post2temp9, setPost2temp9] = useState("Junior Developer");
  const [company2temp9, setCompany2temp9] = useState("ABC Corp");
  const [workdone2temp9, setWorkdone2temp9] = useState([
    "Assisted in developing and maintaining websites.",
    "Wrote clean, efficient, and maintainable code.",
    "Performed testing and debugging of web applications.",
  ]);

  const handlewrokdone2temp9Change = (index, value) => {
    const newwworkdone2temp9 = [...workdone2temp9];
    newwworkdone2temp9[index] = value;
    setWorkdone2temp9(newwworkdone2temp9);
  };

  //end of states for temp9

  //states for temp 10
  //states for temp 10
  //states for temp 10
  //states for temp 10
  //states for temp 10
  //states for temp 10

  const [nametemp10, setNametemp10] = useState("Michael Smith");
  const [professiontemp10, setProfessiontemp10] = useState("Software Engineer");
  const [aboutmetemp10, setAboutmetemp10] = useState("About Me");
  const [aboutmeinfotemp10, setAboutmeinfotemp10] = useState(
    "Dedicated software engineer with 7 years of experience in developing high-performance web applications. Proficient in JavaScript, Python, and cloud technologies"
  );
  const [skillslabeltemp10, setSkillslabeltemp10] = useState("Skills");
  const [skillstemp10, setSkillstemp10] = useState([
    "JavaScript",
    "Python",
    "React.js",
    "Node.js",
    "AWS",
  ]);
  const handleskillstemp10Chnage = (index, value) => {
    const newskillstemp10 = [...skillstemp10];
    newskillstemp10[index] = value;
    setSkillstemp10(newskillstemp10);
  };

  const [experiencetemp10, setExperiencetemp10] = useState("Experience");
  const [post1temp10, setPost1temp10] = useState("Senior Software Engineer");
  const [company1temp10, setCompany1temp10] = useState("Tech Solutions");
  const [workdone1temp10, setWorkdone1temp10] = useState([
    "Led the development of a scalable e-commerce platform",
    "Integrated RESTful APIs and third-party services.",
    "Mentored junior developers and conducted code reviews.",
  ]);

  const handleworkdone1temp10Chnage = (index, value) => {
    const newworkdone1temp10 = [...workdone1temp10];
    workdone1temp10[index] = value;
    setWorkdone1temp10(newworkdone1temp10);
  };

  const [post2temp10, setPost2temp10] = useState("Software Engineer");
  const [company2temp10, setCompany2temp10] = useState("Innovatech");
  const [workdone2temp10, setWorkdone2temp10] = useState([
    "Developed and maintained web applications using React and Node.js.",
    "Collaborated with cross-functional teams to deliver projects on time.",
    "Optimized applications for maximum speed and scalability.",
  ]);
  const handleworkdone2temp10Change = (index, value) => {
    const newworkdone2 = [...workdone2temp10];
    newworkdone2[index] = value;
    setWorkdone2temp10(newworkdone2);
  };

  const [educationlabeltemp10, setEducationlabeltemp10] = useState("Education");
  const [facultytemp10, setFacultytemp10] = useState(
    "Bachelor of Science in Computer Science"
  );
  const [universitytemp10, setUniversitytemp10] = useState("State University");
  const [datetemp10, setDatetemp10] = useState("09/2010 - 06/2014");

  //end of temp 10

  //states for the temp 11
  //states for the temp 11
  //states for the temp 11
  //states for the temp 11
  //states for the temp 11
  //states for the temp 11
  //states for the temp 11
  //states for the temp 11
  //states for the temp 11

  const [nametemp11, setNametemp11] = useState("Emily Johnson");
  const [professiontemp11, setProfessiontemp11] = useState(
    "Digital Marketing Specialist"
  );
  const [emailtemp11, setEmailtemp11] = useState(
    "emily.johnson@example.com | (555) 55"
  );
  const [summarytemp11, setSummarytemp11] = useState("Summary");
  const [summaryinfotemp11, setSummaryinfotemp11] = useState(
    "Dynamic marketing professional with 6+ years of experience in digital campaigns, SEO, and content creation. Adept at leading cross-functional teams to deliver high-impact projects."
  );
  const [experiencetemp11, setExperiencetemp11] = useState("Experience");
  const [post1temp11, setPost1temp11] = useState(
    "Senior Digital Marketing Manager"
  );
  const [company1temp11, setCompany1temp11] = useState(
    "XYZ Marketing Solutions"
  );
  const [workdone1temp11, setWorkdone1temp11] = useState([
    "- Led a team of 10 to develop and implement comprehensive marketing strategies.",
    "- Increased online sales by 30% through targeted campaigns",
    "- Managed a $500k annual marketing budget.",
  ]);

  const handleworkdone1temp11Change = (index, value) => {
    const newworkdone1temp11 = [...workdone1temp11];
    newworkdone1temp11[index] = value;
    setWorkdone1temp11(newworkdone1temp11);
  };

  const [post2temp11, setPost2temp11] = useState(
    "Digital Marketing Specialist"
  );
  const [company2temp11, setCompany2temp11] = useState("ABC Tech");
  const [workdone2temp11, setworkdone2temp11] = useState([
    "- Optimized SEO for a website with 1 million monthly visitors.",
    "- Developed content strategies that increased engagement by 40%.",
    "- Collaborated with the sales team to align marketing strategies.",
  ]);

  const handleworkdone2temp11Change = (index, value) => {
    const newworkdone2temp11 = [...workdone2temp11];
    newworkdone2temp11[index] = value;
    setworkdone2temp11(newworkdone2temp11);
  };

  const [educationtemp11, seteducationtemp11] = useState("Education");
  const [facultytemp11, setFacultytemp11] = useState(
    "Bachelor of Science in Marketing"
  );
  const [universitytemp11, setUniversitytemp11] = useState("State University");
  const [datetemp11, setDatetemp11] = useState("09/2008 - 06/2012");
  const [skilllabelstemp11, setSkillslabeltemp11] = useState("Skills");
  const [skillstemp11, setSkillstemp11] = useState([
    "SEO & SEM",
    "Google Analytics",
    "Content Marketing",
    "Email Campaigns",
  ]);
  const handleskillstemp11Change = (index, value) => {
    const newskillstemp11 = [...skillstemp11];
    newskillstemp11[index] = value;
    setSkillstemp11(newskillstemp11);
  };

  //end of states for the temp11

  //states for the temp 12
  //states for the temp 12
  //states for the temp 12
  //states for the temp 12
  //states for the temp 12
  //states for the temp 12
  //states for the temp 12
  //states for the temp 12
  //states for the temp 12

  

    const [selectedImage7, setSelectedImage7] = useState(null);
    const handleImageChange7 = (e) => {
      const file = e.target.files[0];
      if (file) {
        // check if the file is an image or not
        const validImageTypes = ["image/jpeg", "image/png", "image/gif"];
        if (validImageTypes.includes(file.type)) {
          setSelectedImage7(URL.createObjectURL(file));
        } else {
          alert(
            "please select the valid image image type in the jpeg, png, gif form"
          );
        }
      }
    };
    const [selectedImage8, setSelectedImage8] = useState(null);
    const handleImageChange8 = (e) => {
      const file = e.target.files[0];
      if (file) {
        // check if the file is an image or not
        const validImageTypes = ["image/jpeg", "image/png", "image/gif"];
        if (validImageTypes.includes(file.type)) {
          setSelectedImage8(URL.createObjectURL(file));
        } else {
          alert(
            "please select the valid image image type in the jpeg, png, gif form"
          );
        }
      
      }
    };

    const [selectedImage9, setSelectedImage9] = useState(null);
    const handleImageChange9 = (e) => {
      const file = e.target.files[0];
      if (file) {
        // check if the file is an image or not
        const validImageTypes = ["image/jpeg", "image/png", "image/gif"];
        if (validImageTypes.includes(file.type)) {
          setSelectedImage9(URL.createObjectURL(file));
        } else {
          alert(
            "please select the valid image image type in the jpeg, png, gif form"
          );
        }
      
      }
    };

    const [selectedImage10, setSelectedImage10] = useState(null);
    // const fileInputRef = useRef(null);
    const handleImageChange10 = (e) => {
      const file = e.target.files[0];
      if (file) {
        // check if the file is an image or not
        const validImageTypes = ["image/jpeg", "image/png", "image/gif"];
        if (validImageTypes.includes(file.type)) {
          setSelectedImage10(URL.createObjectURL(file));
        } else {
          alert(
            "please select the valid image image type in the jpeg, png, gif form"
          );
        }
      
      }
    };

    const [selectedImage11, setSelectedImage11] = useState(null);
     //handle image change
     const handleImageChange11 = (e) => {
      const file = e.target.files[0];
      if (file) {
        // check if the file is an image or not
        const validImageTypes = ["image/jpeg", "image/png", "image/gif"];
        if (validImageTypes.includes(file.type)) {
          setSelectedImage11(URL.createObjectURL(file));
        } else {
          alert(
            "please select the valid image image type in the jpeg, png, gif form"
          );
        }
        // setSelectedImage(url.createObjectURL(file));   //create a preview URL
      }
    };
    const [selectedImage12, setSelectedImage12] = useState(null);

    //handle image change
    const handleImageChange12 = (e) => {
      const file = e.target.files[0];
      if (file) {
        // check if the file is an image or not
        const validImageTypes = ["image/jpeg", "image/png", "image/gif"];
        if (validImageTypes.includes(file.type)) {
          setSelectedImage12(URL.createObjectURL(file));
        } else {
          alert(
            "please select the valid image image type in the jpeg, png, gif form"
          );
        }
        // setSelectedImage(url.createObjectURL(file));   //create a preview URL
      }
    };
  

  const [nametemp12, setNametemp12] = useState("John Doe");
  const [professiontemp12, setProfessiontemp12] = useState("Software Engineer");
  const [emailtemp12, setEmailtemp12] = useState("Email: john.doe@example.com");
  const [phonetemp12, setPhonetemp12] = useState("Phone: (555) 555-5555");
  const [websitetemp12, setwebsitetemp12] = useState(
    "Website: www.johndoe.com"
  );
  // const [] = useState("");
  const [profiletemp12, setProfiletemp12] = useState("Profile");
  const [profileinfotemp12, setProfileinfotemp12] = useState(
    "Experienced software engineer with a strong background in developing scalable web applications. Expertise in JavaScript, Python, and cloud services."
  );
  const [educationtemp12, setEducationtemp12] = useState("Education");
  const [facultytemp12, setFacultytemp12] = useState(
    "Bachelor in Computer Science"
  );
  const [universitytemp12, setUniversitytemp12] = useState("State University");
  const [datetemp12, setDatetemp12] = useState("09/2010 - 06/2014");
  const [experiencetemp12, setExperiencetemp12] = useState("Experience");
  const [post1temp12, setPost1temp12] = useState("Senior Software Engineer");
  const [company1temp12, setCompany1temp12] = useState("Tech Solutions");
  const [workdone1temp12, setWorkdone1temp12] = useState([
    "- Led the development of a scalable e-commerce platform.",
    "- Integrated RESTful APIs and third-party services.",
    "- Mentored junior developers and conducted code reviews.",
  ]);
  const handleworkdone1temp12Change = (index, value) => {
    const newworkdone1temp12 = [...workdone1temp12];
    newworkdone1temp12[index] = value;
    setWorkdone1temp12(workdone1temp12);
  };
  const [post2temp12, setPost2temp12] = useState("Software Engineer");
  const [company2temp12, setCompany2temp12] = useState("Innovatech");
  const [workdone2temp12, setWorkdone2temp12] = useState([
    "- Developed and maintained web applications using React and Node.js.",
    "- Collaborated with cross-functional teams to deliver projects on time.",
    "- Optimized applications for maximum speed and scalability.",
  ]);
  const handleworkdone2temp12Change = (index, value) => {
    const newworkdone2temp12 = [...workdone2temp12];
    newworkdone2temp12[index] = value;
    setWorkdone2temp12(workdone2temp12);
  };


  //end of the states

  const renderTemplate = () => {
    switch (templateId) {
      case 1:
        return (

          <div
            className="w-full  max-w-3xl mx-auto p-4 border border-gray-300"
            style={{ height: "1100px" }}
            ref={cvRef}  // Attach ref here
          >
            <div className="flex h-full">
              {/* Left Column */}
              <div className={`w-1/3 ${getTextColor()} p-6`} style={getColorStyle('blue-900')}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-2xl font-bold bg-transparent text-white"
                />

                {/* <h1 className="text-3xl font-bold">Dfbd</h1> */}
                {/* <h2 className="text-xl">Dfvfwft</h2> */}

                <input
                  type="text"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  className="text-lg italic bg-transparent text-white"
                />

                {/* <p className="text-lg italic">Profession</p> */}

                <div className="mt-12">
                  {/* <h3 className="text-xl font-bold">Contact Info</h3> */}
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="text-xl font-bold bg-transparent text-white"
                  />
                  <div className="mt-4">
                    <p>
                      {/* <strong>Address</strong> */}
                      <input
                        type="text"
                        value={addressLabel}
                        onChange={(e) => setAddressLabel(e.target.value)}
                        className="text-lg font-bold bg-transparent text-white"
                      />
                    </p>

                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-transparent text-white"
                    />

                    {/* <p>Dsfrwe 3333</p> */}

                    {/* phone */}
                    <p>
                      {/* <strong>Phone</strong> */}
                      <input
                        type="text"
                        value={phoneLabel}
                        onChange={(e) => setPhoneLabel(e.target.value)}
                        className="text-lg font-bold bg-transparent text-white"
                      />
                    </p>
                    {/* <p>3453523</p> */}

                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-transparent text-white"
                    />

                    {/* Email */}
                    <p>
                      {/* <strong>E-mail</strong> */}
                      <input
                        type="text"
                        value={emailLabel}
                        onChange={(e) => setEmailLabel(e.target.value)}
                        className="text-lg font-bold bg-transparent text-white"
                      />
                    </p>
                    {/* <p>dwdwed@gmail.com</p> */}

                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent text-white"
                    />
                  </div>
                </div>

                {/* skills */}

                <div className="mt-12">
                  {/* <h3 className="text-xl font-bold">Skills</h3> */}
                  <input
                    type="text"
                    value={skillsLabel}
                    onChange={(e) => setSkillsLabel(e.target.value)}
                    className="text-lg font-bold bg-transparent text-white"
                  />

                  {/* <ul className="mt-4 space-y-3">
                    <li>Skill 1</li>
                    <li>Skill 2</li>
                    <li>Skill 3</li>
                    <li>Skill 4</li>
                  </ul> */}

                  <ul className="mt-4 space-y-3">
                    {skills.map((skill, index) => {
                      return (
                        <li key={index}>
                          <input
                            type="text"
                            value={skill}
                            onChange={(e) =>
                              handleSkillChange(index, e.target.value)
                            }
                            className="mt-4 space-y-3 bg-transparent text-white"
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              {/* Right Column */}
              <div className="w-2/3 bg-white text-gray-800 p-6">
                <div className="mb-10">
                  {/* <h3 className="text-xl font-bold">Work History</h3> */}
                  <input
                    type="text"
                    value={work}
                    onChange={(e) => setWork(e.target.value)}
                    className="w-full bg-transparent text-black text-xl font-bold"
                  />

                  {/* <p className="mt-2">
                    Summarize your work experience by listing each job and your
                    responsibilities in 2-3 lines. Start with your most recent
                    job and work backwards using the format below.
                  </p> */}

                  <textarea
                    type="text"
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    className=" bg-transparent text-black w-[450px] h-[100px] text-base mt-2 resize-none"
                  />

                  <div className="mt-6 ">
                    {/* <p className="font-bold">Job Title 1</p> */}
                    <input
                      type="text"
                      value={title1}
                      onChange={(e) => setTitle1(e.target.value)}
                      className="font-bold bg-transparent text-black w-full"
                    />
                    {/* <p className="italic">Company Name</p> */}
                    <input
                      type="text"
                      value={company1}
                      onChange={(e) => setCompany1(e.target.value)}
                      className="italic bg-transparent text-black  w-full"
                    />

                    {/* <ul className="list-disc pl-5">
                      <li>Responsibilities</li>
                      <li>Responsibilities</li>
                      <li>Responsibilities</li>
                    </ul> */}

                    <ul className="list-disc pl-5">
                      {responsibilities1.map((responsibilities1, index) => {
                        return (
                          <li key={index}>
                            <input
                              type="text"
                              value={responsibilities1}
                              onChange={(e) =>
                                handleResponsibilitiesChange1(
                                  index,
                                  e.target.value
                                )
                              }
                              className="bg-transparent text-black w-full"
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="mt-6">
                    {/* <p className="font-bold">Job Title 2</p> */}
                    <input
                      type="text"
                      value={title2}
                      onChange={(e) => setTitle2(e.target.value)}
                      className="font-bold bg-transparent w-full"
                    />
                    {/* <p className="italic">Company Name</p> */}

                    <input
                      type="text"
                      value={company2}
                      onChange={(e) => setCompany2(e.target.value)}
                      className="italic bg-transparent text-black w-full"
                    />

                    {/* <ul className="list-disc pl-5">
                      <li>Responsibilities</li>
                      <li>Responsibilities</li>
                      <li>Responsibilities</li>
                    </ul> */}
                    <ul className="list-disc pl-5">
                      {responsibilities2.map((responsibilities2, index) => {
                        return (
                          <li key={index}>
                            <input
                              type="text"
                              value={responsibilities2}
                              onChange={(e) =>
                                handleResponsibilitiesChange2(
                                  index,
                                  e.target.value
                                )
                              }
                              className="bg-transparent text-black w-full"
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>

                <div>
                  {/* <h3 className="text-xl font-bold">Education</h3> */}
                  <input
                    type="text"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    className="text-xl bg-transparent text-black font-bold"
                  />

                  <div className="mt-6">
                    {/* <p>09/2017 - 07/2020</p> */}
                    <input
                      type="text"
                      value={date1}
                      onChange={(e) => setDate1(e.target.value)}
                      className="bg-transparent text-black w-full"
                    />

                    {/* <p className="font-bold">Degree: Field of Study</p> */}
                    <input
                      type="text"
                      value={degree1}
                      onChange={(e) => setDegree1(e.target.value)}
                      className="font-bold bg-transparent text-black w-full"
                    />

                    {/* <p>School Name - City - Mention (if applicable)</p> */}

                    <input
                      type="text"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      className="bg-transparent text-black w-full"
                    />
                  </div>
                  <div className="mt-6">
                    {/* <p>09/2017 - 07/2020</p> */}
                    <input
                      type="text"
                      value={date2}
                      onChange={(e) => setDate2(e.target.value)}
                      className="bg-transparent text-black w-full"
                    />
                    {/* <p className="font-bold">Degree: Field of Study</p> */}
                    <input
                      type="text"
                      value={degree2}
                      onChange={(e) => setDegree2(e.target.value)}
                      className="bg-transparent text-black w-full font-bold"
                    />
                    {/* <p>School Name - City - Mention (if applicable)</p> */}
                    <input
                      type="text"
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      className="bg-transparent text-black w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div
            className="w-full max-w-4xl mx-auto p-8 border border-gray-300"
            style={{ height: "1100px" }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
              {/* Left Column */}
              <div className="bg-gray-100 p-6">
                {/* <h2 className="text-2xl font-bold">Contact Information</h2> */}
                <input
                  type="text"
                  value={contactInfotemp2}
                  onChange={(e) => setContactInfotemp2(e.target.value)}
                  className="text-2xl font-bold bg-transparent text-black"
                />
                {/* <p className="mt-4">Name: Sarah Lee</p> */}
                <input
                  type="text"
                  value={nametemp2}
                  onChange={(e) => setNametemp2(e.target.value)}
                  className="bg-transparent text-black"
                />
                {/* <p>Email: sarah.lee@example.com</p> */}
                <input
                  type="text"
                  value={emailtemp2}
                  onChange={(e) => setEmailtemp2(e.target.value)}
                  className="bg-transparent text-black w-full"
                />
                {/* <p>Phone: (555) 555-5555</p> */}
                <input
                  type="text"
                  value={phonetemp2}
                  onChange={(e) => setPhonetemp2(e.target.value)}
                  className="bg-transparent text-black"
                />
                {/* <p>Website: www.sarahlee.com</p> */}
                <input
                  type="text"
                  value={websitetemp2}
                  onChange={(e) => setWebsitetemp2}
                  className="bg-transparent text-black w-full"
                />

                {/* <h2 className="text-2xl font-bold mt-12">Skills</h2> */}
                <input
                  type="text"
                  value={skillsLabeltemp2}
                  onChange={(e) => setskillsLabeltemp2(e.target.value)}
                  className="bg-transparent text-black text-2xl font-bold mt-12"
                />
                {/* <ul className="mt-4 space-y-2">
                  {/* <li>JavaScript</li> */}
                {/* <li>
                  <input type="text" 
                value={jstemp2}
                onClick={(e) => setJstemp2(e.target.value)}
                className="bg-transparent text-black"
                />
                
                  {/* <li>React</li> */}
                {/* <input type="text" 
                value={reacttemp2}
                onClick={(e) => setReacttemp2(e.target.value)}
                className="bg-transparent text-black"
                /> */}
                {/* <li>Node.js</li> */}
                {/* <input type="text" 
                value={nodetemp2}
                onClick={(e) => setNodetemp2(e.target.value)}
                className="bg-transparent text-black"
                /> */}
                {/* <li>Python</li> */}
                {/* <input type="text" 
                value={pythontemp2}
                onClick={(e) => setPythontemp2(e.target.value)}
                className="bg-transparent text-black"
                />
                </li>
                </ul> */}

                <ul className="mt-4 space-y-2">
                  {skillstemp2.map((skillstemp2, index) => {
                    return (
                      <li key={index}>
                        <input
                          type="text"
                          value={skillstemp2}
                          onChange={(e) =>
                            handleskillstemp2Change(index, e.target.value)
                          }
                          className="bg-transparent text-black w-full"
                        />
                      </li>
                    );
                  })}
                </ul>

                {/* <h2 className="text-2xl font-bold mt-12">Education</h2> */}
                <input
                  type="text"
                  value={educationLabeltemp2}
                  onChange={(e) => setEducationLabeltemp2(e.target.value)}
                  className="text-2xl font-bold mt-12 bg-transparent text-black"
                />
                <div className="mt-4">
                  {/* <h3 className="text-lg font-semibold">
                    Bachelor of Science in Computer Science
                  </h3> */}
                  <input
                    type="text"
                    value={educationtemp2}
                    onChange={(e) => setEducationtemp2(e.target.value)}
                    className="text-lg font-semibold bg-transparent text-black w-full"
                  />
                  {/* <p className="italic">State University</p> */}
                  <input
                    type="text"
                    value={universitytemp2}
                    onChange={(e) => setUniversitytemp2(e.target.value)}
                    className="italic bg-transparent text-black w-full"
                  />
                  {/* <p>09/2014 - 06/2018</p> */}
                  <input
                    type="text"
                    value={datetemp2}
                    onChange={(e) => setDatetemp2(e.target.value)}
                    className="bg-transparent text-black "
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="bg-white p-6">
                {/* <h2 className="text-2xl font-bold">Profile</h2> */}
                <input
                  type="text"
                  value={profiletemp2}
                  onChange={(e) => setProfileTemp2(e.target.value)}
                  className="text-2xl font-bold bg-transparent text-black "
                />
                {/* <p className="mt-4">
                  Full-stack developer with a passion for building efficient and
                  scalable applications. Proficient in both frontend and backend
                  technologies.
                </p> */}
                <textarea
                  type="text"
                  value={profileinfotemp2}
                  onChange={(e) => setProfileinfoTemp2(e.target.value)}
                  className="bg-transparent text-black w-full h-[100px] resize-none"
                />

                {/* <h2 className="text-2xl font-bold mt-12">Experience</h2> */}
                <input
                  type="text"
                  value={experiencetemp2}
                  onChange={(e) => setExperiencetemp2(e.target.value)}
                  className="text-2xl font-bold bg-transparent text-black"
                />
                <div className="mt-4">
                  {/* <h3 className="text-lg font-semibold">
                    Full Stack Developer
                  </h3> */}
                  <input
                    type="text"
                    value={post1temp2}
                    onChange={(e) => setPost1temp2}
                    className="text-lg font-semibold bg-transparent text-black"
                  />
                  {/* <p className="italic">Tech Corp</p> */}
                  <input
                    type="text"
                    value={company1temp2}
                    onChange={(e) => setCompany1temp2}
                    className="italic bg-transparent text-black"
                  />
                  {/* <ul className="list-disc pl-5 mt-2">
                    <li>
                      Developed and maintained web applications using
                      JavaScript, React, and Node.js.
                    </li>
                    <li>
                      Collaborated with design teams to create user-friendly
                      interfaces.   
                    </li>
                    <li>Implemented RESTful APIs to improve data retrieval.</li>
                  </ul> */}
                  <ul className="list-disc pl-5 mt-2">
                    {workdone1temp2.map((workdone1temp2, index) => {
                      return (
                        <li key={index}>
                          <textarea
                            type="text"
                            value={workdone1temp2}
                            onChange={(e) =>
                              handleWorkdone1Change(index, e.target.value)
                            }
                            className="bg-transparent text-black w-full resize-none"
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="mt-6">
                  {/* <h3 className="text-lg font-semibold">Junior Developer</h3> */}
                  <input
                    type="text"
                    value={post2temp2}
                    onChange={(e) => setPost2temp2}
                    className="text-lg font-semibold bg-transparent text-black"
                  />
                  {/* <p className="italic">Innovatech</p> */}
                  <input
                    type="text"
                    value={company2temp2}
                    onChange={(e) => setCompany2temp2}
                    className="italic bg-transparent text-black"
                  />
                  {/* <ul className="list-disc pl-5 mt-2">
                    <li>
                      Assisted in the development of web applications using
                      JavaScript and Python.
                    </li>
                    <li>
                      Worked with senior developers to troubleshoot and debug
                      software issues.
                    </li>
                    <li>
                      Participated in code reviews and contributed to the
                      development of best practices.
                    </li>
                  </ul> */}
                  <ul className="list-disc pl-5 mt-2">
                    {workdone2temp2.map((workdone2temp2, index) => {
                      return (
                        <li key={index}>
                          <textarea
                            type="text"
                            value={workdone2temp2}
                            onChange={(e) =>
                              handleWorkdone2Change(index, e.target.value)
                            }
                            className="bg-transparent text-black w-full resize-none"
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div
            className="w-full max-w-4xl mx-auto p-4 border border-gray-300"
            style={{ height: "1100px" }}
          >
            <div className="grid grid-cols-3 gap-4 h-full">
              {/* Top Header */}
              <div className={`col-span-3 ${getTextColor()} p-6 text-center flex flex-col justify-center items-center`} style={getColorStyle('gray-700', 'dark')}>
                {/* <h1 className="text-4xl font-bold">John Doe</h1> */}
                <input
                  type="text"
                  value={nametemp3}
                  onChange={(e) => setNametemp3(e.target.value)}
                  className="text-4xl font-bold bg-transparent mb-2 text-center"
                />
                {/* <p className="text-xl mt-2">Web Developer</p> */}
                <input
                  type="text"
                  value={professiontemp3}
                  onChange={(e) => setProfessiontemp3(e.target.value)}
                  className=" text-xl mt-2 bg-transparent text-center"
                />
              </div>

              {/* Left Sidebar */}
              <div className="col-span-1 bg-gray-200 p-6">
                <div className="mb-10">
                  {/* <h2 className="text-2xl font-bold border-b-2 border-gray-400 pb-2">
                    Contact Information
                  </h2> */}
                  <input
                    type="text"
                    value={contactlabeltemp3}
                    onChange={(e) => setContactLabeltemp3(e.target.value)}
                    className="text-2xl font-bold border-b-2 border-gray-400 pb-2 w-fit bg-transparent"
                  />
                  {/* <p className="mt-4">1234 Elm Street</p> */}
                  <input
                    type="text"
                    value={addresstemp3}
                    onChange={setAddresstemp3}
                    className="mt-4 bg-transparent"
                  />
                  {/* <p>(123) 456-7890</p> */}
                  <input
                    type="text"
                    value={numbertemp3}
                    onChange={setNumbertemp3}
                    className="bg-transparent"
                  />
                  {/* <p>john.doe@example.com</p> */}
                  <input
                    type="text"
                    value={emailtemp3}
                    onChange={(e) => setEmailtemp3(e.target.value)}
                    className="bg-transparent"
                  />
                </div>

                <div>
                  {/* <h2 className="text-2xl font-bold border-b-2 border-gray-400 pb-2">
                    Skills
                  </h2> */}
                  <input
                    type="text"
                    value={skillsLabeltemp3}
                    onChange={(e) => setSkillsLabeltemp3(e.target.value)}
                    className="text-2xl font-bold border-b-2 border-gray-400 pb-2 bg-transparent"
                  />
                  {/* <ul className="mt-4 space-y-2">
                    <li>HTML/CSS</li>
                    <li>JavaScript</li>
                    <li>React</li>
                    <li>Node.js</li>
                  </ul> */}
                  <ul className="mt-4 space-y-2">
                    {skillstemp3.map((skillstemp3, index) => {
                      return (
                        <li key={index}>
                          <input
                            type="text"
                            value={skillstemp3}
                            onChange={(e) =>
                              handleSkillsChange(index, e.target.value)
                            }
                            className="bg-transparent "
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="col-span-1 bg-gray-200 p-6">
                <div className="mb-10">
                  {/* <h2 className="text-2xl font-bold border-b-2 border-gray-400 pb-2">
                    Education
                  </h2> */}
                  <input
                    type="text"
                    value={educationLabeltemp3}
                    onChange={(e) => setEducationLabeltemp3(e.target.value)}
                    className="text-2xl font-bold border-b-2 border-gray-400 pb-2 bg-transparent"
                  />
                  {/* <p className="mt-4">
                    <strong>B.Sc. Computer Science</strong>
                  </p> */}
                  <input
                    type="text"
                    value={facultytemp3}
                    onChange={(e) => setFacultytemp3(e.target.value)}
                    className="font-bold mt-4 bg-transparent"
                  />
                  {/* <p className="italic">University of Technology</p> */}
                  <input
                    type="text"
                    value={universitytemp3}
                    onChange={(e) => setUniversitytemp3(e.target.value)}
                    className="italic bg-transparent"
                  />
                  {/* <p>09/2015 - 06/2019</p> */}
                  <input
                    type="text"
                    value={graduationtemp3}
                    onChange={(e) => setGraduationtemp3(e.target.value)}
                    className="bg-transparent"
                  />
                </div>

                <div>
                  {/* <h2 className="text-2xl font-bold border-b-2 border-gray-400 pb-2">
                    Languages
                  </h2> */}
                  <input
                    type="text"
                    value={languagesLabeltemp3}
                    onChange={(e) => setLanguagesLabeltemp3(e.target.value)}
                    className="bg-transparent text-2xl font-bold border-b-2 border-gray-400 pb-2"
                  />
                  {/* <ul className="mt-4 space-y-2">
                    <li>English</li>
                    <li>Spanish</li>
                    <li>French</li>
                  </ul> */}

                  <ul className="mt-4 space-y-2">
                    {languagesListtemp3.map((languagesListtemp3, index) => {
                      return (
                        <li key={index}>
                          <input
                            type="text"
                            value={languagesListtemp3}
                            onChange={(e) =>
                              handleLanguagesListChange(index, e.target.value)
                            }
                            className="bg-transparent "
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              {/* Main Content */}
              <div className="col-span-3 bg-white text-gray-900 p-6">
                {/* <h2 className="text-2xl font-bold border-b-2 border-gray-400 pb-2">
                  Work Experience
                </h2> */}
                <input
                  type="text"
                  value={workexpLabeltemp3}
                  onChange={(e) => setWorkexpLabeltemp3(e.target.value)}
                  className="bg-transparent text-2xl font-bold border-b-2 border-gray-400 pb-2"
                />
                <div className="mt-6">
                  {/* <h3 className="text-lg font-semibold">Front-End Developer</h3> */}
                  <input
                    type="text"
                    value={posttemp3}
                    onChange={(e) => setPosttemp3(e.target.value)}
                    className="bg-transparent text-lg font-semibold w-full"
                  />
                  {/* <p className="italic">XYZ Company</p> */}
                  <input
                    type="text"
                    value={companytemp3}
                    onChange={(e) => setCompanytemp3(e.target.value)}
                    className="bg-transparent italic"
                  />
                  {/* <ul className="list-disc pl-5 mt-2">
                    <li>Developed responsive websites and web applications.</li>
                    <li>
                      Collaborated with designers and back-end developers.
                    </li>
                    <li>Optimized code for performance and scalability.</li>
                  </ul> */}

                  <ul className="list-disc pl-5 mt-2">
                    {workdonetemp3.map((workdonetemp3, index) => {
                      return (
                        <li key={index} className="align-top">
                          <textarea
                            type="text"
                            value={workdonetemp3}
                            onChange={(e) =>
                              handleWorkdonetemp3Change(index, e.target.value)
                            }
                            className="bg-transparent resize-none w-full align-text-top "
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="mt-6">
                  {/* <h3 className="text-lg font-semibold">Junior Developer</h3> */}
                  <input
                    type="text"
                    value={post2temp3}
                    onChange={(e) => setPost2temp3(e.target.value)}
                    className="text-lg font-semibold bg-transparent w-full"
                  />
                  {/* <p className="italic">ABC Corp</p> */}
                  <input
                    type="text"
                    value={company2temp3}
                    onChange={(e) => setCompany2temp3(e.target.value)}
                    className="italic bg-transparent"
                  />
                  {/* <ul className="list-disc pl-5 mt-2">
                    <li>Assisted in developing and maintaining websites.</li>
                    <li>Wrote clean, efficient, and maintainable code.</li>
                    <li>
                      Performed testing and debugging of web applications.
                    </li>
                  </ul> */}
                  <ul className="list-disc pl-5 mt-2">
                    {workdone2temp3.map((workdone2temp3, index) => {
                      return (
                        <li key={index} className="align-top">
                          <textarea
                            type="text"
                            value={workdone2temp3}
                            onChange={(e) =>
                              handleWorkdone2temp3Change(index, e.target.value)
                            }
                            className="bg-transparent resize-none w-full align-text-top "
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div
            ref={cvRef}
            className="w-full h-[297mm] max-w-4xl mx-auto p-4 border border-gray-300"
          >
            <div className="h-full">
              {/* Header */}
              <div className={`${getTextColor()} p-6 text-center flex flex-col`} style={getColorStyle('blue-700', 'dark')}>
                {/* <h1 className="text-4xl font-bold">Michael Smith</h1> */}
                <input
                  type="text"
                  value={nametemp4}
                  onChange={(e) => setNametemp4(e.target.value)}
                  className="text-4xl font-bold bg-transparent text-center"
                />
                {/* <p className="text-xl mt-2">Software Engineer</p> */}
                <input
                  type="text"
                  value={profession4}
                  onChange={(e) => setProfessiontemp4(e.target.value)}
                  className="text-xl mt-2 bg-transparent text-center"
                />
              </div>

              <div className="flex flex-col md:flex-row h-full mt-6">
                {/* Left Section */}
                <div className="md:w-1/2 bg-gray-200 p-6">
                  {/* <h2 className="text-2xl font-bold mb-4">About Me</h2> */}
                  <input
                    type="text"
                    value={aboutmetemp4}
                    onChange={(e) => setAboutmetemp4(e.target.value)}
                    className="text-2xl font-bold mb-4 bg-transparent"
                  />
                  {/* <p>
                    Dedicated software engineer with 7 years of experience in
                    developing high-performance web applications. Proficient in
                    JavaScript, Python, and cloud technologies.
                  </p> */}

                  <textarea
                    type="text"
                    value={aboutmeinfotemp4}
                    onChange={(e) => setAboutmeinfotemp4(e.target.value)}
                    className="bg-transparent w-full resize-none h-[125px]"
                  />

                  {/* <h2 className="text-2xl font-bold mt-12 mb-4">Skills</h2> */}
                  <input
                    type="text"
                    value={skillslabeltemp4}
                    onChange={(e) => setSkillslabeltemp4(e.target.value)}
                    className="text-2xl font-bold mt-12 mb-4 bg-transparent"
                  />
                  {/* <ul className="space-y-2">
                    <li>JavaScript</li>
                    <li>Python</li>
                    <li>React.js</li>
                    <li>Node.js</li>
                    <li>AWS</li>
                  </ul> */}
                  <ul className="space-y-2 list-disc pl-5">
                    {skillstemp4.map((skillstemp4, index) => {
                      return (
                        <li key={index} className="align-top">
                          <input
                            type="text"
                            value={skillstemp4}
                            onChange={(e) =>
                              handleskillstemp4Change(index, e.target.value)
                            }
                            className="bg-transparent  "
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Right Section */}
                <div className="md:w-1/2 bg-white p-6">
                  {/* <h2 className="text-2xl font-bold mb-4">Experience</h2> */}
                  <input
                    type="text"
                    value={experiencetemp4}
                    onChange={(e) => setExperiencetemp4(e.target.value)}
                    className="bg-transparent text-2xl font-bold mb-4"
                  />
                  <div className="mt-4">
                    {/* <h3 className="text-lg font-semibold">
                      Senior Software Engineer
                    </h3> */}
                    <input
                      type="text"
                      value={posttemp4}
                      onChange={(e) => setPosttemp4(e.target.value)}
                      className="bg-transparent text-lg font-semibold"
                    />
                    {/* <p className="italic">Tech Solutions</p> */}
                    <input
                      type="text"
                      value={companytemp4}
                      onChange={(e) => setCompanytemp4(e.target.value)}
                      className="bg-transparent italic"
                    />
                    {/* <ul className="list-disc pl-5 mt-2">
                      <li>
                        Led the development of a scalable e-commerce platform.
                      </li>
                      <li>Integrated RESTful APIs and third-party services.</li>
                      <li>
                        Mentored junior developers and conducted code reviews.
                      </li>
                    </ul> */}
                    {/* <ul className=" pl-5 list-disc list-inside ">
                      {workdonetemp4.map((workdonetemp4, index) => {
                        return (
                          <li key={index} className=" text-base  ">
                            <textarea
                              type="text"
                              value={workdonetemp4}
                              onChange={(e) =>
                                handleworkdoneChange(
                                  index,
                                  e.target.value
                                )
                              }
                              className="bg-transparent w-full resize-none align-text-top"
                            />
                          </li>
                        );
                      })}
                    </ul> */}

                    <ul className="list-disc pl-5 mt-2">
                      {workdonetemp4.map((workdonetemp4, index) => {
                        return (
                          <li key={index} className="align-top">
                            <textarea
                              type="text"
                              value={workdonetemp4}
                              onChange={(e) =>
                                handleworkdoneChange(index, e.target.value)
                              }
                              className="bg-transparent resize-none w-full align-text-top "
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="mt-6">
                    {/* <h3 className="text-lg font-semibold">Software Engineer</h3> */}
                    <input
                      type="text"
                      value={post2temp4}
                      onChange={(e) => setPost2temp4(e.target.value)}
                      className="bg-transparent text-lg font-semibold"
                    />
                    {/* <p className="italic">Innovatech</p> */}
                    <input
                      type="text"
                      value={company2temp4}
                      onChange={(e) => setCompany2temp4(e.target.value)}
                      className="italic bg-transparent"
                    />

                    {/* <ul className="list-disc pl-5 mt-2">
                      <li>
                        Developed and maintained web applications using React
                        and Node.js.
                      </li>
                      <li>
                        Collaborated with cross-functional teams to deliver
                        projects on time.
                      </li>
                      <li>
                        Optimized applications for maximum speed and
                        scalability.
                      </li>
                    </ul> */}

                    <ul className="list-disc pl-5 mt-2">
                      {workdone2temp4.map((workdone2temp4, index) => {
                        return (
                          <li key={index} className="align-top">
                            <textarea
                              type="text"
                              value={workdone2temp4}
                              onChange={(e) =>
                                handleworkdone2Change(index, e.target.value)
                              }
                              className="bg-transparent resize-none w-full align-text-top "
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* <h2 className="text-2xl font-bold mt-12 mb-4">Education</h2> */}
                  <input
                    type="text"
                    value={educationtemp4}
                    onClick={(e) => setEducationtemp4(e.target.value)}
                    className="text-2xl font-bold mt-12  bg-transparent"
                  />
                  <div className="mt-4">
                    {/* <h3 className="text-lg font-semibold">
                      Bachelor of Science in Computer Science
                    </h3> */}
                    <input
                      type="text"
                      value={facultytemp4}
                      onClick={(e) => setFacultytemp4(e.target.value)}
                      className="text-lg font-semibold bg-transparent w-full"
                    />
                    {/* <p className="italic">State University</p> */}
                    <input
                      type="text"
                      value={collegetemp4}
                      onClick={(e) => setCollegetemp4(e.target.value)}
                      className="italic bg-transparent w-full"
                    />
                    {/* <p>09/2010 - 06/2014</p> */}
                    <input
                      type="text"
                      value={datetemp4}
                      onClick={(e) => setDatetemp4(e.target.value)}
                      className="bg-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div
            className="w-full max-w-2xl mx-auto p-8 border border-gray-300"
            style={{ height: "1100px" }}
          >
            <div className="h-full">
              {/* Header */}
              <div className="text-center mb-8">
                {/* <h1 className="text-4xl font-bold">Emily Johnson</h1> */}
                <input
                  type="text"
                  value={nametemp5}
                  onChange={(e) => setNametemp5(e.target.value)}
                  className="text-4xl font-bold bg-transparent "
                />
                {/* <p className="text-lg mt-2">Digital Marketing Specialist</p> */}
                <input
                  type="text"
                  value={professiontemp5}
                  onChange={(e) => setProfessiontemp5(e.target.value)}
                  className="text-lg mt-2 bg-transparent w-full "
                />
                {/* <p className="mt-2">
                  emily.johnson@example.com | (555) 555-5555
                </p> */}
                <input
                  type="text"
                  value={emailtemp5}
                  onChange={(e) => setEmailtemp5(e.target.value)}
                  className="mt-2 bg-transparent w-full "
                />
              </div>

              {/* Summary */}
              <div className="mb-8">
                {/* <h2 className="text-2xl font-bold">Summary</h2> */}
                <input
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="text-2xl font-bold bg-transparent w-full "
                />
                {/* <p className="mt-4">
                  Dynamic marketing professional with 6+ years of experience in
                  digital campaigns, SEO, and content creation. Adept at leading
                  cross-functional teams to deliver high-impact projects.
                </p> */}
                <textarea
                  type="text"
                  value={summarydetailstemp5}
                  onChange={(e) => setSummarydetailtemo5(e.target.value)}
                  className="mt-4 bg-transparent w-full resize-none h-[75px]"
                />
              </div>

              {/* Experience */}
              <div className="mb-8">
                {/* <h2 className="text-2xl font-bold">Experience</h2> */}
                <input
                  type="text"
                  value={experiencetemp5}
                  onChange={(e) => setExperiencetemp5(e.target.value)}
                  className="text-2xl font-bold bg-transparent"
                />
                <div className="mt-4">
                  {/* <h3 className="text-lg font-semibold">
                    Senior Digital Marketing Manager
                  </h3> */}
                  <input
                    type="text"
                    value={post1temp5}
                    onChange={(e) => setPost1temp5(e.target.value)}
                    className="text-lg font-semibold bg-transparent w-full"
                  />
                  {/* <p className="italic">XYZ Marketing Solutions</p> */}
                  <input
                    type="text"
                    value={company1temp5}
                    onChange={(e) => setCompany1temp5(e.target.value)}
                    className="italic bg-transparent"
                  />
                  {/* <ul className="list-disc pl-5 mt-2">
                    <li>
                      Led a team of 10 to develop and implement comprehensive
                      marketing strategies.
                    </li>
                    <li>
                      Increased online sales by 30% through targeted campaigns.
                    </li>
                    <li>Managed a $500k annual marketing budget.</li>
                  </ul> */}
                  <ul className="mt-4 ">
                    {workdone1temp5.map((workdone1temp5, index) => {
                      return (
                        <li key={index}>
                          <textarea
                            type="text"
                            value={workdone1temp5}
                            onChange={(e) =>
                              handleworkdonetemp5Change(index, e.target.value)
                            }
                            className="list-disc pl-5 mt-2 bg-transparent w-full resize-none"
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="mt-6">
                  {/* <h3 className="text-lg font-semibold">
                    Digital Marketing Specialist
                  </h3> */}
                  <input
                    type="text"
                    value={post2temp5}
                    onChange={(e) => setPost2temp5(e.target.value)}
                    className="text-lg font-semibold bg-transparent w-full"
                  />
                  {/* <p className="italic">ABC Tech</p> */}
                  <input
                    type="text"
                    value={company2temp5}
                    onChange={(e) => setCompany2temp5(e.target.value)}
                    className="italic bg-transparent"
                  />
                  {/* <ul className="list-disc pl-5 mt-2">
                    <li>
                      Optimized SEO for a website with 1 million monthly
                      visitors.
                    </li>
                    <li>
                      Developed content strategies that increased engagement by
                      40%.
                    </li>
                    <li>
                      Collaborated with the sales team to align marketing
                      strategies.
                    </li>
                  </ul> */}
                  <ul className="mt-4 ">
                    {workdone2temp5.map((workdone2temp5, index) => {
                      return (
                        <li key={index}>
                          <textarea
                            type="text"
                            value={workdone2temp5}
                            onChange={(e) =>
                              handleworkdone2temp5Change(index, e.target.value)
                            }
                            className="list-disc pl-5 mt-2 bg-transparent w-full resize-none"
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              {/* Education */}
              <div className="mb-8">
                {/* <h2 className="text-2xl font-bold">Education</h2> */}
                <input
                  type="text"
                  value={educationtemp5}
                  onChange={(e) => setEducationtemp5(e.target.value)}
                  className="text-2xl font-bold bg-transparent w-full"
                />
                <div className="mt-4">
                  {/* <h3 className="text-lg font-semibold">
                    Bachelor of Science in Marketing
                  </h3> */}
                  <input
                    type="text"
                    value={facultytemp5}
                    onChange={(e) => setFacultytemp5(e.target.value)}
                    className="text-lg font-semibold bg-transparent w-full"
                  />
                  {/* <p className="italic">State University</p> */}
                  <input
                    type="text"
                    value={universitytemp5}
                    onChange={(e) => setUniversitytemp5(e.target.value)}
                    className="italic bg-transparent w-full"
                  />
                  {/* <p>09/2008 - 06/2012</p> */}
                  <input
                    type="text"
                    value={datetemp5}
                    onChange={(e) => setDatetemp5(e.target.value)}
                    className="bg-transparent"
                  />
                </div>
              </div>

              {/* Skills */}
              <div>
                {/* <h2 className="text-2xl font-bold">Skills</h2> */}
                <input
                  type="text"
                  value={skillstemp5}
                  onChange={(e) => setSkillstemp5(e.target.value)}
                  className="text-2xl font-bold bg-transparent"
                />
                {/* <ul className="mt-4 space-y-2">
                  <li>SEO & SEM</li>
                  <li>Google Analytics</li>
                  <li>Content Marketing</li>
                  <li>Email Campaigns</li>
                </ul> */}
                <ul className="mt-4 space-y-3">
                  {skillsdetailtemp5.map((skillsdetailtemp5, index) => {
                    return (
                      <li key={index}>
                        <input
                          type="text"
                          value={skillsdetailtemp5}
                          onChange={(e) =>
                            handleskillstemp5Change(index, e.target.value)
                          }
                          className="mt-4 space-y-2 bg-transparent"
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div
            className="w-full max-w-3xl mx-auto p-8 border border-gray-300"
            style={{ height: "1100px" }}
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className={`flex items-center ${getTextColor()} p-6`} style={getColorStyle('gray-800', 'dark')}>
                <div className="w-2/3">
                  {/* <h1 className="text-4xl font-bold">John Doe</h1> */}
                  <input
                    type="text"
                    value={nametemp6}
                    onChange={(e) => setNametemp6(e.target.value)}
                    className="text-4xl font-bold bg-transparent"
                  />
                  {/* <p className="text-xl mt-2">Software Engineer</p> */}
                  <input
                    type="text"
                    value={professiontemp6}
                    onChange={(e) => setProfessiontemp6(e.target.value)}
                    className="text-xl mt-2 bg-transparent"
                  />
                </div>
                <div className="w-1/3 text-right ">
                  {/* <p>Email: john.doe@example.com</p> */}
                  <input
                    type="text"
                    value={emailtemp6}
                    onChange={(e) => setEmailtemp6(e.target.value)}
                    className="bg-transparent -mt-2 w-full"
                  />
                  {/* <p>Phone: (555) 555-5555</p> */}
                  <input
                    type="text"
                    value={phonetemp6}
                    onChange={(e) => setPhonetemp6(e.target.value)}
                    className="bg-transparent -mt-2 w-full"
                  />
                  {/* <p>Website: www.johndoe.com</p> */}
                  <input
                    type="text"
                    value={webemailtemp6}
                    onChange={(e) => setWebemailtemp6(e.target.value)}
                    className="bg-transparent -mt-2 w-full"
                  />
                </div>
              </div>

              {/* Body */}
              <div className="flex-grow flex flex-col md:flex-row mt-6">
                {/* Left Section */}
                <div className="md:w-1/2 bg-gray-100 p-6">
                  {/* <h2 className="text-2xl font-bold mb-4">Profile</h2> */}
                  <input
                    type="text"
                    value={profiletemp6}
                    onChange={(e) => setProfiletemp6(e.target.value)}
                    className="text-2xl font-bold mb-4 bg-transparent "
                  />
                  {/* <p>
                    Experienced software engineer with a strong background in
                    developing scalable web applications. Expertise in
                    JavaScript, Python, and cloud services.
                  </p> */}
                  <textarea
                    type="text"
                    value={profileinfotemp6}
                    onChange={(e) => setProfileinfotemp6(e.target.value)}
                    className="bg-transparent resize-none w-full h-24"
                  />

                  {/* <h2 className="text-2xl font-bold mt-12 mb-4">Education</h2> */}
                  <input
                    type="text"
                    value={educationlabeltemp6}
                    onChange={(e) => setEducationlabeltemp6(e.target.value)}
                    className="text-2xl font-bold mt-12 mb-4 bg-transparent"
                  />
                  <div className="">
                    {/* <h3 className="text-lg font-semibold">
                      Bachelor of Science in Computer Science
                    </h3> */}
                    <input
                      type="text"
                      value={facultytemp6}
                      onChange={(e) => setFacultytemp6(e.target.value)}
                      className="text-lg font-semibold bg-transparent w-full"
                    />
                    {/* <p className="italic">State University</p> */}
                    <input
                      type="text"
                      value={universitytemp6}
                      onChange={(e) => setUniversitytemp6(e.target.value)}
                      className="italic bg-transparent"
                    />
                    {/* <p>09/2010 - 06/2014</p> */}
                    <input
                      type="text"
                      value={datetemp6}
                      onChange={(e) => setDatetemp6(e.target.value)}
                      className="bg-transparent"
                    />
                  </div>
                </div>

                {/* Right Section */}
                <div className="md:w-1/2 bg-white text-gray-800 p-6">
                  {/* <h2 className="text-2xl font-bold mb-4">Experience</h2> */}
                  <input
                    type="text"
                    value={experiencetemp6}
                    onChange={(e) => setExpriencetemp6(e.target.value)}
                    className="text-2xl font-bold mb-4 bg-transparent"
                  />
                  <div className="">
                    {/* <h3 className="text-lg font-semibold">
                      Senior Software Engineer
                    </h3> */}
                    <input
                      type="text"
                      value={post1temp6}
                      onChange={(e) => setPost1temp6(e.target.value)}
                      className="bg-transparent"
                    />
                    {/* <p className="italic">Tech Solutions</p> */}
                    <input
                      type="text"
                      value={company1temp6}
                      onChange={(e) => setComapny1temp6(e.target.value)}
                      className="italic bg-transparent"
                    />
                    {/* <ul className="list-disc pl-5 mt-2">
                      <li>
                        Led the development of a scalable e-commerce platform.
                      </li>
                      <li>Integrated RESTful APIs and third-party services.</li>
                      <li>
                        Mentored junior developers and conducted code reviews.
                      </li>
                    </ul> */}
                    <ul className=" pl-5 mt-2">
                      {workdone1temp6.map((workdone1temp6, index) => {
                        return (
                          <li key={index}>
                            <textarea
                              type="text"
                              value={workdone1temp6}
                              onChange={(e) =>
                                handleworkdone1temp6Change(
                                  index,
                                  e.target.value
                                )
                              }
                              className=" bg-transparent w-full resize-none list-disc list-inside"
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="mt-6">
                    {/* <h3 className="text-lg font-semibold">Software Engineer</h3> */}
                    <input
                      type="text"
                      value={post2temp6}
                      onChange={(e) => setPost2temp6(e.target.value)}
                      className="bg-transparent text-lg font-semibold"
                    />
                    {/* <p className="italic">Innovatech</p> */}
                    <input
                      type="text"
                      value={company2temp6}
                      onChange={(e) => setCompany2temp6(e.target.value)}
                      className="italic bg-transparent"
                    />
                    {/* <ul className="list-disc pl-5 mt-2">
                      <li>
                        Developed and maintained web applications using React
                        and Node.js.
                      </li>
                      <li>
                        Collaborated with cross-functional teams to deliver
                        projects on time.
                      </li>
                      <li>
                        Optimized applications for maximum speed and
                        scalability.
                      </li>
                    </ul> */}
                    <ul className=" pl-5 mt-2">
                      {workdone2temp6.map((workdone2temp6, index) => {
                        return (
                          <li key={index}>
                            <textarea
                              type="text"
                              value={workdone2temp6}
                              onChange={(e) =>
                                handleworkdone2temp6Change(
                                  index,
                                  e.target.value
                                )
                              }
                              className=" bg-transparent w-full resize-none list-disc list-inside"
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div
            className="w-full max-w-3xl mx-auto p-6 border border-gray-300"
            style={{ height: "1100px" }}
          >
            <div className="flex h-full">
              {/* Left Column */}
              <div className={`w-1/3 ${getTextColor()} p-6`} style={getColorStyle('blue-900')}>
                {/* Profile Section */}
                <div className="flex items-center mb-6">
                  {/* Profile Image */}
                  <div className="w-32 h-32 ml-7 overflow-hidden rounded-xl border-4 border-white mr-4 "
                    onClick={() => document.getElementById("Imageinput").click()}
                  >
                    <img
                      src={selectedImage7||"https://via.placeholder.com/150"}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <input
                   type="file"
                    id="Imageinput"
                    accept="image/*"
                    onChange={handleImageChange7} 
                    className="hidden"
                   />
                    </div>
                  {/* Profile Info */}
                  <div className=" mt-10">
                    {/* <h1 className="text-3xl font-bold">John Doe</h1> */}
                    <input type="text"
                      value={nametemp7}
                      onChange={(e) => setNametemp7(e.target.value)}
                      className="bg-transparent text-3xl font-bold"
                    />
                    {/* <h2 className="text-xl">Software Engineer</h2> */}
                    <input type="text"
                    value={professiontemp7}
                    onChange={(e) => setProfessiontemp7(e.target.value)}
                    className="bg-transparent text-xl"
                    />
                    {/* <p className="text-lg italic bg-green-300">Full Stack Developer</p> */}
                  </div>

                {/* Contact Information */}
                <div className="mt-12">
                  {/* <h3 className="text-xl font-bold">Contact</h3> */}
                  <input type="text"
                    value={contactlabeltemp7}
                    onChange={(e) => setContactlabeltemp7(e.target.value)}
                    className="bg-transparent text-xl font-bold"
                  />
                  <div className="mt-4">
                    {/* <p>
                      <strong>Address:</strong> 1234 Elm Street, Springfield, IL
                    </p> */}
                    <input type="text"
                      value={addresslabeltemp7}
                      onChange={(e) => setAddresslabeltemp7(e.target.value)}
                      className="bg-transparent font-bold"
                    />
                    <input type="text"
                    value={addresstemp7}
                    onChange={(e) => setAddresstemp7(e.target.value)}
                    className=" bg-transparent text-xs font-bold"
                    />
                    {/* <p>
                      <strong>Phone:</strong> (555) 555-5555
                    </p> */}
                    <input type="text"
                      value={phonetemp7}
                      onChange={(e) => setPhonetemp7(e.target.value)}
                      className="bg-transparent text-sm w-full"
                    />
                    {/* <p>
                      <strong>E-mail:</strong> john.doe@example.com
                    </p> */}
                    <input type="text"
                      value={emaillabeltemp7}
                      onChange={(e) => setEmaillabeltemp7(e.target.value)}
                      className="text-base bg-transparent font-bold"
                    />

                    <input type="text"
                      value={emailtemp7}
                      onChange={(e) => setEmailtemp7(e.target.value)}
                      className="text-sm bg-transparent "
                    />
                  </div>
                </div>

                {/* Skills Section */}
                <div className="mt-12">
                  {/* <h3 className="text-xl font-bold">Skills</h3> */}
                  <input type="text"
                    value={skillslabeltemp7}
                    onChange={(e) => setSkillslabeltemp7(e.target.value)}
                    className="bg-transparent text-xl font-bold"
                  />
                  {/* <ul className="mt-4 space-y-3">
                    <li>JavaScript</li>
                    <li>React</li>
                    <li>Node.js</li>
                    <li>Python</li>
                  </ul> */}
                  <ul className=" pl-5 mt-2  ">
                      {skillstemp7.map((skillstemp7, index) => {
                        return (
                          <li key={index}>
                            <input
                              type="text"
                              value={skillstemp7}
                              onChange={(e) =>
                                handleskillstemp7Change(
                                  index,
                                  e.target.value
                                )
                              }
                              className=" bg-transparent w-full "
                            />
                          </li>
                        );
                      })}
                    </ul>
                </div>
              </div>

              {/* Right Column */}
              <div className="w-2/3 bg-white text-gray-800 p-6">
                {/* Work History Section */}
                <div className="mb-10">
                  {/* <h3 className="text-xl font-bold">Work History</h3> */}
                  <input type="text"
                    value={workhistorylabeltemp7}
                    onChange={(e) => setWorkhistorylabeltemp7(e.target.value)}
                    className="bg-transparent text-xl font-bold"
                  />
                  {/* <p className="mt-2">
                    Summarize your work experience by listing each job and your
                    responsibilities in 2-3 lines. Start with your most recent
                    job and work backwards using the format below.
                  </p> */}
                  <textarea type="text"
                    value={workhistoryinfotemp7}
                    onChange={(e) => setWorkhistoryinfotemp7(e.target.value)} 
                    className="h-[100px] w-full bg-transparent resize-none"                 
                  />
                  <div className="mt-6">
                    {/* <p className="font-bold">Senior Developer</p> */}
                    <input type="text"
                      value={post1temp7}
                      onChange={(e) =>setPost1temp7(e.target.value) }
                      className="bg-transparent font-bold w-full"
                    />
                    {/* <p className="italic">Tech Innovations Inc.</p> */}
                    <input type="text"
                      value={company1temp7}
                      onChange={(e) => setCompany1temp7(e.target.value)}
                      className="bg-transparent italic"
                    />
                    {/* <ul className="list-disc pl-5">
                      <li>
                        Led development of key features in a major product.
                      </li>
                      <li>
                        Collaborated with design teams to enhance user
                        experience.
                      </li>
                      <li>Optimized backend performance and scalability.</li>
                    </ul> */}
                    <ul className=" pl-5 mt-2 ">
                      {workdone1temp7.map((workdone1temp7, index) => {
                        return (
                          <li key={index}>
                            <textarea
                              type="text"
                              value={workdone1temp7}
                              onChange={(e) =>
                                handleworkdone1temp7Change(
                                  index,
                                  e.target.value
                                )
                              }
                              className=" bg-transparent w-full resize-none "
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="mt-6">
                    {/* <p className="font-bold">Junior Developer</p> */}
                    <input type="text"
                      value={post2temp7}
                      onChange={(e) =>setPost2temp7(e.target.value) }
                      className="bg-transparent font-bold w-full"
                    />
                    {/* <p className="italic">Web Solutions Ltd.</p> */}
                    <input type="text"
                      value={company2temp7}
                      onChange={(e) => setCompany2temp7(e.target.value)}
                      className="italic bg-transparent"
                    />
                    {/* <ul className="list-disc pl-5">
                      <li>
                        Worked on developing front-end components using React.
                      </li>
                      <li>
                        Participated in code reviews and contributed to team
                        meetings.
                      </li>
                      <li>Maintained and updated existing codebases.</li>
                    </ul> */}
                    <ul className=" pl-5 mt-2 ">
                      {workdone2temp7.map((workdone2temp7, index) => {
                        return (
                          <li key={index}>
                            <textarea
                              type="text"
                              value={workdone2temp7}
                              onChange={(e) =>
                                handleworkdone2temp7Change(
                                  index,
                                  e.target.value
                                )
                              }
                              className=" bg-transparent w-full resize-none "
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>

                {/* Education Section */}
                <div>
                  {/* <h3 className="text-xl font-bold">Education</h3> */}
                  <input type="text"
                    value={educationlabeltemp7}
                    onChange={(e) => setEducationlabeltemp7(e.target.value)}
                    className="bg-transparent text-xl font-bold"
                  />
                  <div className="mt-6">
                    {/* <p className="font-bold">
                      Bachelor of Science in Computer Science
                    </p> */}
                    <input type="text"
                      value={facultytemp7}
                      onChange={(e) => setFacultytemp7(e.target.value)}
                      className="bg-transparent font-bold w-full"
                    />
                    {/* <p>State University - Springfield, IL</p> */}
                    <input type="text"
                      value={universitytemp7}
                      onChange={(e) => setUniversitytemp7(e.target.value)}
                      className="bg-transparent w-full"
                    />
                    {/* <p>09/2015 - 05/2019</p> */}
                    <input type="text"
                      value={datetemp7}
                      onChange={(e) => setDatetemp7(e.target.value)}
                    />
                  </div>
                  <div className="mt-6">
                    {/* <p className="font-bold">High School Diploma</p> */}
                    <input type="text"
                      value={schooltemp7}
                      onChange={(e) => setSchooltemp7(e.target.value)}
                      className="bg-transparent font-bold w-full"
                    />
                    {/* <p>Springfield High School - Springfield, IL</p> */}
                    <input type="text"
                      value={facultyschooltemp7}
                      onChange={(e) => setFacultyschooltemp7(e.target.value)}
                      className="bg-transparent w-full"
                    />
                    {/* <p>09/2011 - 05/2015</p> */}
                    <input type="text"
                      value={date2temp7}
                      onChange={(e) => setDate2temp7(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 8:
        return (
          <div
            className="w-full max-w-4xl mx-auto p-8 border border-gray-300"
            style={{ height: "1100px" }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
              {/* Left Column */}
              <div className="bg-gray-100 p-6">
                {/* <h2 className="text-2xl font-bold">Contact Information</h2> */}
                <input type="text"
                  value={contactinfolabeltemp8}
                  onChange={(e) => setContactinfolabeltemp8(e.target.value)}
                  className="text-2xl font-bold bg-transparent"
                />
                {/* <p className="mt-4">Name: Sarah Lee</p> */}
                <input type="text"
                  value={nametemp8}
                  onChange={(e) => setNametemp8(e.target.value)}
                  className=" bg-transparent mt-4"
                />
                {/* <p>Email: sarah.lee@example.com</p> */}
                <input type="text"
                  value={emailtemp8}
                  onChange={(e) => setEmailtemp8(e.target.value)}
                  className="bg-transparent"
                />
                {/* <p>Phone: (555) 555-5555</p> */}
                <input type="text"
                  value={phonetemp8}
                  onChange={(e) => setPhonetemp8(e.target.value)}
                  className="bg-transparent"
                />
                {/* <p>Website: www.sarahlee.com</p> */}
                <input type="text"
                  value={websitetemp8}
                  onChange={(e) => setWebsitetemp8(e.target.value)}
                  className="bg-transparent w-full"
                />

                {/* <h2 className="text-2xl font-bold mt-12">Skills</h2> */}
                <input type="text"
                  value={skillslabeltemp8}
                  onChange={(e) => setSkillslabeltemp8(e.target.value)}
                  className="bg-transparent text-2xl font-bold mt-12"
                />
                {/* <ul className="mt-4 space-y-2">
                  <li>JavaScript</li>
                  <li>React</li>
                  <li>Node.js</li>
                  <li>Python</li>
                </ul> */}
                <ul className=" mt-4 space-y-2 ">
                      {skillstemp8.map((skillstemp8, index) => {
                        return (
                          <li key={index}>
                            <input
                              type="text"
                              value={skillstemp8}
                              onChange={(e) =>
                                handleskillstemp8Change(
                                  index,
                                  e.target.value
                                )
                              }
                              className=" bg-transparent w-full "
                            />
                          </li>
                        );
                      })}
                    </ul>

                {/* <h2 className="text-2xl font-bold mt-12">Education</h2> */}
                <input type="text"
                  value={educationlabeltemp8}
                  onChange={(e) => setEducationlabeltemp8(e.target.value)}
                  className="bg-transparent text-2xl font-bold mt-12"
                />
                <div className="mt-4">
                  {/* <h3 className="text-lg font-semibold">
                    Bachelor of Science in Computer Science
                  </h3> */}
                  <input type="text"
                    value={facultytemp8}
                    onChange={(e) => setFacultytemp8(e.target.value)}
                    className="bg-transparent text-lg font-semibold w-full"
                  />
                  {/* <p className="italic">State University</p> */}
                  <input type="text"
                    value={universitytemp8}
                    onChange={(e) => setUniversitytemp8(e.target.value)}
                    className="italic bg-transparent w-full"
                  />
                  {/* <p>09/2014 - 06/2018</p> */}
                  <input type="text"
                    value={datetemp8}
                    onChange={(e) => setDatetemp8(e.target.value)}
                    className="bg-transparent"
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="bg-white p-6 relative">
                {/* Profile Image */}
                <div className="absolute top-1 right-6 w-24 h-24 overflow-hidden rounded-xl border border-gray-300"
                  onClick={() => document.getElementById("Imageinput").click()}
                >
                  <img
                    src={ selectedImage8 || "https://via.placeholder.com/200x150"}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                <input
                 type="file"
                 id="Imageinput"
                 accept="image/*"
                 onChange={handleImageChange8}
                 className="hidden"
                 />

                {/* <h2 className="text-2xl font-bold mt-24">Profile</h2> */}
                <input type="text"
                  value={profilelabeltemp8}
                  onChange={(e) => setProfilelabeltemp8(e.target.value)}
                  className="text-2xl font-bold mt-24 bg-transparent"
                />
                {/* <p className="mt-4">
                  Full-stack developer with a passion for building efficient and
                  scalable applications. Proficient in both frontend and backend
                  technologies.
                </p> */}
                <textarea type="text"
                  value={profileinfotemp8}
                  onChange={(e) => setProfileinfotemp8(e.target.value)}
                  className="mt-4 bg-transparent w-full h-[100px] resize-none "
                />

                {/* <h2 className="text-2xl font-bold mt-12">Experience</h2> */}
                <input type="text"
                  value={experiencelabeltemp8}
                  onChange={(e) => setExperiencelabeltemp8(e.target.value)}
                  className="bg-transparent text-2xl font-bold mt-12"
                />
                <div className="mt-4">
                  {/* <h3 className="text-lg font-semibold">
                    Full Stack Developer
                  </h3> */}
                  <input type="text"
                    value={post1temp8}
                    onChange={(e) => setPost1temp8(e.target.value)}
                    className="text-lg font-semibold bg-transparent"
                  />
                  {/* <p className="italic">Tech Corp</p> */}
                  <input type="text"
                    value={company1temp8}
                    onChange={(e) => setCompany1temp8(e.target.value)}
                    className="italic bg-transparent"
                  />
                  {/* <ul className="list-disc pl-5 mt-2">
                    <li>
                      Developed and maintained web applications using
                      JavaScript, React, and Node.js.
                    </li>
                    <li>
                      Collaborated with design teams to create user-friendly
                      interfaces.
                    </li>
                    <li>Implemented RESTful APIs to improve data retrieval.</li>
                  </ul> */}
                    <ul className="  pl-5 mt-2 ">
                      {workdone1temp8.map((workdone1temp8, index) => {
                        return (
                          <li key={index}>
                            <textarea
                              type="text"
                              value={workdone1temp8}
                              onChange={(e) =>
                                handleworkdone1temp8Chnage(
                                  index,
                                  e.target.value
                                )
                              }
                              className=" bg-transparent w-full resize-none "
                            />
                          </li>
                        );
                      })}
                    </ul>
                </div>

                <div className="mt-6">
                  {/* <h3 className="text-lg font-semibold">Junior Developer</h3> */}
                  <input type="text"
                    value={post2temp8}
                    onChange={(e) => setPost2temp8(e.target.value)}
                    className="text-lg font-semibold bg-transparent"
                  />
                  {/* <p className="italic">Innovatech</p> */}
                  <input type="text"
                    value={company2temp8}
                    onChange={(e) => setCompany2temp8(e.target.value)}
                    className="italic bg-transparent"
                  />
                  {/* <ul className="list-disc pl-5 mt-2">
                    <li>
                      Assisted in the development of web applications using
                      JavaScript and Python.
                    </li>
                    <li>
                      Worked with senior developers to troubleshoot and debug
                      software issues.
                    </li>
                    <li>
                      Participated in code reviews and contributed to the
                      development of best practices.
                    </li>
                  </ul> */}
                  <ul className="  pl-5 mt-2 ">
                      {workdone2temp8.map((workdone2temp8, index) => {
                        return (
                          <li key={index}>
                            <textarea
                              type="text"
                              value={workdone2temp8}
                              onChange={(e) =>
                                handleworkdone2temp8Change(
                                  index,
                                  e.target.value
                                )
                              }
                              className=" bg-transparent w-full resize-none "
                            />
                          </li>
                        );
                      })}
                    </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 9:
        return (
          <div
            className="w-full max-w-4xl mx-auto p-4 border border-gray-300"
            style={{ height: "1100px" }}
          >
            <div className="grid grid-cols-3 gap-4 h-full">
              {/* Top Header */}
              <div className="col-span-3 bg-gray-700 text-white p-6 relative text-center">
                {/* Profile Image */}
                <div className="absolute top-4 right-6 w-24 h-24 mt-3 overflow-hidden rounded-xl border-4 border-white"
                  onClick={() => document.getElementById("Imageinput").click()}
                  >
                  <img
                    src={selectedImage9 || "https://via.placeholder.com/200x150"}
                    alt="Profile"
                    className="w-full h-full object-cover"

                  />
                   </div>
                  <input
                   type="file"
                   id = "Imageinput"
                   accept = "Image/*"
                   onChange={handleImageChange9}
                   className="hidden"
                   />
                   <div className="flex flex-col ml-[300px]">
                {/* <h1 className="text-4xl font-bold">John Doe</h1> */}
                <input type="text"
                  value={nametemp9}
                  onChange={(e) => setNametemp9(e.target.value)}
                  className="text-4xl font-bold bg-transparent "
                />
                {/* <p className="text-xl mt-2">Web Developer</p> */}
                <input type="text"
                  value={professiontemp9}
                  onChange={(e) => setProfessiontemp9(e.target.value)}
                  className="text-xl mt-2 bg-transparent"
                />
                </div>
              </div>

              {/* Left Sidebar */}
              <div className="col-span-1 bg-gray-200 p-6">
                <div className="mb-10">
                  {/* <h2 className="text-2xl font-bold border-b-2 border-gray-400 pb-2">
                    Contact Information
                  </h2> */}
                  <input type="text"
                    value={contactinfolabeltemp9}
                    onChange={(e) => setContactinfolabeltemp9(e.target.value)}
                    className="text-2xl font-bold border-b-2 border-gray-400 pb-2 bg-transparent"
                  />
                  {/* <p className="mt-4">1234 Elm Street</p> */}
                  <input type="text"
                    value={addresstemp9}
                    onChange={(e) => setAddresstemp9(e.target.value)}
                    className="mt-4 bg-transparent"
                  />
                  {/* <p>(123) 456-7890</p> */}
                  <input type="text"
                    value={phonetemp9}
                    onChange={(e) => setPhonetemp9(e.target.value)}
                    className="bg-transparent"
                  />
                  {/* <p>john.doe@example.com</p> */}
                  <input type="text"
                    value={emailtemp9}
                    onChange={(e) => setEmailtemp9(e.target.value)}
                    className="bg-transparent"
                  />
                </div>

                <div>
                  {/* <h2 className="text-2xl font-bold border-b-2 border-gray-400 pb-2">
                    Skills
                  </h2> */}
                  <input type="text"
                    value={skillslabeltemp9}
                    onChange={(e) => setSkillslabeltemp9(e.target.value)}
                    className="text-2xl font-bold border-b-2 border-gray-400 pb-2 bg-transparent"
                  />
                  {/* <ul className="mt-4 space-y-2">
                    <li>HTML/CSS</li>
                    <li>JavaScript</li>
                    <li>React</li>
                    <li>Node.js</li>
                  </ul> */}
                  <ul className=" mt-4 space-y-2 pl-4">
                      {skillstemp9.map((skillstemp9, index) => {
                        return (
                          <li key={index}>
                            <input
                              type="text"
                              value={skillstemp9}
                              onChange={(e) =>
                                handelskillstemp9(
                                  index,
                                  e.target.value
                                )
                              }
                              className=" bg-transparent  "
                            />
                          </li>
                        );
                      })}
                    </ul>
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="col-span-1 bg-gray-200 p-6">
                <div className="mb-10">
                  {/* <h2 className="text-2xl font-bold border-b-2 border-gray-400 pb-2">
                    Education
                  </h2> */}
                  <input type="text"
                    value={educationlabeltemp9}
                    onChange={(e) => setEducationlabeltemp9(e.target.value)}
                    className="text-2xl font-bold border-b-2 border-gray-400 pb-2 bg-transparent "
                  />
                  {/* <p className="mt-4">
                    <strong>B.Sc. Computer Science</strong>
                  </p> */}
                  <input type="text"
                    value={facultytemp9}
                    onChange={(e) => setFacultytemp9(e.target.value)}
                    className="mt-4 bg-transparent"
                  />
                  {/* <p className="italic">University of Technology</p> */}
                  <input type="text"
                    value={universitytemp9}
                    onChange={(e) => setUniversitytemp9(e.target.value)}
                    className="italic bg-transparent"
                  />
                  {/* <p>09/2015 - 06/2019</p> */}
                  <input type="text"
                    value={datetemp9}
                    onChange={(e) => setDatetemp9(e.target.value)}
                    className="bg-transparent"
                  />
                </div>

                <div>
                  {/* <h2 className="text-2xl font-bold border-b-2 border-gray-400 pb-2">
                    Languages
                  </h2> */}
                  <input type="text"
                    value={languageslabeltemp9}
                    onChange={(e) => setLanguageslabeltemp9(e.target.value)}
                    className="text-2xl font-bold border-b-2 border-gray-400 pb-2 bg-transparent"
                  />
                  {/* <ul className="mt-4 space-y-2">
                    <li>English</li>
                    <li>Spanish</li>
                    <li>French</li>
                  </ul> */}

                    {/* <ul className=" mt-4 space-y-2 pl-4">
                      {languagetemp9.map((languagetemp9, index) => {
                        return (
                          <li key={index}>
                            <input
                              type="text"
                              value={languagetemp9}
                              onChange={(e) =>
                                handlelanguagetemp9Change(
                                  index,
                                  e.target.value
                                )
                              }
                              className=" bg-transparent  "
                            />
                          </li>
                        );
                      })}
                    </ul> */}

                <ul className=" mt-4 space-y-2 pl-4">
                      {languagetemp9.map((languagetemp9, index) => {
                        return (
                          <li key={index}>
                            <input
                              type="text"
                              value={languagetemp9}
                              onChange={(e) =>
                                handlelanguagetemp9Change(
                                  index,
                                  e.target.value
                                )
                              }
                              className=" bg-transparent  "
                            />
                          </li>
                        );
                      })}
                    </ul>
                </div>
              </div>

              {/* Main Content */}
              <div className="col-span-3 bg-white text-gray-900 p-6">
                {/* <h2 className="text-2xl font-bold border-b-2 border-gray-400 pb-2">
                  Work Experience
                </h2> */}
                <input type="text"
                  value={workexperiencelabeltemp9}
                  onChange={(e) => setWorkexperiencelabeltemp9(e.target.value)}
                  className="text-2xl font-bold border-b-2 border-gray-400 pb-2 bg-transparent"
                />
                <div className="mt-6">
                  {/* <h3 className="text-lg font-semibold">Front-End Developer</h3> */}
                 
                  <input type="text"
                    value={post1temp9}
                    onChange={(e) => setPost1temp9(e.target.value)}
                    className="text-lg font-semibold bg-transparent w-full"
                  />
                  {/* <p className="italic">XYZ Company</p> */}
                  <input type="text"
                    value={company1temp9}
                    onChange={(e) => setCompanytemp9(e.target.value)}
                    className="italic bg-transparent"
                  />
                  {/* <ul className="list-disc pl-5 mt-2">
                    <li>Developed responsive websites and web applications.</li>
                    <li>
                      Collaborated with designers and back-end developers.
                    </li>
                    <li>Optimized code for performance and scalability.</li>
                  </ul> */}
                  <ul className=" mt-2 -space-y-4 pl-4">
                      {wrokdone1temp9.map((wrokdone1temp9, index) => {
                        return (
                          <li key={index}>
                            <textarea
                              type="text"
                              value={wrokdone1temp9}
                              onChange={(e) =>
                                handlewrokdone1temp9Change(index, e.target.value )
                              }
                              className=" bg-transparent w-full resize-none "
                            />
                          </li>
                        );
                      })}
                    </ul>
                </div>

                <div className="mt-6">
                  {/* <h3 className="text-lg font-semibold">Junior Developer</h3> */}
                  <input type="text"
                    value={post2temp9}
                    onChange={(e) => setPost2temp9(e.target.value)}
                    className="text-lg font-semibold bg-transparent w-full"
                  />
                  {/* <p className="italic">ABC Corp</p> */}
                  <input type="text" 
                    value={company2temp9}
                    onChange={(e) => setCompany2temp9(e.target.value)}
                    className="italic bg-transparent"
                  />
                  {/* <ul className="list-disc pl-5 mt-2">
                    <li>Assisted in developing and maintaining websites.</li>
                    <li>Wrote clean, efficient, and maintainable code.</li>
                    <li>
                      Performed testing and debugging of web applications.
                    </li>
                  </ul> */}

                  <ul className=" mt-2 -space-y-4 pl-4">
                      {workdone2temp9.map((workdone2temp9, index) => {
                        return (
                          <li key={index}>
                            <textarea
                              type="text"
                              value={workdone2temp9}
                              onChange={(e) =>
                                handlewrokdone2temp9Change(
                                  index,
                                  e.target.value
                                )
                              }
                              className=" bg-transparent w-full resize-none "
                            />
                          </li>
                        );
                      })}
                    </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 10:
        return (
          <div
            className="w-full max-w-4xl mx-auto p-4 border border-gray-300"
            style={{ height: "1100px" }}
          >
            <div className="h-full">
              {/* Header */}
              <div className={`${getTextColor()} p-6 text-center`}>
                {/* <h1 className="text-4xl font-bold">Michael Smith</h1> */}
                <div className=" flex flex-col w-fit ml-[300px]">
                <input type="text"
                  value={nametemp10}
                  onChange={(e) => setNametemp10(e.target.value)}
                  className="font-bold text-4xl bg-transparent"
                />
                {/* <p className="text-xl mt-2">Software Engineer</p> */}
                <input type="text"
                  value={professiontemp10}
                  onChange={(e) => setProfessiontemp10(e.target.value)}
                  className="text-xl mt-2 bg-transparent ml-[40px]"
                />
                </div>
                <div>
                  <div 
                    className="absolute top-8 right-[1080px] mt-6 w-24 h-24 overflow-hidden rounded-xl border-4 border-white "
                    onClick={() =>  document.getElementById("Imageinput10").click()}
                  >
                    <img
                      src={selectedImage10 || "https://via.placeholder.com/200x150"}
                      alt="Profile"
                      className="h-full w-full object-cover "
                    />
                    </div>

                    <input
                      type="file" 
                      id = "Imageinput10"
                      accept="image/*"
                      onChange={handleImageChange10}
                      className="hidden"
                    />
                </div>
                </div>

              <div className="flex flex-col md:flex-row h-full mt-6">
                {/* Left Section */}
                <div className="md:w-1/2 bg-gray-200 p-6">
                  {/* <h2 className="text-2xl font-bold mb-4">About Me</h2> */}
                  <input type="text"
                    value={aboutmetemp10}
                    onChange={(e) => setAboutmetemp10(e.target.value)}
                    className="text-2xl font-bold mb-4 bg-transparent"
                  />
                  {/* <p>
                    Dedicated software engineer with 7 years of experience in
                    developing high-performance web applications. Proficient in
                    JavaScript, Python, and cloud technologies.
                  </p> */}
                  <textarea type="text"
                    value={aboutmeinfotemp10}
                    onChange={(e) => setAboutmeinfotemp10(e.target.value)}
                    className="text-base bg-transparent resize-none w-full h-[150px]"
                  />

                  {/* <h2 className="text-2xl font-bold mt-12 mb-4">Skills</h2> */}
                  <input type="text"
                    value={skillslabeltemp10}
                    onChange={(e) => setSkillslabeltemp10(e.target.value)}
                    className="text-2xl font-bold mt-12 mb-4 bg-transparent"
                  />
                  {/* <ul className="space-y-2">
                    <li>JavaScript</li>
                    <li>Python</li>
                    <li>React.js</li>
                    <li>Node.js</li>
                    <li>AWS</li>
                  </ul> */}

                    <ul className=" space-y-2 ">
                      {skillstemp10.map((skillstemp10, index) => {
                        return (
                          <li key={index}>
                            <input
                              type="text"
                              value={skillstemp10}
                              onChange={(e) =>
                                handleskillstemp10Chnage(
                                  index,
                                  e.target.value
                                )
                              }
                              className=" bg-transparent "
                            />
                          </li>
                        );
                      })}
                    </ul>
                </div>

                {/* Right Section */}
                <div className="md:w-1/2 bg-white p-6">
                  {/* <h2 className="text-2xl font-bold mb-4">Experience</h2> */}
                  <input type="text"
                    value={experiencetemp10}
                    onChange={(e) => setExperiencetemp10(e.target.value)}
                    className="text-2xl font-bold mb-4 bg-transparent"
                  />
                  <div className="mt-4">
                    {/* <h3 className="text-lg font-semibold">
                      Senior Software Engineer
                    </h3> */}
                    <input type="text"
                      value={post1temp10}
                      onChange={(e) => setPost1temp10(e.target.value)}
                      className="text-lg font-semibold"
                    />
                    {/* <p className="italic">Tech Solutions</p> */}
                    <input type="text"
                      value={company1temp10}
                      onChange={(e) => setCompany1temp10(e.target.value)}
                      className="italic bg-transparent"
                    />
                    {/* <ul className="list-disc pl-5 mt-2">
                      <li>
                        Led the development of a scalable e-commerce platform.
                      </li>
                      <li>Integrated RESTful APIs and third-party services.</li>
                      <li>
                        Mentored junior developers and conducted code reviews.
                      </li>
                    </ul> */}
                    <ul className=" pl-5 ">
                      {workdone1temp10.map((workdone1temp10, index) => {
                        return (
                          <li key={index}>
                            <textarea
                              type="text"
                              value={workdone1temp10}
                              onChange={(e) =>
                                handleworkdone1temp10Chnage(
                                  index,
                                  e.target.value
                                )
                              }
                              className=" bg-transparent w-full resize-none"
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="mt-6">
                    {/* <h3 className="text-lg font-semibold">Software Engineer</h3> */}
                    <input type="text"
                      value={post2temp10}
                      onChange={(e) => setPost2temp10(e.target.value)}
                      className="text-lg font-semibold bg-transparent"
                    />
                    {/* <p className="italic">Innovatech</p> */}
                    <input type="text"
                      value={company2temp10}
                      onChange={(e) => setCompany2temp10(e.target.value)}
                      className="italic bg-transparent"
                    />
                    {/* <ul className="list-disc pl-5 mt-2">
                      <li>
                        Developed and maintained web applications using React
                        and Node.js.
                      </li>
                      <li>
                        Collaborated with cross-functional teams to deliver
                        projects on time.
                      </li>
                      <li>
                        Optimized applications for maximum speed and
                        scalability.
                      </li>
                    </ul> */}
                    <ul className=" pl-5 mt-2">
                      {workdone2temp10.map((workdone2temp10, index) => {
                        return (
                          <li key={index}>
                            <textarea
                              type="text"
                              value={workdone2temp10}
                              onChange={(e) =>
                                handleworkdone2temp10Change(
                                  index,
                                  e.target.value
                                )
                              }
                              className=" bg-transparent w-full resize-none"
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* <h2 className="text-2xl font-bold mt-12 mb-4">Education</h2> */}
                  <input type="text"
                    value={educationlabeltemp10}
                    onChange={(e) => setEducationlabeltemp10(e.target.value)}
                    className="text-2xl font-bold mt-12 bg-transparent"
                  />
                  <div className="mt-4">
                    {/* <h3 className="text-lg font-semibold">
                      Bachelor of Science in Computer Science
                    </h3> */}
                    <input type="text"
                      value={facultytemp10}
                      onChange={(e) => setFacultytemp10(e.target.value)}
                      className="text-lg font-semibold bg-transparent w-full"
                    />
                    {/* <p className="italic">State University</p> */}
                    <input type="text"
                      value={universitytemp10}
                      onChange={(e) => setUniversitytemp10(e.target.value)}
                      className="italic bg-transparent w-full"
                    />
                    {/* <p>09/2010 - 06/2014</p> */}
                    <input type="text"
                      value={datetemp10}
                      onChange={(e) => setDatetemp10(e.target.value)}
                      className="bg-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 11:
        return (
          <div
            className="w-full max-w-2xl mx-auto p-8 border border-gray-300"
            style={{ height: "1100px" }}
          >
            <div className="h-full">
              <div 
                className="absolute top-10 left-[950px] w-24 h-24 overflow-hidden rounded-xl border-4 border-black"
                onClick={() => document.getElementById("imageInput").click()}
              >
                  <img src={selectedImage11 || "https://via.placeholder.com/200x150"} 
                  alt="profile" 
                  className="w-full h-full object-cover"
                  />
                 </div>
                <input
                 type="file"
                 id = "imageInput"
                 accept="image/*"
                 onChange={handleImageChange11}
                 className="hidden"
                 />
          
                 




              {/* Header */}
              <div className="text-center mb-8 flex flex-col">
                {/* <h1 className="text-4xl font-bold">Emily Johnson</h1> */}
                <input type="text"
                  value={nametemp11}
                  onChange={(e) => setNametemp11(e.target.value)}
                  className="text-4xl font-bold bg-transparent ml-[150px]"
                />
                {/* <p className="text-lg mt-2">Digital Marketing Specialist</p> */}
                <input type="text"
                  value={professiontemp11}
                  onChange={(e) => setProfessiontemp11(e.target.value)}
                  className="text-lg mt-2 bg-transparent w-[250px] ml-[170px]"
                />
                {/* <p className="mt-2">
                  emily.johnson@example.com | (555) 555-5555
                </p> */}
                <input type="text"
                  value={emailtemp11}
                  onChange={(e) => setEmailtemp11(e.target.value)}
                  className="mt-2 bg-transparent ml-[140px]"
                />
              </div>

              {/* Summary */}
              <div className="mb-8">
                {/* <h2 className="text-2xl font-bold">Summary</h2> */}
                <input type="text"
                  value={summarytemp11}
                  onChange={(e) => setSummarytemp11(e.target.value)}
                  className="text-2xl font-bold bg-transparent"
                />
                {/* <p className="mt-4">
                  Dynamic marketing professional with 6+ years of experience in
                  digital campaigns, SEO, and content creation. Adept at leading
                  cross-functional teams to deliver high-impact projects.
                </p> */}
                <textarea type="text"
                  value={summaryinfotemp11}
                  onChange={(e) => setSummaryinfotemp11(e.target.value)}
                  className="mt-4 bg-transparent w-full resize-none h-[100px]"
                />
              </div>

              {/* Experience */}
              <div className="mb-8">
                {/* <h2 className="text-2xl font-bold">Experience</h2> */}
                <input type="text"
                  value={experiencetemp11}
                  onChange={(e) => setExperiencetemp11(e.target.value)}
                  className="text-2xl font-bold bg-transparent"
                />
                <div className="mt-4">
                  {/* <h3 className="text-lg font-semibold">
                    Senior Digital Marketing Manager
                  </h3> */}
                  <input type="text"
                    value={post1temp11}
                    onChange={(e) => setPost1temp11(e.target.value)}
                    className="text-lg font-semibold bg-transparent w-full"
                  />
                  {/* <p className="italic">XYZ Marketing Solutions</p> */}
                  <input type="text"
                    value={company1temp11}
                    onChange={(e) => setCompany1temp11(e.target.value)}
                    className="italic bg-transparent w-full"
                  />
                  {/* <ul className="list-disc pl-5 mt-2">
                    <li>
                      Led a team of 10 to develop and implement comprehensive
                      marketing strategies.
                    </li>
                    <li>
                      Increased online sales by 30% through targeted campaigns.
                    </li>
                    <li>Managed a $500k annual marketing budget.</li>
                  </ul> */}
                  <ul className=" pl-5 mt-2 -space-y-5">
                      {workdone1temp11.map((workdone1temp11, index) => {
                        return (
                          <li key={index}>
                            <textarea
                              type="text"
                              value={workdone1temp11}
                              onChange={(e) =>
                                handleworkdone1temp11Change(
                                  index,
                                  e.target.value
                                )
                              }
                              className=" bg-transparent w-full resize-none"
                            />
                          </li>
                        );
                      })}
                    </ul>
                </div>

                <div className="mt-6">
                  {/* <h3 className="text-lg font-semibold">
                    Digital Marketing Specialist
                  </h3> */}
                  <input type="text"
                    value={post2temp11}
                    onChange={(e) => setPost2temp11(e.target.value)}
                    className="text-lg font-semibold bg-transparent w-full"
                  />
                  {/* <p className="italic">ABC Tech</p> */}
                  <input type="text"
                    value={company2temp11}
                    onChange={(e) => setCompany2temp11(e.target.value)}
                    className="italic bg-transparent"
                  />
                  {/* <ul className="list-disc pl-5 mt-2">
                    <li>
                      Optimized SEO for a website with 1 million monthly
                      visitors.
                    </li>
                    <li>
                      Developed content strategies that increased engagement by
                      40%.
                    </li>
                    <li>
                      Collaborated with the sales team to align marketing
                      strategies.
                    </li>
                  </ul> */}
                  <ul className=" pl-5 mt-2 -space-y-5">
                      {workdone2temp11.map((workdone2temp11, index) => {
                        return (
                          <li key={index}>
                            <textarea
                              type="text"
                              value={workdone2temp11}
                              onChange={(e) =>
                                handleworkdone2temp11Change(
                                  index,
                                  e.target.value
                                )
                              }
                              className=" bg-transparent w-full resize-none"
                            />
                          </li>
                        );
                      })}
                    </ul>
                </div>
              </div>

              {/* Education */}
              <div className="mb-8">
                {/* <h2 className="text-2xl font-bold">Education</h2> */}
                <input type="text"
                  value={educationtemp11}
                  onChange={(e) => seteducationtemp11(e.target.value)}
                  className="text-2xl font-bold bg-transparent"
                />
                <div className="mt-4">
                  {/* <h3 className="text-lg font-semibold">
                    Bachelor of Science in Marketing
                  </h3> */}
                  <input type="text"
                    value={facultytemp11}
                    onChange={(e) => setFacultytemp11(e.target.value)}
                    className="text-lg font-semibold bg-transparent w-full"
                  />
                  {/* <p className="italic">State University</p> */}
                  <input type="text"
                    value={universitytemp11}
                    onChange={(e) => setUniversitytemp11(e.target.value)}
                    className="italic bg-transparent w-full"
                  />
                  {/* <p>09/2008 - 06/2012</p> */}
                  <input type="text"
                    value={datetemp11}
                    onChange={(e) => setDatetemp11(e.target.value)}
                    className="bg-transparent w-full"
                  />
                </div>
              </div>

              {/* Skills */}
              <div>
                {/* <h2 className="text-2xl font-bold">Skills</h2> */}
                <input type="text"
                  value={skilllabelstemp11}
                  onChange={(e) => setSkillslabeltemp11(e.target.value)}
                  className="text-2xl font-bold bg-transparent"
                />
                {/* <ul className="mt-4 space-y-2">
                  <li>SEO & SEM</li>
                  <li>Google Analytics</li>
                  <li>Content Marketing</li>
                  <li>Email Campaigns</li>
                </ul> */}
                <ul className=" pl-5 mt-2 space-y-2">
                      {skillstemp11.map((skillstemp11, index) => {
                        return (
                          <li key={index}>
                            <input
                              type="text"
                              value={skillstemp11}
                              onChange={(e) =>
                                handleskillstemp11Change(
                                  index,
                                  e.target.value
                                )
                              }
                              className=" bg-transparent w-full "
                            />
                          </li>
                        );
                      })}
                    </ul>
              </div>
            </div>
          </div>
        );

      case 12:
        return (
          <div
            className="w-full max-w-3xl mx-auto p-8 border border-gray-300"
            style={{ height: "1100px" }}
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className={`flex items-center ${getTextColor()} p-6`} style={getColorStyle('gray-800', 'dark')}>
                <div className="w-2/3">
                  {/* <h1 className="text-4xl font-bold">John Doe</h1> */}
                  <input
                    type="text"
                    value={nametemp12}
                    onChange={(e) => setNametemp12(e.target.value)}
                    className="text-4xl font-bold bg-transparent w-[250px]"
                  />
                  {/* <p className="text-xl mt-2">Software Engineer</p> */}
                  <input
                    type="text"
                    value={professiontemp12}
                    onChange={(e) => setProfessiontemp12(e.target.value)}
                    className="text-xl mt-2 bg-transparent"
                  />
                </div>

                {/* //image field */}
                <div className="relative ">
                  <div
                  
                    className="w-24 h-24 overflow-hidden rounded-xl border-4 border-white cursor-pointer ml-[-200px] "
                    onClick={() =>
                      document.getElementById("imageInput").click()
                    }
                  >
                    {/* Image Preview */}
                    <img
                      src={selectedImage12 || "https://via.placeholder.com/200x150"}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <input
                    type="file"
                    id="imageInput"
                    accept="image/*"
                    onChange={handleImageChange12}
                    className="hidden"
                  />
                </div>

                <div className="w-1/3 text-right ">
                  {/* <p>Email: john.doe@example.com</p> */}
                  <input
                    type="text"
                    value={emailtemp12}
                    onChange={(e) => setEmailtemp12(e.target.value)}
                    className="bg-transparent w-full "
                  />
                  {/* <p>Phone: (555) 555-5555</p> */}
                  <input
                    type="text"
                    value={phonetemp12}
                    onChange={(e) => setPhonetemp12(e.target.value)}
                    className="bg-transparent w-full"
                  />
                  {/* <p>Website: www.johndoe.com</p> */}
                  <input
                    type="text"
                    value={websitetemp12}
                    onChange={(e) => setwebsitetemp12(e.target.value)}
                    className="bg-transparent w-full"
                  />
                </div>
              </div>

              {/* Body */}
              <div className="flex-grow flex flex-col md:flex-row mt-6">
                {/* Left Section */}
                <div className="md:w-1/2 bg-gray-100 p-6">
                  {/* <h2 className="text-2xl font-bold mb-4">Profile</h2> */}
                  <input
                    type="text"
                    value={profiletemp12}
                    onChange={(e) => setProfiletemp12(e.target.value)}
                    className="text-2xl font-bold mb-4 bg-transparent"
                  />
                  {/* <p>
                    Experienced software engineer with a strong background in
                    developing scalable web applications. Expertise in
                    JavaScript, Python, and cloud services.
                  </p> */}
                  <textarea
                    type="text"
                    value={profileinfotemp12}
                    onChange={(e) => setProfileinfotemp12(e.target.value)}
                    className="resize-none  w-full h-[130px] bg-transparent"
                  />

                  {/* <h2 className="text-2xl font-bold mt-12 mb-4">Education</h2> */}
                  <input
                    type="text"
                    value={educationtemp12}
                    onChange={(e) => setEducationtemp12(e.target.value)}
                    className="bg-transparent text-2xl font-bold mt-12 "
                  />
                  <div className="mt-4">
                    {/* <h3 className="text-lg font-semibold">
                      Bachelor of Science in Computer Science
                    </h3> */}
                    <input
                      type="text"
                      value={facultytemp12}
                      onChange={(e) => setFacultytemp12(e.target.value)}
                      className="bg-transparent text-lg font-semibold w-full"
                    />
                    {/* <p className="italic">State University</p> */}
                    <input
                      type="text"
                      value={universitytemp12}
                      onChange={(e) => setUniversitytemp12(e.target.value)}
                      className="italic bg-transparent"
                    />
                    {/* <p>09/2010 - 06/2014</p> */}
                    <input
                      type="text"
                      value={datetemp12}
                      onChange={(e) => setDatetemp12(e.target.value)}
                      className="bg-transparent"
                    />
                  </div>
                </div>

                {/* Right Section */}
                <div className="md:w-1/2 bg-white text-gray-800 p-6">
                  {/* <h2 className="text-2xl font-bold mb-4">Experience</h2> */}
                  <input
                    type="text"
                    value={experiencetemp12}
                    onChange={(e) => setExperiencetemp12(e.target.value)}
                    className="bg-transparent text-2xl font-bold "
                  />
                  <div className="mt-4">
                    {/* <h3 className="text-lg font-semibold">
                      Senior Software Engineer
                    </h3> */}
                    <input
                      type="text"
                      value={post1temp12}
                      onChange={(e) => setPost1temp12(e.target.value)}
                      className="bg-transparent text-lg font-semibold"
                    />
                    {/* <p className="italic">Tech Solutions</p> */}
                    <input
                      type="text"
                      value={company1temp12}
                      onChange={(e) => setCompany1temp12(e.target.value)}
                      className="italic bg-transparent"
                    />
                    {/* <ul className="list-disc pl-5 mt-2">
                      <li>
                        Led the development of a scalable e-commerce platform.
                      </li>
                      <li>Integrated RESTful APIs and third-party services.</li>
                      <li>
                        Mentored junior developers and conducted code reviews.
                      </li>
                    </ul> */}
                    {/* <ul className="list-disc pl-5  mt-2">
                        {workdone1temp12.map(workdone1temp12, index) => {
                            return (
                                <li key = {index}>
                                    <input type="text" 
                                        value={workdone1temp12}
                                        onChange={(e) => setWorkdone1temp12(e.target.value)}
                                    />
                                </li>
                            )
                        }}

                    </ul> */}

                    <ul className=" pl-5  mt-2  ">
                      {workdone1temp12.map((workdone1temp12, index) => {
                        return (
                          <li key={index}>
                            <textarea
                              type="text"
                              value={workdone1temp12}
                              onChange={(e) =>
                                handleworkdone1temp12Change(
                                  index,
                                  e.target.value
                                )
                              }
                              className=" bg-transparent w-full resize-none ml-2 "
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="mt-6">
                    {/* <h3 className="text-lg font-semibold">Software Engineer</h3> */}
                    <input
                      type="text"
                      value={post2temp12}
                      onChange={(e) => setPost2temp12(e.target.value)}
                      className="text-lg font-semibold bg-transparent"
                    />
                    {/* <p className="italic">Innovatech</p> */}
                    <input
                      type="text"
                      value={company2temp12}
                      onChange={(e) => setCompany2temp12(e.target.value)}
                      className="italic bg-transparent"
                    />
                    {/* <ul className="list-disc pl-5 mt-2">
                      <li>
                        Developed and maintained web applications using React
                        and Node.js.
                      </li>
                      <li>
                        Collaborated with cross-functional teams to deliver
                        projects on time.
                      </li>
                      <li>
                        Optimized applications for maximum speed and
                        scalability.
                      </li>
                    </ul> */}

                    <ul className=" pl-5  mt-2  ">
                      {workdone2temp12.map((workdone2temp12, index) => {
                        return (
                          <li key={index}>
                            <textarea
                              type="text"
                              value={workdone2temp12}
                              onChange={(e) =>
                                handleworkdone2temp12Change(
                                  index,
                                  e.target.value
                                )
                              }
                              className=" bg-transparent w-full resize-none ml-2 "
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <p>Template not found</p>;
    }
  };

  return (
    <div className="relative">
      

      
  <div>
  <nav className="w-full h-14 bg-blue-700">
    <img src={Logo} className=" h-[70px] w-52 ml-20 mt-[-10px] absolute" alt="" />
        <p className="text-white ml-[600px] font-bold text-2xl mt-2 absolute">Please click to anywhere you wana edit.</p>
        <h1 className="text-yellow-200 absolute ml-[1300px] mt-4 text-sm font-bold">Fill CV for Template {templateId}</h1>
  </nav>
  </div>

      {/* {renderTemplate()} */}

      <div>
        <div 
          ref={cvRef} 
          className="bg-white"
          style={{ 
            border: 'none',
            boxShadow: 'none',
            overflow: 'visible',
            minHeight: '100%'
          }}
        >
          {renderTemplate()}
        </div>

        {/* Enhanced Download Section */}
        <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 flex flex-col gap-3 items-end max-w-[90vw] md:max-w-none">
          {/* Download Options */}
          <div className={`bg-white rounded-xl shadow-2xl p-3 md:p-4 flex flex-col gap-2 md:gap-3 transition-all duration-300 ${
            isDownloading ? 'opacity-75 pointer-events-none' : ''
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-semibold text-gray-800">Download Options</span>
            </div>
            
            <button
              onClick={() => handleDownload('pdf')}
              disabled={isDownloading}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 w-full md:min-w-[180px] justify-center text-sm md:text-base"
            >
              {isDownloading && downloadProgress < 100 ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating PDF...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Download as PDF
                </>
              )}
            </button>

            <button
              onClick={() => handleDownload('png')}
              disabled={isDownloading}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 w-full md:min-w-[180px] justify-center text-sm md:text-base"
            >
              {isDownloading && downloadProgress < 100 ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating PNG...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Download as PNG
                </>
              )}
            </button>

            {/* Progress Bar */}
            {isDownloading && downloadProgress > 0 && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 text-center mt-1">{downloadProgress}%</p>
              </div>
            )}
          </div>

          {/* Quality Info Tooltip - Hidden on mobile */}
          <div className="hidden md:block bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-xs">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs font-semibold text-blue-900 mb-1">High Quality Export</p>
                <p className="text-xs text-blue-700">
                  PDF: Print-ready (300 DPI equivalent)<br/>
                  PNG: Maximum quality image
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Fill_cv;
