import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
// import html2pdf from "html2pdf.js";
// import { html2pdf } from "html2pdf.js";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import Logo from "../assets/logoo.png";
import { useAuth } from "../../context/AuthContext";
import { parseEnhancedResumeToStructuredData } from "../../utils/parseEnhancedResume";
import FormattingToolbar from "../../components/FormattingToolbar";
import RichTextBlock from "../../components/RichTextBlock";

const stripHtml = (html) => {
  if (!html || typeof html !== 'string') return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

const imageToCircularDataUrl = (dataUrl, size = 144) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

const PREMIUM_TEMPLATE_IDS = []; // All templates free to access

const TEMPLATE_NAMES = {
  1: "Modern Professional", 2: "Classic Elegant", 3: "Creative Design",
  4: "Corporate Standard", 5: "Minimalist Style", 6: "Traditional Layout",
  7: "Bold Creative", 8: "Executive Format", 9: "Contemporary Design",
  10: "Timeless Classic", 11: "Artistic Layout", 12: "Business Professional",
  13: "ATS-Optimized", 14: "Tech Developer", 15: "Academic Scholar"
};

const Fill_cv = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isPremium } = useAuth();
  // Read templateId from URL (persists across navigation) or state (from Choose_templates)
  const templateId = Number(location.state?.templateId ?? searchParams.get("templateId"));
  const selectedColor = location.state?.selectedColor || null;
  const enhancedResume = location.state?.enhancedResume || null;
  const cvRef = useRef(null); // ref to capture the cv section
  const image7DataUrlRef = useRef(null); // for blob→dataURL conversion when generating Template 7 PDF
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showEnhancedRef, setShowEnhancedRef] = useState(true);
  const [editableRefContent, setEditableRefContent] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (enhancedResume) setEditableRefContent(enhancedResume);
  }, [enhancedResume]);

  const handleCopyRefContent = async () => {
    try {
      await navigator.clipboard.writeText(editableRefContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Could not copy. Please select and copy manually.');
    }
  };

  const applyEditedContentToTemplate = (text) => {
    if (!text?.trim() || !templateId) return;
    const data = parseEnhancedResumeToStructuredData(text);
    if (!data) return;
    if (templateId === 10) {
      if (data.profession) setProfessiontemp10(data.profession);
      if (data.summary) setAboutmeinfotemp10(data.summary);
      if (data.skills.length > 0) {
        const padded = [...data.skills];
        while (padded.length < 5) padded.push('');
        setSkillstemp10(padded.slice(0, 5));
      }
      if (data.experiences.length > 0) {
        const ex0 = data.experiences[0];
        if (ex0.role) setPost1temp10(ex0.role);
        if (ex0.company) setCompany1temp10(ex0.company);
        if (ex0.responsibilities.length > 0) setWorkdone1temp10(ex0.responsibilities.slice(0, 5));
      }
      if (data.experiences.length > 1) {
        const ex1 = data.experiences[1];
        if (ex1.role) setPost2temp10(ex1.role);
        if (ex1.company) setCompany2temp10(ex1.company);
        if (ex1.responsibilities.length > 0) setWorkdone2temp10(ex1.responsibilities.slice(0, 5));
      }
      if (data.education.degree) setFacultytemp10(data.education.degree);
      if (data.education.school) setUniversitytemp10(data.education.school);
      if (data.education.date) setDatetemp10(data.education.date);
      if (data.name) setNametemp10(data.name);
    } else if (templateId === 11) {
      if (data.profession) setProfessiontemp11(data.profession);
      if (data.summary) setSummaryinfotemp11(data.summary);
      if (data.skills.length > 0) setSkillstemp11(data.skills.slice(0, 4));
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        if (ex.role) setPost1temp11(ex.role);
        if (ex.company) setCompany1temp11(ex.company);
        if (ex.responsibilities.length > 0) setWorkdone1temp11(ex.responsibilities.slice(0, 3));
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        if (ex.role) setPost2temp11(ex.role);
        if (ex.company) setCompany2temp11(ex.company);
        if (ex.responsibilities.length > 0) setworkdone2temp11(ex.responsibilities.slice(0, 3));
      }
      if (data.education.degree) setFacultytemp11(data.education.degree);
      if (data.education.school) setUniversitytemp11(data.education.school);
      if (data.education.date) setDatetemp11(data.education.date);
      if (data.name) setNametemp11(data.name);
    } else if (templateId === 2) {
      if (data.summary) setProfileinfoTemp2(data.summary);
      if (data.profession) setTitletemp2(data.profession.toUpperCase());
      if (data.skills.length > 0) setSkillstemp2(data.skills.slice(0, 5));
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        const datePart = ex.dateRange ? ` • ${ex.dateRange}` : '';
        if (ex.role) setPost1temp2(ex.role.toUpperCase() + datePart);
        if (ex.company) setCompany1temp2(ex.company);
        if (ex.responsibilities.length > 0) setWorkdone1temp2(ex.responsibilities.slice(0, 3));
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        const datePart = ex.dateRange ? ` • ${ex.dateRange}` : '';
        if (ex.role) setPost2temp2(ex.role.toUpperCase() + datePart);
        if (ex.company) setCompany2temp2(ex.company);
        if (ex.responsibilities.length > 0) setWorkdone2temp2(ex.responsibilities.slice(0, 3));
      }
      if (data.experiences.length > 2) {
        const ex = data.experiences[2];
        const datePart = ex.dateRange ? ` • ${ex.dateRange}` : '';
        if (ex.role) setPost3temp2(ex.role.toUpperCase() + datePart);
        if (ex.company) setCompany3temp2(ex.company);
        if (ex.responsibilities.length > 0) setWorkdone3temp2(ex.responsibilities.slice(0, 3));
      }
      if (data.education.degree) setEducationtemp2(data.education.date ? `${data.education.degree} • ${data.education.date}` : data.education.degree);
      if (data.education.school) setUniversitytemp2(data.education.school);
      if (data.name) setNametemp2(data.name.replace(/^Name:\s*/i, "").toUpperCase());
    } else if (templateId === 3) {
      if (data.profession) setProfessiontemp3(data.profession);
      if (data.skills.length > 0) setSkillstemp3(data.skills.join(', '));
      if (data.summary) setAbouttemp3(data.summary);
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        if (ex.role) setPosttemp3(ex.dateRange ? `${ex.role} (${ex.dateRange})` : ex.role);
        if (ex.responsibilities.length > 0) setWorkdonetemp3(ex.responsibilities.join(' '));
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        if (ex.role) setPost2temp3(ex.dateRange ? `${ex.role} (${ex.dateRange})` : ex.role);
        if (ex.responsibilities.length > 0) setWorkdone2temp3(ex.responsibilities.join(' '));
      }
      if (data.education.degree) setEdu1temp3(data.education.date ? `${data.education.degree} (${data.education.date})` : data.education.degree);
      if (data.education.school) setEdu1desctemp3(data.education.school);
      if (data.name) setNametemp3(data.name);
    } else if (templateId === 4) {
      if (data.profession) setProfessiontemp4(data.profession);
      if (data.summary) setSummarytemp4(data.summary);
      if (data.skills.length > 0) {
        setSkillstemp4(data.skills.slice(0, 5).map((name, i) => ({ name, level: 90 - i * 5 })));
      }
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        if (ex.role) setPosttemp4(ex.dateRange ? `${ex.role} | ${ex.dateRange}` : ex.role);
        if (ex.company) setCompanytemp4(ex.company);
        if (ex.responsibilities.length > 0) setWorkdonetemp4(ex.responsibilities.slice(0, 4));
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        if (ex.role) setPost2temp4(ex.dateRange ? `${ex.role} | ${ex.dateRange}` : ex.role);
        if (ex.company) setCompany2temp4(ex.company);
        if (ex.responsibilities.length > 0) setWorkdone2temp4(ex.responsibilities.slice(0, 4));
      }
      if (data.education.degree) setFacultytemp4(data.education.date ? `${data.education.degree} | ${data.education.date}` : data.education.degree);
      if (data.education.school) setCollegetemp4(data.education.school);
      if (data.name) setNametemp4(data.name);
    } else if (templateId === 5) {
      if (data.name) setNametemp5(data.name.toUpperCase());
      if (data.skills.length > 0) setskillsdetailtemp5(data.skills.slice(0, 5));
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        if (ex.role) setPost1temp5(ex.role);
        if (ex.company) setCompany1temp5(ex.company);
        if (ex.dateRange) setDate1temp5(ex.dateRange);
        if (ex.responsibilities.length > 0) setWorkdonetemp5(ex.responsibilities.slice(0, 5));
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        if (ex.role) setPost2temp5(ex.role);
        if (ex.company) setCompany2temp5(ex.company);
        if (ex.dateRange) setDate2temp5(ex.dateRange);
        if (ex.responsibilities.length > 0) setWorkdone2temp5(ex.responsibilities.slice(0, 5));
      }
      if (data.education.degree) setFacultytemp5(data.education.degree);
      if (data.education.school) setUniversitytemp5(data.education.school);
      if (data.education.date) setDatetemp5(data.education.date);
    } else if (templateId === 7) {
      if (data.name) setNametemp7(data.name);
      if (data.profession) setProfessiontemp7(data.profession);
      if (data.summary) setProfiletemp7(data.summary);
      if (data.skills.length > 0) setSkillstemp7(data.skills.slice(0, 5));
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        if (ex.role) setPost1temp7(ex.role);
        if (ex.company) setCompany1temp7(ex.dateRange ? `${ex.company} / ${ex.dateRange}` : ex.company);
        else if (ex.dateRange) setCompany1temp7(ex.dateRange);
        if (ex.responsibilities.length > 0) setWorkdesc1temp7(ex.responsibilities.join('<br>'));
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        if (ex.role) setPost2temp7(ex.role);
        if (ex.company) setCompany2temp7(ex.dateRange ? `${ex.company} / ${ex.dateRange}` : ex.company);
        else if (ex.dateRange) setCompany2temp7(ex.dateRange);
        if (ex.responsibilities.length > 0) setWorkdesc2temp7(ex.responsibilities.join('<br>'));
      }
      if (data.experiences.length > 2) {
        const ex = data.experiences[2];
        if (ex.role) setPost3temp7(ex.role);
        if (ex.company) setCompany3temp7(ex.dateRange ? `${ex.company} / ${ex.dateRange}` : ex.company);
        else if (ex.dateRange) setCompany3temp7(ex.dateRange);
        if (ex.responsibilities.length > 0) setWorkdesc3temp7(ex.responsibilities.join('<br>'));
      }
      if (data.education?.degree) setFacultytemp7(data.education.degree);
      if (data.education?.school) setUniversitytemp7(data.education.school);
      if (data.education?.date) setDatetemp7(data.education.date);
    } else if (templateId === 1) {
      if (data.profession) setProfession(data.profession);
      if (data.summary) setBrief(data.summary);
      if (data.skills.length > 0) {
        const padded = [...data.skills];
        while (padded.length < 5) padded.push('');
        setSkills(padded.slice(0, 5));
      }
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        if (ex.role) setTitle1(ex.role);
        if (ex.company) setCompany1(ex.company);
        if (ex.responsibilities.length > 0) setResponsibilities1(ex.responsibilities.slice(0, 3));
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        if (ex.role) setTitle2(ex.role);
        if (ex.company) setCompany2(ex.company);
        if (ex.responsibilities.length > 0) setResponsibilities2(ex.responsibilities.slice(0, 3));
      }
      if (data.education.degree) setDegree1(data.education.degree);
      if (data.education.school) setSchool(data.education.school);
      if (data.education.date) setDate1(data.education.date);
      if (data.name) setName(data.name);
    } else if (templateId === 13) {
      if (data.name) setNametemp13(data.name);
      if (data.profession) setProfessiontemp13(data.profession);
      if (data.summary) setSummarytemp13(data.summary);
      if (data.skills.length > 0) { const s = [...data.skills]; while (s.length < 5) s.push(''); setSkillstemp13(s.slice(0, 5)); }
      if (data.experiences.length > 0) { const ex = data.experiences[0]; if (ex.role) setPost1temp13(ex.role); if (ex.company) setCompany1temp13(ex.company); if (ex.responsibilities.length > 0) setWorkdone1temp13(ex.responsibilities.slice(0, 3)); }
      if (data.education.degree) setFacultytemp13(data.education.degree);
      if (data.education.school) setUniversitytemp13(data.education.school);
      if (data.education.date) setDatetemp13(data.education.date);
    } else if (templateId === 14) {
      if (data.name) setNametemp14(data.name);
      if (data.profession) setProfessiontemp14(data.profession);
      if (data.skills.length > 0) setSkillstemp14(data.skills.slice(0, 4));
      if (data.experiences.length > 0) { const ex = data.experiences[0]; if (ex.role) setPost1temp14(ex.role); if (ex.company) setCompany1temp14(ex.company); if (ex.responsibilities.length > 0) setWorkdone1temp14(ex.responsibilities.slice(0, 2)); }
      if (data.education.degree) setFacultytemp14(data.education.degree);
      if (data.education.school) setUniversitytemp14(data.education.school);
    } else if (templateId === 9) {
      if (data.name) setNametemp9(data.name);
      if (data.summary) setProfiletemp9(data.summary);
      if (data.contact?.address) setAddresstemp9(data.contact.address);
      if (data.contact?.phone) setPhonetemp9(data.contact.phone);
      if (data.contact?.email) setEmailtemp9(data.contact.email);
      if (data.skills.length > 0) { const s = [...data.skills]; while (s.length < 6) s.push(''); setSkillstemp9(s.slice(0, 6)); }
      if (data.education?.degree) setFacultytemp9(data.education.degree);
      if (data.education?.school) setUniversitytemp9(data.education.school);
      if (data.education?.date) setDatetemp9(data.education.date);
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        if (ex.role) setPost1temp9(ex.role);
        if (ex.company) setCompany1temp9(ex.dateRange ? `${ex.company} / ${ex.dateRange}` : ex.company);
        else if (ex.dateRange) setCompany1temp9(ex.dateRange);
        if (ex.responsibilities.length > 0) { setWorkdesc1temp9(ex.responsibilities[0]); setWorkdone1temp9(ex.responsibilities.slice(1, 4)); }
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        if (ex.role) setPost2temp9(ex.role);
        if (ex.company) setCompany2temp9(ex.dateRange ? `${ex.company} / ${ex.dateRange}` : ex.company);
        else if (ex.dateRange) setCompany2temp9(ex.dateRange);
        if (ex.responsibilities.length > 0) { setWorkdesc2temp9(ex.responsibilities[0]); setWorkdone2temp9(ex.responsibilities.slice(1, 3)); }
      }
    } else if (templateId === 15) {
      if (data.name) setNametemp15(data.name);
      if (data.summary) setResearchfocustemp15(data.summary);
      if (data.education.degree) setEducationtemp15([data.education.degree, data.education.school || '', data.education.date || '']);
      if (data.experiences.length > 0) setTeachingtemp15([data.experiences[0].role || '', data.experiences[0].company || '', data.experiences[0].date || '']);
    }
  };

  useEffect(() => {
    if (!templateId) return;
    if (PREMIUM_TEMPLATE_IDS.includes(templateId) && !isPremium) {
      navigate("/payment", { state: { message: "Premium content cannot be used unless you complete payment. Please pay first to use this template." } });
    }
  }, [templateId, isPremium, navigate]);

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

    // Enhanced download function - PDF uses programmatic jsPDF (editable text), PNG uses html2canvas
    const handleDownload = async (format = 'pdf', useEditableFilename = false) => {
      if (!cvRef.current && (format === 'png' || (format === 'pdf' && templateId === 9))) {
        alert('CV content not found. Please try again.');
        return;
      }

      const useVisualPdf = format === 'pdf' && templateId === 9;
      // PDF: Template 9 always uses html2canvas (pixel-perfect match); other templates use programmatic jsPDF
      if (format === 'pdf' && !useVisualPdf) {
        setIsDownloading(true);
        setDownloadProgress(30);
        image7DataUrlRef.current = null;
        try {
          if (templateId === 7) {
            let imgData = image7DataUrlRef?.current || selectedImage7;
            if (imgData?.startsWith?.('blob:')) {
              const blob = await fetch(imgData).then((r) => r.blob());
              imgData = await new Promise((resolve) => {
                const r = new FileReader();
                r.onload = () => resolve(r.result);
                r.readAsDataURL(blob);
              });
            }
            if (imgData?.startsWith?.('data:')) {
              image7DataUrlRef.current = await imageToCircularDataUrl(imgData, 144);
            }
          }
          setDownloadProgress(50);
          handleDownloadTextPdf(useEditableFilename);
          setDownloadProgress(100);
        } catch (err) {
          console.error('PDF download error:', err);
          alert('Failed to download PDF. Please try again.');
        } finally {
          image7DataUrlRef.current = null;
          setTimeout(() => {
            setIsDownloading(false);
            setDownloadProgress(0);
          }, 800);
        }
        return;
      }

      // PNG or Template 9 visual PDF: use html2canvas for pixel-perfect capture
      setIsDownloading(true);
      setDownloadProgress(10);

      let contentEditableBackups = new Map();
      let template7RightBackup = null;
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

        // Fix contenteditable (RichTextBlock) BEFORE capture - apply to real DOM so clone inherits
        contentEditableBackups.clear();
        element.querySelectorAll('[contenteditable="true"]').forEach((el) => {
          contentEditableBackups.set(el, {
            width: el.style.width,
            minWidth: el.style.minWidth,
            maxWidth: el.style.maxWidth,
            flex: el.style.flex,
          });
          const parent = el.parentElement;
          let w = 380;
          if (parent) {
            const parentWidth = parent.offsetWidth || parent.clientWidth;
            if (parentWidth > 80) {
              const siblings = Array.from(parent.children).filter((c) => c !== el);
              const gap = parseFloat(getComputedStyle(parent).gap) || 8;
              const used = siblings.reduce((a, s) => a + (s.offsetWidth || s.clientWidth || 0), 0) + gap * Math.max(0, siblings.length);
              w = Math.max(180, parentWidth - used - 24);
            }
          }
          el.style.width = w + 'px';
          el.style.minWidth = w + 'px';
          el.style.maxWidth = w + 'px';
          el.style.flex = 'none';
        });
        void element.offsetHeight;
        await new Promise(resolve => setTimeout(resolve, 50));

        // Template 7: html2canvas collapses flex-1 right column - set explicit width
        if (templateId === 7) {
          const rightCol = element.querySelector('[data-template7-main]');
          if (rightCol) {
            const parentW = element.offsetWidth || element.clientWidth || 896;
            const leftW = 256;
            const rightW = Math.max(400, parentW - leftW - 16);
            template7RightBackup = { width: rightCol.style.width, minWidth: rightCol.style.minWidth, flex: rightCol.style.flex };
            rightCol.style.width = rightW + 'px';
            rightCol.style.minWidth = rightW + 'px';
            rightCol.style.flex = 'none';
            void element.offsetHeight;
            await new Promise(resolve => setTimeout(resolve, 30));
          }
        }

        let template9GridDims = null;
        if (templateId === 9) {
          const grid9 = element.querySelector('[data-template9-grid]');
          if (grid9) {
            const parentW = grid9.offsetWidth || grid9.parentElement?.offsetWidth || 768;
            template9GridDims = {
              leftW: Math.max(160, Math.floor(parentW * 0.38)),
              rightW: Math.max(400, parentW - Math.max(160, Math.floor(parentW * 0.38)) - 1),
              totalW: parentW,
            };
            const cols = grid9.children;
            if (cols[0]) { cols[0].style.minWidth = template9GridDims.leftW + 'px'; cols[0].style.width = template9GridDims.leftW + 'px'; }
            if (cols[2]) { cols[2].style.minWidth = template9GridDims.rightW + 'px'; cols[2].style.flex = '1'; }
            void element.offsetHeight;
            await new Promise(resolve => setTimeout(resolve, 30));
          }
        }

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
            // html2canvas cannot capture input/textarea values - replace with divs for proper text rendering
            const replaceWithDiv = (el, text) => {
              const div = clonedDoc.createElement('div');
              div.textContent = text || '';
              div.className = el.className;
              div.style.cssText = el.style.cssText || '';
              div.style.display = 'block';
              div.style.width = '100%';
              div.style.minWidth = '0';
              div.style.overflow = 'visible';
              div.style.wordWrap = 'break-word';
              div.style.overflowWrap = 'break-word';
              div.style.whiteSpace = 'pre-wrap';
              div.style.wordBreak = 'break-word';
              div.style.boxSizing = 'border-box';
              div.style.border = 'none';
              div.style.background = 'transparent';
              div.style.outline = 'none';
              el.parentNode.replaceChild(div, el);
            };

            clonedElement.querySelectorAll('input').forEach((input) => {
              // Skip file inputs - input.value shows fake path (C:\fakepath\...) which we don't want in PDF
              if (input.type === 'file') {
                const empty = clonedDoc.createElement('div');
                empty.style.cssText = 'display:none;height:0;overflow:hidden;';
                input.parentNode.replaceChild(empty, input);
                return;
              }
              // Hide number inputs (e.g. skill levels) - progress bar shows the value visually
              if (input.type === 'number') {
                const empty = clonedDoc.createElement('div');
                empty.style.cssText = 'width:0;min-width:0;overflow:hidden;flex-shrink:0;';
                input.parentNode.replaceChild(empty, input);
                return;
              }
              replaceWithDiv(input, input.value);
            });
            clonedElement.querySelectorAll('textarea').forEach((textarea) => {
              replaceWithDiv(textarea, textarea.value);
            });

            // Fix contenteditable (RichTextBlock) - html2canvas collapses flex-1 min-w-0 to zero width
            clonedElement.querySelectorAll('[contenteditable="true"]').forEach((el) => {
              el.removeAttribute('contenteditable');
              // Template 9 profile: force wide width so PDF matches editor (avoids narrow column)
              if (templateId === 9 && el.hasAttribute('data-template9-profile')) {
                const profileW = 850;
                el.style.width = profileW + 'px';
                el.style.minWidth = profileW + 'px';
                el.style.maxWidth = profileW + 'px';
                el.style.marginLeft = 'auto';
                el.style.marginRight = 'auto';
              } else {
                const parent = el.parentElement;
                let w = 350;
                if (parent) {
                  const parentWidth = parent.offsetWidth || parent.clientWidth;
                  if (parentWidth > 50) {
                    const siblings = Array.from(parent.children).filter((c) => c !== el);
                    const gap = parseFloat(getComputedStyle(parent).gap) || 8;
                    const used = siblings.reduce((a, s) => a + (s.offsetWidth || s.clientWidth || 0), 0) + gap * Math.max(0, siblings.length);
                    w = Math.max(150, parentWidth - used - 24);
                  }
                }
                el.style.width = w + 'px';
                el.style.minWidth = w + 'px';
                el.style.maxWidth = w + 'px';
                el.style.flex = 'none';
              }
              el.style.wordBreak = 'break-word';
              el.style.overflowWrap = 'break-word';
            });

            // Ensure all content visible and wraps properly
            clonedElement.style.overflow = 'visible';
            clonedElement.style.height = 'auto';
            clonedElement.style.maxHeight = 'none';
            clonedElement.querySelectorAll('*').forEach((child) => {
              child.style.overflow = 'visible';
              child.style.wordWrap = 'break-word';
              child.style.overflowWrap = 'break-word';
            });

            clonedElement.querySelectorAll('img').forEach((img) => {
              img.style.visibility = 'visible';
              img.style.opacity = '1';
            });

            // Template 7: force grid layout in clone (html2canvas may not inherit grid)
            if (templateId === 7) {
              const mainCol = clonedElement.querySelector('[data-template7-main]');
              const gridRoot = mainCol?.parentElement;
              if (gridRoot && mainCol) {
                gridRoot.style.display = 'grid';
                gridRoot.style.gridTemplateColumns = '256px minmax(400px, 1fr)';
                gridRoot.style.width = '100%';
                mainCol.style.width = '100%';
                mainCol.style.minWidth = '400px';
                const leftCol = gridRoot.children[0];
                if (leftCol) {
                  leftCol.style.width = '256px';
                  leftCol.style.minWidth = '256px';
                }
              }
            }

            // Template 9: force grid layout in clone for reliable PDF capture
            if (templateId === 9 && template9GridDims) {
              const grid9 = clonedElement.querySelector('[data-template9-grid]');
              if (grid9) {
                const { leftW, rightW, totalW } = template9GridDims;
                grid9.style.display = 'grid';
                grid9.style.gridTemplateColumns = `${leftW}px 1px ${rightW}px`;
                grid9.style.width = totalW + 'px';
                grid9.style.minWidth = totalW + 'px';
                const cols = grid9.children;
                if (cols[0]) { cols[0].style.width = leftW + 'px'; cols[0].style.minWidth = leftW + 'px'; }
                if (cols[2]) { cols[2].style.width = rightW + 'px'; cols[2].style.minWidth = rightW + 'px'; }
              }
            }
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
          
          // Calculate image dimensions maintaining aspect ratio
          const totalHeight = (canvas.height * imgWidth) / canvas.width;
          const pageCount = Math.ceil(totalHeight / pageHeight) || 1;

          // Add each page showing the correct portion of the image (no repetition)
          for (let page = 0; page < pageCount; page++) {
            if (page > 0) pdf.addPage();
            // Use negative y to "scroll" the image - each page shows the next vertical slice
            const yOffset = -page * pageHeight;
            pdf.addImage(imgData, 'PNG', 0, yOffset, imgWidth, totalHeight, undefined, 'FAST');
          }

          setDownloadProgress(95);

          // Generate filename with timestamp
          const timestamp = new Date().toISOString().split('T')[0];
          const filename = useEditableFilename ? `CV_Editable_${timestamp}.pdf` : `CV_Template_${templateId}_${timestamp}.pdf`;
          
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
      } finally {
        contentEditableBackups.forEach((backup, el) => {
          if (el.isConnected) {
            el.style.width = backup.width || '';
            el.style.minWidth = backup.minWidth || '';
            el.style.maxWidth = backup.maxWidth || '';
            el.style.flex = backup.flex || '';
          }
        });
        if (template7RightBackup) {
          const rightCol = cvRef.current?.querySelector('[data-template7-main]');
          if (rightCol) {
            rightCol.style.width = template7RightBackup.width || '';
            rightCol.style.minWidth = template7RightBackup.minWidth || '';
            rightCol.style.flex = template7RightBackup.flex || '';
          }
        }
      }
    };

  //state for the editable field template 1

  const [contact, setContact] = useState("Contact Info");
  const [addressLabel, setAddressLabel] = useState("Address");
  const [phoneLabel, setPhoneLabel] = useState("Phone");
  const [emailLabel, setEmailLabel] = useState("E-mail");
  const [skillsLabel, setSkillsLabel] = useState("Skills");

  const [name, setName] = useState("YOUR NAME");
  const [profession, setProfession] = useState("Freelance Software Developer");
  const [address, setAddress] = useState("Your Address");
  const [phone, setPhone] = useState("(555) 555-0123");
  const [email, setEmail] = useState("your.email@example.com");
  const [website, setWebsite] = useState("www.yourwebsite.com");
  const [skills, setSkills] = useState([
    "Creativity",
    "Communication",
    "Typography",
    "Adobe Creative Apps",
    "Interactive Media",
  ]);
  const [selectedImage1, setSelectedImage1] = useState(null);
  const handleImageChange1 = (e) => {
    const file = e.target.files[0];
    if (file && ["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
      setSelectedImage1(URL.createObjectURL(file));
    }
  };

  const [work, setWork] = useState("Work History");

  const [brief, setBrief] = useState(
    "Dedicated software professional with expertise in building scalable applications. Passionate about clean code and user experience."
  );
  const [title1, setTitle1] = useState("Job Title 1");
  const [company1, setCompany1] = useState("Company Name");
  const [responsibilities1, setResponsibilities1] = useState([
    "Key responsibility or achievement.",
    "Another responsibility or achievement.",
    "Third responsibility or achievement.",
  ]);
  const [title2, setTitle2] = useState("Job Title 2");
  const [company2, setCompany2] = useState("Company Name");
  const [responsibilities2, setResponsibilities2] = useState([
    "Key responsibility or achievement.",
    "Another responsibility or achievement.",
  ]);
  const [education, setEducation] = useState("Education");
  const [date1, setDate1] = useState("2018-2022");
  const [degree1, setDegree1] = useState("B.S. Computer Science");
  const [school, setSchool] = useState("University Name");
  const [edu2date, setEdu2date] = useState("2014-2018");
  const [degree2, setDegree2] = useState("High School Diploma");
  const [college, setCollege] = useState("School Name");
  const [ref1, setRef1] = useState("Reference Name 1");
  const [ref2, setRef2] = useState("Reference Name 2");
  const [interests, setInterests] = useState(["Movies", "Coding", "Music", "Fitness", "Writing", "Karaoke"]);
  const handleInterestsChange = (i, v) => { const x = [...interests]; x[i] = v; setInterests(x); };
  const [languages, setLanguages] = useState(["English", "French", "German"]);
  const handleLanguagesChange = (i, v) => { const x = [...languages]; x[i] = v; setLanguages(x); };

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

  const [nametemp2, setNametemp2] = useState("JOHN DOE");
  const [titletemp2, setTitletemp2] = useState("ATTORNEY");
  const [addresstemp2, setAddresstemp2] = useState("4567 Main Street, Brooklyn, NY 48127");
  const [phonetemp2, setPhonetemp2] = useState("718.555.0100");
  const [emailtemp2, setEmailtemp2] = useState("john@mybestsite.com");
  const [websitetemp2, setWebsitetemp2] = useState("www.interestingsite.com");

  const [skillstemp2, setSkillstemp2] = useState([
    "Data analytics",
    "Records search",
    "Legal writing",
    "Excellent communication",
    "Organized",
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

  const [educationtemp2, setEducationtemp2] = useState("JURIS DOCTOR • JUNE 20XX");
  const [universitytemp2, setUniversitytemp2] = useState("Jasper University, Manhattan, NYC, New York");
  const [educationdetailtemp2, setEducationdetailtemp2] = useState("Real Estate Clinic, 1st place in Moot Court.");
  const [edu2temp2, setEdu2temp2] = useState("BA IN POLITICAL SCIENCE • JUNE 20XX");
  const [university2temp2, setUniversity2temp2] = useState("Mount Flores College, Small Town, Massachusetts");

  const [intereststemp2, setIntereststemp2] = useState(["Literature", "Environmental conservation", "Art", "Yoga", "Skiing", "Travel"]);
  const handleIntereststemp2Change = (i, v) => { const x = [...intereststemp2]; x[i] = v; setIntereststemp2(x); };

  const [profileinfotemp2, setProfileinfoTemp2] = useState(
    "Detail-oriented and dynamic attorney with experience in business and real estate law. Recognized for analytical abilities and commitment to client success."
  );

  const [post1temp2, setPost1temp2] = useState("IN-HOUSE COUNSEL • MARCH 20XX—PRESENT");
  const [company1temp2, setCompany1temp2] = useState("Bandter Real Estate • NYC, New York");
  const [workdone1temp2, setWorkdone1temp2] = useState([
    "Drafting commercial leases and negotiating contracts.",
    "Overseeing due diligence for real estate transactions.",
  ]);
  const handleWorkdone1Change = (index, value) => {
    const newworkdone1 = [...workdone1temp2];
    newworkdone1[index] = value;
    setWorkdone1temp2(newworkdone1);
  };

  const [post2temp2, setPost2temp2] = useState("ASSOCIATE ATTORNEY • FEB 20XX—NOV 20XX");
  const [company2temp2, setCompany2temp2] = useState("Luca Udinesi Law firm • NYC, New York");
  const [workdone2temp2, setWorkdone2temp2] = useState([
    "Representing parties in small business and real estate matters.",
    "Won $25,000 receivership case.",
  ]);

  const handleWorkdone2Change = (index, value) => {
    const newworkdone2 = [...workdone2temp2];
    newworkdone2[index] = value;
    setWorkdone2temp2(newworkdone2);
  };

  const [post3temp2, setPost3temp2] = useState("JUNIOR ASSOCIATE ATTORNEY • SEPT 20XX—JAN 20XX");
  const [company3temp2, setCompany3temp2] = useState("Law Offices of Keita Aoki • NYC, New York");
  const [workdone3temp2, setWorkdone3temp2] = useState([
    "Researching legal issues and assisting in multi-million-dollar litigation.",
  ]);
  const handleWorkdone3temp2Change = (index, value) => {
    const w = [...workdone3temp2];
    w[index] = value;
    setWorkdone3temp2(w);
  };

  //end of states for the template 2

  //states for the template 3 (Linda Brown / Creative Design layout)
  const [nametemp3, setNametemp3] = useState("Linda Brown");
  const [professiontemp3, setProfessiontemp3] = useState("Copywriter");
  const [profilePhotoTemp3, setProfilePhotoTemp3] = useState(""); // URL or base64 for profile image
  const handleImageChange3 = (e) => {
    const file = e.target.files[0];
    if (file && ["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
      setProfilePhotoTemp3(URL.createObjectURL(file));
    }
  };
  const [phone1temp3, setPhone1temp3] = useState("(555) 555-0100");
  const [phone2temp3, setPhone2temp3] = useState("(311) 555-2368");
  const [addresstemp3, setAddresstemp3] = useState("2701 Willow Oaks Lane, Lake Charles, LA");
  const [skillstemp3, setSkillstemp3] = useState("Communication, Teamwork, Responsibility, Creativity, Problem-solving, Leadership, Adaptive");
  const [socialHandleTemp3, setSocialHandleTemp3] = useState("@lindabrown");
  const [websitetemp3, setWebsitetemp3] = useState("www.lindabrown.site.com");
  const [emailtemp3, setEmailtemp3] = useState("l.brown@email.site.com");
  const [abouttemp3, setAbouttemp3] = useState("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\nUt enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.");
  const [awardstemp3, setAwardstemp3] = useState(["Award 01 placeholder", "Award 02 placeholder", "Award 03 placeholder", "Award 04 placeholder"]);
  const handleAwardstemp3Change = (i, v) => { const x = [...awardstemp3]; x[i] = v; setAwardstemp3(x); };
  const [posttemp3, setPosttemp3] = useState("Project Manager (2017 - Present)");
  const [workdonetemp3, setWorkdonetemp3] = useState("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.");
  const [post2temp3, setPost2temp3] = useState("Editor (2014 - 2017)");
  const [workdone2temp3, setWorkdone2temp3] = useState("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.");
  const [edu1temp3, setEdu1temp3] = useState("Bachelor of Literature (2009 - 2014)");
  const [edu1desctemp3, setEdu1desctemp3] = useState("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.");
  const [edu2temp3, setEdu2temp3] = useState("High School Diploma (2006 - 2009)");
  const [edu2desctemp3, setEdu2desctemp3] = useState("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.");
  const [edu3temp3, setEdu3temp3] = useState("Junior School Diploma (2003 - 2006)");
  const [edu3desctemp3, setEdu3desctemp3] = useState("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.");

  //end of template 3

  //state for the template 4
  //state for the template 4 (Oracle DBA / Corporate Standard layout)
  const [nametemp4, setNametemp4] = useState("RAVINDRA RACHIN");
  const [profession4, setProfessiontemp4] = useState("Oracle applications DBA");
  const [addresstemp4, setAddresstemp4] = useState("Chennai, India");
  const [phonetemp4, setPhonetemp4] = useState("+91-9876543210");
  const [emailtemp4, setEmailtemp4] = useState("ravindra@gmail.com");
  const [linkedintemp4, setLinkedintemp4] = useState("linkedin.com/in/ravindra");
  const [skillstemp4, setSkillstemp4] = useState([
    { name: "Oracle Database Administration", level: 95 },
    { name: "Backup and Recovery", level: 90 },
    { name: "Performance Tuning", level: 88 },
    { name: "Oracle E-Business Suite", level: 85 },
    { name: "SQL & PL/SQL", level: 92 },
  ]);
  const handleskillstemp4Change = (index, field, value) => {
    const arr = [...skillstemp4];
    arr[index] = { ...arr[index], [field]: field === 'level' ? parseInt(value) || 0 : value };
    setSkillstemp4(arr);
  };
  const [languagesTemp4, setLanguagesTemp4] = useState([
    { name: "Hindi", level: 100 },
    { name: "English", level: 90 },
    { name: "Tamil", level: 85 },
  ]);
  const handleLanguageTemp4Change = (index, field, value) => {
    const arr = [...languagesTemp4];
    arr[index] = { ...arr[index], [field]: field === 'level' ? parseInt(value) || 0 : value };
    setLanguagesTemp4(arr);
  };
  const [summarytemp4, setSummarytemp4] = useState("Dedicated Oracle Applications Database Administrator with extensive experience in managing, optimizing, and securing Oracle databases. Proven track record in performance tuning, backup strategies, and ensuring high availability of critical systems.");
  const [posttemp4, setPosttemp4] = useState("Oracle Database Administrator | Apr 2021 - Present");
  const [companytemp4, setCompanytemp4] = useState("UNO Corporations, Chennai");
  const [workdonetemp4, setWorkdonetemp4] = useState([
    "Managed and maintained Oracle 19c databases for enterprise applications.",
    "Implemented backup and recovery strategies ensuring 99.9% uptime.",
    "Performed performance tuning and optimization of complex queries.",
  ]);
  const handleworkdoneChange = (index, value) => {
    const arr = [...workdonetemp4];
    arr[index] = value;
    setWorkdonetemp4(arr);
  };
  const [post2temp4, setPost2temp4] = useState("Junior Oracle Applications DBA | Jun 2019 - Mar 2021");
  const [company2temp4, setCompany2temp4] = useState("Jarvis Industries, Chennai");
  const [workdone2temp4, setWorkdone2temp4] = useState([
    "Assisted in database administration and monitoring tasks.",
    "Participated in migration projects from Oracle 11g to 19c.",
    "Maintained documentation and change management records.",
  ]);
  const handleworkdone2Change = (index, value) => {
    const arr = [...workdone2temp4];
    arr[index] = value;
    setWorkdone2temp4(arr);
  };
  const [facultytemp4, setFacultytemp4] = useState("B.Tech in Computer Science | 2019");
  const [collegetemp4, setCollegetemp4] = useState("Indian Institute Of Technology Madras");
  const [certstemp4, setCertstemp4] = useState([
    "Oracle Database Administrator Certified Associate (OCA)",
    "Oracle E-Business Suite R12 Certification",
  ]);
  const handleCertTemp4Change = (i, v) => { const arr = [...certstemp4]; arr[i] = v; setCertstemp4(arr); };

  //end of the states of the temp4

  //states for the temp5
  //states for the temp5
  //states for the temp5
  //states for the temp5
  //states for the temp5
  //states for the temp5
  //states for the temp5
  //states for the temp5

  const [nametemp5, setNametemp5] = useState("CLARE SCHUSTER");
  const [addresstemp5, setAddresstemp5] = useState("18719 Jim Mission, Los Angeles, CA");
  const [phonetemp5, setPhonetemp5] = useState("p: +1 (555) 474 6254");
  const [experiencetemp5, setExperiencetemp5] = useState("EXPERIENCE");
  const [post1temp5, setPost1temp5] = useState("Oracle Application Developer");
  const [company1temp5, setCompany1temp5] = useState("HAMMES LLC");
  const [company1locationtemp5, setCompany1locationtemp5] = useState("San Francisco, CA");
  const [date1temp5, setDate1temp5] = useState("06/2018 – present");
  const [workdone1temp5, setWorkdonetemp5] = useState([
    "Led development of Oracle-based enterprise applications.",
    "Collaborated with cross-functional teams on integration projects.",
    "Improved system performance and reduced deployment time.",
  ]);
  const handleworkdonetemp5Change = (index, value) => {
    const newworkdone1temp5 = [...workdone1temp5];
    newworkdone1temp5[index] = value;
    setWorkdonetemp5(newworkdone1temp5);
  };

  const [post2temp5, setPost2temp5] = useState("Oracle Apex Developer");
  const [company2temp5, setCompany2temp5] = useState("GUTMANN, MOSCISKI AND JOHNSTON");
  const [company2locationtemp5, setCompany2locationtemp5] = useState("San Francisco, CA");
  const [date2temp5, setDate2temp5] = useState("11/2014 – 04/2018");
  const [workdone2temp5, setWorkdone2temp5] = useState([
    "Developed and maintained Oracle Apex applications.",
    "Provided technical support and training to end users.",
    "Participated in requirements gathering and system design.",
  ]);
  const handleworkdone2temp5Change = (index, value) => {
    const newworkdone2temp5 = [...workdone2temp5];
    newworkdone2temp5[index] = value;
    setWorkdone2temp5(newworkdone2temp5);
  };
  const [educationtemp5, setEducationtemp5] = useState("EDUCATION");
  const [facultytemp5, setFacultytemp5] = useState("Bachelor's in Computer Science");
  const [universitytemp5, setUniversitytemp5] = useState("UNIVERSITY OF CINCINNATI");
  const [datetemp5, setDatetemp5] = useState("");

  const [skillstemp5, setSkillstemp5] = useState("SKILLS");
  const [skillsdetailtemp5, setskillsdetailtemp5] = useState([
    "ORM technologies like Hibernate",
    "Experience with Kubernetes and Dockers",
    "Working with APIs/Integrations",
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

  const [nametemp6, setNametemp6] = useState("JOSHUA NELSON");
  const [professiontemp6, setProfessiontemp6] = useState("Product Owner | Digital Transformation | Agile Leadership");
  const [phonetemp6, setPhonetemp6] = useState("+1 (555) 123 4567");
  const [emailtemp6, setEmailtemp6] = useState("joshua.nelson@email.com");
  const [locationtemp6, setLocationtemp6] = useState("San Francisco, CA");
  const [linkedintemp6, setLinkedintemp6] = useState("linkedin.com/in/joshuanelson");
  const [summarylabeltemp6, setSummarylabeltemp6] = useState("SUMMARY");
  const [profileinfotemp6, setProfileinfotemp6] = useState(
    "Results-driven Product Owner with 8+ years leading digital transformation initiatives. Expert in Agile methodologies and cross-functional team leadership."
  );
  const [experiencetemp6, setExpriencetemp6] = useState("EXPERIENCE");
  const [post1temp6, setPost1temp6] = useState("Senior Product Owner");
  const [company1temp6, setComapny1temp6] = useState("IBM");
  const [company1locationtemp6, setCompany1locationtemp6] = useState("San Francisco, CA");
  const [date1temp6, setDate1temp6] = useState("01/2019 – Present");
  const [workdone1temp6, setWorkdone1temp6] = useState([
    "Led product roadmap for enterprise SaaS platform serving 50K+ users.",
    "Drove Agile adoption across 5 cross-functional teams.",
    "Reduced release cycle time by 40% through process optimization.",
  ]);
  const handleworkdone1temp6Change = (index, value) => {
    const newworkdone1temp6 = [...workdone1temp6];
    newworkdone1temp6[index] = value;
    setWorkdone1temp6(newworkdone1temp6);
  };
  const [post2temp6, setPost2temp6] = useState("Product Owner");
  const [company2temp6, setCompany2temp6] = useState("TechCorp");
  const [company2locationtemp6, setCompany2locationtemp6] = useState("San Francisco, CA");
  const [date2temp6, setDate2temp6] = useState("06/2015 – 12/2018");
  const [workdone2temp6, setWorkdone2temp6] = useState([
    "Managed backlog for customer-facing mobile applications.",
    "Collaborated with stakeholders to define product vision.",
    "Delivered 3 major releases on schedule.",
  ]);
  const handleworkdone2temp6Change = (index, value) => {
    const newworkdone2temp6 = [...workdone2temp6];
    newworkdone2temp6[index] = value;
    setWorkdone2temp6(newworkdone2temp6);
  };
  const [educationlabeltemp6, setEducationlabeltemp6] = useState("EDUCATION");
  const [facultytemp6, setFacultytemp6] = useState("MBA, Business Administration");
  const [universitytemp6, setUniversitytemp6] = useState("Stanford University");
  const [datetemp6, setDatetemp6] = useState("2013 – 2015");
  const [faculty2temp6, setFaculty2temp6] = useState("Bachelor's in Computer Science");
  const [university2temp6, setUniversity2temp6] = useState("University of California, Berkeley");
  const [date2temp6Edu, setDate2temp6Edu] = useState("2009 – 2013");
  const [achievementslabeltemp6, setAchievementslabeltemp6] = useState("ACHIEVEMENTS");
  const [achievementstemp6, setAchievementstemp6] = useState([
    { title: "Agile Champion", desc: "Certified Scrum Product Owner with 5+ years leading Agile teams." },
    { title: "Digital Leader", desc: "Spearheaded digital transformation across 3 business units." },
    { title: "Customer Focus", desc: "Improved NPS score by 25% through user-centric product design." },
  ]);
  const handleAchievementtemp6Change = (index, field, value) => {
    const arr = [...achievementstemp6];
    arr[index] = { ...arr[index], [field]: value };
    setAchievementstemp6(arr);
  };
  const [skillslabeltemp6, setSkillslabeltemp6] = useState("SKILLS");
  const [skillstemp6, setSkillstemp6] = useState(["Agile", "Scrum", "Product Roadmapping", "Stakeholder Management", "Jira", "User Research"]);
  const handleSkillstemp6Change = (index, value) => {
    const arr = [...skillstemp6];
    arr[index] = value;
    setSkillstemp6(arr);
  };
  const [courseslabeltemp6, setCourseslabeltemp6] = useState("COURSES");
  const [coursestemp6, setCoursestemp6] = useState([
    { title: "Advanced Agile Practices", desc: "Certification in scaled Agile frameworks." },
    { title: "Product Strategy", desc: "Executive program on product-led growth." },
  ]);
  const handleCoursestemp6Change = (index, field, value) => {
    const arr = [...coursestemp6];
    arr[index] = { ...arr[index], [field]: value };
    setCoursestemp6(arr);
  };
  const [passionslabeltemp6, setPassionslabeltemp6] = useState("PASSIONS");
  const [passionstemp6, setPassionstemp6] = useState([
    { title: "Innovation", desc: "Exploring emerging tech and design thinking." },
    { title: "Mentorship", desc: "Coaching junior product managers." },
  ]);
  const handlePassionstemp6Change = (index, field, value) => {
    const arr = [...passionstemp6];
    arr[index] = { ...arr[index], [field]: value };
    setPassionstemp6(arr);
  };


  

  //end of the state 6

  //state for the template 7
  //state for the template 7
  //state for the template 7
  //state for the template 7
  //state for the template 7
  //state for the template 7
  //state for the template 7

  const [nametemp7, setNametemp7] = useState("Jasper Smith");
  const [professiontemp7, setProfessiontemp7] = useState("Digital Marketing");
  const [phonetemp7, setPhonetemp7] = useState("+00 123 4567890");
  const [emailtemp7, setEmailtemp7] = useState("example@mail.com");
  const [websitetemp7, setWebsitetemp7] = useState("www.example.com");
  const [locationtemp7, setLocationtemp7] = useState("City, Country");
  const [contactlabeltemp7, setContactlabeltemp7] = useState("CONTACT");
  const [skillslabeltemp7, setSkillslabeltemp7] = useState("SKILLS");
  const [skillstemp7, setSkillstemp7] = useState(["Problem solving skills", "Verbal communication", "Customer service"]);
  const handleSkillstemp7Change = (index, value) => {
    const arr = [...skillstemp7];
    arr[index] = value;
    setSkillstemp7(arr);
  };
  const [educationlabeltemp7, setEducationlabeltemp7] = useState("EDUCATION");
  const [facultytemp7, setFacultytemp7] = useState("B.A. Marketing");
  const [universitytemp7, setUniversitytemp7] = useState("University name");
  const [datetemp7, setDatetemp7] = useState("2013 - 2017");
  const [profilelabeltemp7, setProfilelabeltemp7] = useState("PROFILE");
  const [profiletemp7, setProfiletemp7] = useState("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.");
  const [worklabeltemp7, setWorklabeltemp7] = useState("WORK EXPERIENCE");
  const [post1temp7, setPost1temp7] = useState("Online Media Marketing");
  const [company1temp7, setCompany1temp7] = useState("Company Name / 2020 - Present");
  const [workdesc1temp7, setWorkdesc1temp7] = useState("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.");
  const [post2temp7, setPost2temp7] = useState("Social Media Marketing");
  const [company2temp7, setCompany2temp7] = useState("Company Name / 2018 - 2020");
  const [workdesc2temp7, setWorkdesc2temp7] = useState("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.");
  const [post3temp7, setPost3temp7] = useState("Internship");
  const [company3temp7, setCompany3temp7] = useState("Company Name / 2016 - 2017");
  const [workdesc3temp7, setWorkdesc3temp7] = useState("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.");

  //end of the temp7

  //start of the state for the temp8
  //start of the state for the temp8
  //start of the state for the temp8
  //start of the state for the temp8
  //start of the state for the temp8
  //start of the state for the temp8

  const [nametemp8, setNametemp8] = useState("Claudia Smith");
  const [professiontemp8, setProfessiontemp8] = useState("Registered Nurse");
  const [phonetemp8, setPhonetemp8] = useState("+ 00 123 123 123");
  const [emailtemp8, setEmailtemp8] = useState("claudiasmith@mail.com");
  const [locationtemp8, setLocationtemp8] = useState("Los Angeles, CA");
  const [aboutlabeltemp8, setAboutlabeltemp8] = useState("ABOUT ME");
  const [abouttemp8, setAbouttemp8] = useState(
    "My name is Claudia Smith and I am a Registered Nurse with over 8 years of experience. A constellation consists of visible stars that form a perceived outline or pattern, usually representing an animal, a person or mythological creature, or an inanimate object."
  );
  const [educationlabeltemp8, setEducationlabeltemp8] = useState("EDUCATION");
  const [edu1temp8, setEdu1temp8] = useState({ degree: "NURSING DEGREE", school: "University of California", date: "2010 - 2014", desc: "Completed comprehensive nursing program with clinical rotations." });
  const [edu2temp8, setEdu2temp8] = useState({ degree: "GERIATRIC MASTER", school: "Study Center", date: "2014 - 2015", desc: "Specialized training in geriatric care." });
  const [edu3temp8, setEdu3temp8] = useState({ degree: "MIDWIFE COURSE", school: "Study center", date: "2010 - 2014", desc: "Certified midwifery training program." });
  const handleEdu8Change = (idx, field, value) => {
    const setters = [setEdu1temp8, setEdu2temp8, setEdu3temp8];
    const arr = [edu1temp8, edu2temp8, edu3temp8];
    const updated = { ...arr[idx], [field]: value };
    setters[idx](updated);
  };
  const [worklabeltemp8, setWorklabeltemp8] = useState("WORK EXPERIENCE");
  const [post1temp8, setPost1temp8] = useState("CLINIC NAME");
  const [date1temp8, setDate1temp8] = useState("2014 - 2017");
  const [workdesc1temp8, setWorkdesc1temp8] = useState("Provided comprehensive patient care and managed daily operations in a busy clinic setting.");
  const [post2temp8, setPost2temp8] = useState("LOCAL HOSPITAL NAME");
  const [date2temp8, setDate2temp8] = useState("2012 - 2014");
  const [workdesc2temp8, setWorkdesc2temp8] = useState("Supported nursing staff and assisted with patient care across multiple departments.");
  const handleworkdone1temp8Chnage = (index, value) => { /* kept for compatibility if needed */ };
  const handleworkdone2temp8Change = (index, value) => { /* kept for compatibility */ };

  //end of the temp8 states

  //states for the temp 9 (Sophie Nélisse - minimalist elegant)
  const [nametemp9, setNametemp9] = useState("Sophie Nélisse");
  const [profilelabeltemp9, setProfilelabeltemp9] = useState("PROFESSIONAL PROFILE");
  const [profiletemp9, setProfiletemp9] = useState("Start off with a sentence about yourself that summarizes your professional background and career goals. Keep it concise and impactful.");
  const [contactlabeltemp9, setContactlabeltemp9] = useState("CONTACT");
  const [addresstemp9, setAddresstemp9] = useState("Your Address");
  const [phonetemp9, setPhonetemp9] = useState("+00 123 456 789");
  const [emailtemp9, setEmailtemp9] = useState("your.email@example.com");
  const [educationlabeltemp9, setEducationlabeltemp9] = useState("EDUCATION");
  const [facultytemp9, setFacultytemp9] = useState("Your Degree / Major");
  const [universitytemp9, setUniversitytemp9] = useState("University Of California");
  const [datetemp9, setDatetemp9] = useState("Location / Years");
  const [skillslabeltemp9, setSkillslabeltemp9] = useState("SKILLS");
  const [skillstemp9, setSkillstemp9] = useState([
    "Microsoft Word",
    "Microsoft Excel",
    "Adobe Photoshop",
    "Adobe Indesign",
    "Corel Draw",
    "MAC & PC System",
  ]);
  const handelskillstemp9 = (index, value) => {
    const arr = [...skillstemp9];
    arr[index] = value;
    setSkillstemp9(arr);
  };
  const [worklabeltemp9, setWorklabeltemp9] = useState("WORK EXPERIENCE");
  const [post1temp9, setPost1temp9] = useState("ENTER JOB POSITION HERE");
  const [company1temp9, setCompany1temp9] = useState("Company/Location/Years");
  const [workdesc1temp9, setWorkdesc1temp9] = useState("Brief summary of your role and key achievements.");
  const [wrokdone1temp9, setWorkdone1temp9] = useState([
    "Key responsibility or achievement.",
    "Another key point.",
    "Third bullet point.",
  ]);
  const handlewrokdone1temp9Change = (index, value) => {
    const arr = [...wrokdone1temp9];
    arr[index] = value;
    setWorkdone1temp9(arr);
  };
  const [post2temp9, setPost2temp9] = useState("JOB POSITION");
  const [company2temp9, setCompany2temp9] = useState("Company/Location/Years");
  const [workdesc2temp9, setWorkdesc2temp9] = useState("Brief summary of your role.");
  const [workdone2temp9, setWorkdone2temp9] = useState([
    "Key responsibility.",
    "Another achievement.",
  ]);
  const handlewrokdone2temp9Change = (index, value) => {
    const arr = [...workdone2temp9];
    arr[index] = value;
    setWorkdone2temp9(arr);
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
    newworkdone1temp10[index] = value;
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

  const hasAutoPopulatedRef = useRef(false);
  const summaryTemp11Ref = useRef(null);
  const aboutMeTemp10Ref = useRef(null);
  // Auto-expand about textarea (Template 10) - summaryinfotemp11 effect moved below its declaration
  useEffect(() => {
    const el = aboutMeTemp10Ref.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.max(el.scrollHeight, 80) + 'px';
    }
  }, [aboutmeinfotemp10]);

  // Helper: auto-resize textarea on input (for Template 2 & 3 stretchable fields)
  const resizeTextareaOnInput = (e, minH = 24) => {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, minH) + 'px';
  };

  // Auto-populate template fields from enhanced CV when available
  useEffect(() => {
    if (!enhancedResume || !templateId || hasAutoPopulatedRef.current) return;
    const data = parseEnhancedResumeToStructuredData(enhancedResume);
    if (!data) return;
    hasAutoPopulatedRef.current = true;

    if (templateId === 10) {
      if (data.profession) setProfessiontemp10(data.profession);
      if (data.summary) setAboutmeinfotemp10(data.summary);
      if (data.skills.length > 0) {
        const padded = [...data.skills];
        while (padded.length < 5) padded.push("");
        setSkillstemp10(padded.slice(0, 5));
      }
      if (data.experiences.length > 0) {
        const ex0 = data.experiences[0];
        if (ex0.role) setPost1temp10(ex0.role);
        if (ex0.company) setCompany1temp10(ex0.company);
        if (ex0.responsibilities.length > 0) setWorkdone1temp10(ex0.responsibilities.slice(0, 5));
      }
      if (data.experiences.length > 1) {
        const ex1 = data.experiences[1];
        if (ex1.role) setPost2temp10(ex1.role);
        if (ex1.company) setCompany2temp10(ex1.company);
        if (ex1.responsibilities.length > 0) setWorkdone2temp10(ex1.responsibilities.slice(0, 5));
      }
      if (data.education.degree) setFacultytemp10(data.education.degree);
      if (data.education.school) setUniversitytemp10(data.education.school);
      if (data.education.date) setDatetemp10(data.education.date);
      if (data.name) setNametemp10(data.name);
    } else if (templateId === 1) {
      if (data.profession) setProfession(data.profession);
      if (data.summary) setBrief(data.summary);
      if (data.skills.length > 0) {
        const padded = [...data.skills];
        while (padded.length < 5) padded.push("");
        setSkills(padded.slice(0, 5));
      }
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        if (ex.role) setTitle1(ex.role);
        if (ex.company) setCompany1(ex.company);
        if (ex.responsibilities.length > 0) setResponsibilities1(ex.responsibilities.slice(0, 3));
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        if (ex.role) setTitle2(ex.role);
        if (ex.company) setCompany2(ex.company);
        if (ex.responsibilities.length > 0) setResponsibilities2(ex.responsibilities.slice(0, 3));
      }
      if (data.education.degree) setDegree1(data.education.degree);
      if (data.education.school) setSchool(data.education.school);
      if (data.education.date) setDate1(data.education.date);
      if (data.name) setName(data.name);
    } else if (templateId === 2) {
      if (data.summary) setProfileinfoTemp2(data.summary);
      if (data.profession) setTitletemp2(data.profession.toUpperCase());
      if (data.skills.length > 0) setSkillstemp2(data.skills.slice(0, 5));
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        const datePart = ex.dateRange ? ` • ${ex.dateRange}` : '';
        if (ex.role) setPost1temp2(ex.role.toUpperCase() + datePart);
        if (ex.company) setCompany1temp2(ex.company);
        if (ex.responsibilities.length > 0) setWorkdone1temp2(ex.responsibilities.slice(0, 3));
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        const datePart = ex.dateRange ? ` • ${ex.dateRange}` : '';
        if (ex.role) setPost2temp2(ex.role.toUpperCase() + datePart);
        if (ex.company) setCompany2temp2(ex.company);
        if (ex.responsibilities.length > 0) setWorkdone2temp2(ex.responsibilities.slice(0, 3));
      }
      if (data.experiences.length > 2) {
        const ex = data.experiences[2];
        const datePart = ex.dateRange ? ` • ${ex.dateRange}` : '';
        if (ex.role) setPost3temp2(ex.role.toUpperCase() + datePart);
        if (ex.company) setCompany3temp2(ex.company);
        if (ex.responsibilities.length > 0) setWorkdone3temp2(ex.responsibilities.slice(0, 3));
      }
      if (data.education.degree) setEducationtemp2(data.education.date ? `${data.education.degree} • ${data.education.date}` : data.education.degree);
      if (data.education.school) setUniversitytemp2(data.education.school);
      if (data.name) setNametemp2(data.name.replace(/^Name:\s*/i, "").toUpperCase());
    } else if (templateId === 7) {
      if (data.name) setNametemp7(data.name);
      if (data.profession) setProfessiontemp7(data.profession);
      if (data.summary) setProfiletemp7(data.summary);
      if (data.skills.length > 0) setSkillstemp7(data.skills.slice(0, 5));
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        if (ex.role) setPost1temp7(ex.role);
        if (ex.company) setCompany1temp7(ex.dateRange ? `${ex.company} / ${ex.dateRange}` : ex.company);
        else if (ex.dateRange) setCompany1temp7(ex.dateRange);
        if (ex.responsibilities.length > 0) setWorkdesc1temp7(ex.responsibilities.join('<br>'));
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        if (ex.role) setPost2temp7(ex.role);
        if (ex.company) setCompany2temp7(ex.dateRange ? `${ex.company} / ${ex.dateRange}` : ex.company);
        else if (ex.dateRange) setCompany2temp7(ex.dateRange);
        if (ex.responsibilities.length > 0) setWorkdesc2temp7(ex.responsibilities.join('<br>'));
      }
      if (data.experiences.length > 2) {
        const ex = data.experiences[2];
        if (ex.role) setPost3temp7(ex.role);
        if (ex.company) setCompany3temp7(ex.dateRange ? `${ex.company} / ${ex.dateRange}` : ex.company);
        else if (ex.dateRange) setCompany3temp7(ex.dateRange);
        if (ex.responsibilities.length > 0) setWorkdesc3temp7(ex.responsibilities.join('<br>'));
      }
      if (data.education?.degree) setFacultytemp7(data.education.degree);
      if (data.education?.school) setUniversitytemp7(data.education.school);
      if (data.education?.date) setDatetemp7(data.education.date);
    } else if (templateId === 8) {
      if (data.name) setNametemp8(data.name.replace(/^Name:\s*/i, ""));
      if (data.profession) setProfessiontemp8(data.profession);
      if (data.summary) setAbouttemp8(data.summary);
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        if (ex.role || ex.company) setPost1temp8(ex.company ? `${ex.role || ''} - ${ex.company}`.trim() : (ex.role || ex.company));
        if (ex.dateRange) setDate1temp8(ex.dateRange);
        if (ex.responsibilities.length > 0) setWorkdesc1temp8(ex.responsibilities.join('<br>'));
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        if (ex.role || ex.company) setPost2temp8(ex.company ? `${ex.role || ''} - ${ex.company}`.trim() : (ex.role || ex.company));
        if (ex.dateRange) setDate2temp8(ex.dateRange);
        if (ex.responsibilities.length > 0) setWorkdesc2temp8(ex.responsibilities.join('<br>'));
      }
      if (data.education?.degree || data.education?.school || data.education?.date) {
        setEdu1temp8(prev => ({
          ...prev,
          degree: data.education.degree || prev.degree,
          school: data.education.school || prev.school,
          date: data.education.date || prev.date,
        }));
      }
    } else if (templateId === 9) {
      if (data.name) setNametemp9(data.name);
      if (data.summary) setProfiletemp9(data.summary);
      if (data.contact?.address) setAddresstemp9(data.contact.address);
      if (data.contact?.phone) setPhonetemp9(data.contact.phone);
      if (data.contact?.email) setEmailtemp9(data.contact.email);
      if (data.skills.length > 0) { const s = [...data.skills]; while (s.length < 6) s.push(''); setSkillstemp9(s.slice(0, 6)); }
      if (data.education?.degree) setFacultytemp9(data.education.degree);
      if (data.education?.school) setUniversitytemp9(data.education.school);
      if (data.education?.date) setDatetemp9(data.education.date);
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        if (ex.role) setPost1temp9(ex.role);
        if (ex.company) setCompany1temp9(ex.dateRange ? `${ex.company} / ${ex.dateRange}` : ex.company);
        else if (ex.dateRange) setCompany1temp9(ex.dateRange);
        if (ex.responsibilities.length > 0) { setWorkdesc1temp9(ex.responsibilities[0]); setWorkdone1temp9(ex.responsibilities.slice(1, 4)); }
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        if (ex.role) setPost2temp9(ex.role);
        if (ex.company) setCompany2temp9(ex.dateRange ? `${ex.company} / ${ex.dateRange}` : ex.company);
        else if (ex.dateRange) setCompany2temp9(ex.dateRange);
        if (ex.responsibilities.length > 0) { setWorkdesc2temp9(ex.responsibilities[0]); setWorkdone2temp9(ex.responsibilities.slice(1, 3)); }
      }
    } else if (templateId === 3) {
      if (data.profession) setProfessiontemp3(data.profession);
      if (data.skills.length > 0) setSkillstemp3(data.skills.join(', '));
      if (data.summary) setAbouttemp3(data.summary);
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        if (ex.role) setPosttemp3(ex.dateRange ? `${ex.role} (${ex.dateRange})` : ex.role);
        if (ex.responsibilities.length > 0) setWorkdonetemp3(ex.responsibilities.join(' '));
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        if (ex.role) setPost2temp3(ex.dateRange ? `${ex.role} (${ex.dateRange})` : ex.role);
        if (ex.responsibilities.length > 0) setWorkdone2temp3(ex.responsibilities.join(' '));
      }
      if (data.education.degree) setEdu1temp3(data.education.date ? `${data.education.degree} (${data.education.date})` : data.education.degree);
      if (data.education.school) setEdu1desctemp3(data.education.school);
      if (data.name) setNametemp3(data.name);
    } else if (templateId === 4) {
      if (data.profession) setProfessiontemp4(data.profession);
      if (data.summary) setSummarytemp4(data.summary);
      if (data.skills.length > 0) {
        setSkillstemp4(data.skills.slice(0, 5).map((name, i) => ({ name, level: 90 - i * 5 })));
      }
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        if (ex.role) setPosttemp4(ex.dateRange ? `${ex.role} | ${ex.dateRange}` : ex.role);
        if (ex.company) setCompanytemp4(ex.company);
        if (ex.responsibilities.length > 0) setWorkdonetemp4(ex.responsibilities.slice(0, 4));
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        if (ex.role) setPost2temp4(ex.dateRange ? `${ex.role} | ${ex.dateRange}` : ex.role);
        if (ex.company) setCompany2temp4(ex.company);
        if (ex.responsibilities.length > 0) setWorkdone2temp4(ex.responsibilities.slice(0, 4));
      }
      if (data.education.degree) setFacultytemp4(data.education.date ? `${data.education.degree} | ${data.education.date}` : data.education.degree);
      if (data.education.school) setCollegetemp4(data.education.school);
      if (data.name) setNametemp4(data.name);
    } else if (templateId === 5) {
      if (data.name) setNametemp5(data.name.toUpperCase());
      if (data.skills.length > 0) setskillsdetailtemp5(data.skills.slice(0, 5));
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        if (ex.role) setPost1temp5(ex.role);
        if (ex.company) setCompany1temp5(ex.company);
        if (ex.dateRange) setDate1temp5(ex.dateRange);
        if (ex.responsibilities.length > 0) setWorkdonetemp5(ex.responsibilities.slice(0, 5));
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        if (ex.role) setPost2temp5(ex.role);
        if (ex.company) setCompany2temp5(ex.company);
        if (ex.dateRange) setDate2temp5(ex.dateRange);
        if (ex.responsibilities.length > 0) setWorkdone2temp5(ex.responsibilities.slice(0, 5));
      }
      if (data.education.degree) setFacultytemp5(data.education.degree);
      if (data.education.school) setUniversitytemp5(data.education.school);
      if (data.education.date) setDatetemp5(data.education.date);
    } else if (templateId === 11) {
      if (data.profession) setProfessiontemp11(data.profession);
      if (data.summary) setSummaryinfotemp11(data.summary);
      if (data.skills.length > 0) setSkillstemp11(data.skills.slice(0, 4));
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        if (ex.role) setPost1temp11(ex.role);
        if (ex.company) setCompany1temp11(ex.company);
        if (ex.responsibilities.length > 0) setWorkdone1temp11(ex.responsibilities.slice(0, 3));
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        if (ex.role) setPost2temp11(ex.role);
        if (ex.company) setCompany2temp11(ex.company);
        if (ex.responsibilities.length > 0) setworkdone2temp11(ex.responsibilities.slice(0, 3));
      }
      if (data.education.degree) setFacultytemp11(data.education.degree);
      if (data.education.school) setUniversitytemp11(data.education.school);
      if (data.education.date) setDatetemp11(data.education.date);
      if (data.name) setNametemp11(data.name);
    } else if (templateId === 13) {
      if (data.name) setNametemp13(data.name);
      if (data.profession) setProfessiontemp13(data.profession);
      if (data.summary) setSummarytemp13(data.summary);
      if (data.skills.length > 0) { const s = [...data.skills]; while (s.length < 5) s.push(''); setSkillstemp13(s.slice(0, 5)); }
      if (data.experiences.length > 0) { const ex = data.experiences[0]; if (ex.role) setPost1temp13(ex.role); if (ex.company) setCompany1temp13(ex.company); if (ex.responsibilities.length > 0) setWorkdone1temp13(ex.responsibilities.slice(0, 3)); }
      if (data.education.degree) setFacultytemp13(data.education.degree);
      if (data.education.school) setUniversitytemp13(data.education.school);
      if (data.education.date) setDatetemp13(data.education.date);
    } else if (templateId === 14) {
      if (data.name) setNametemp14(data.name);
      if (data.profession) setProfessiontemp14(data.profession);
      if (data.skills.length > 0) setSkillstemp14(data.skills.slice(0, 4));
      if (data.experiences.length > 0) { const ex = data.experiences[0]; if (ex.role) setPost1temp14(ex.role); if (ex.company) setCompany1temp14(ex.company); if (ex.responsibilities.length > 0) setWorkdone1temp14(ex.responsibilities.slice(0, 2)); }
      if (data.education.degree) setFacultytemp14(data.education.degree);
      if (data.education.school) setUniversitytemp14(data.education.school);
    } else if (templateId === 15) {
      if (data.name) setNametemp15(data.name);
      if (data.summary) setResearchfocustemp15(data.summary);
      if (data.education.degree) setEducationtemp15([data.education.degree, data.education.school || '', data.education.date || '']);
      if (data.experiences.length > 0) setTeachingtemp15([data.experiences[0].role || '', data.experiences[0].company || '', data.experiences[0].date || '']);
    }
  }, [enhancedResume, templateId]);

  // Generate text-based PDF (editable, properly laid-out - no html2canvas)
  const handleDownloadTextPdf = (useEditableFilename = true) => {
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - margin * 2;
    const lineHeight = 6;
    let y = 20;

    // Only use Enhanced Reference when NO template is selected; otherwise use template edits
    const useReferenceContent = editableRefContent?.trim() && editableRefContent.length > 50 && (!templateId || templateId < 1 || templateId > 15);
    if (useReferenceContent) {
      const data = parseEnhancedResumeToStructuredData(editableRefContent);
      const addSection = (title, content) => {
        if (y > 265) {
          doc.addPage();
          y = 20;
        }
        if (title) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 64, 175);
          doc.text(title, margin, y);
          y += lineHeight + 2;
        }
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(31, 41, 55);
        const text = typeof content === 'string' ? content : (content || '').toString();
        const lines = doc.splitTextToSize(text, maxWidth);
        lines.forEach((line) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, margin, y);
          y += lineHeight;
        });
        y += 4;
      };
      if (data && (data.name || data.profession || data.summary || data.experiences?.length || data.skills?.length)) {
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(data.name || 'Your Name', margin, y);
        y += lineHeight;
        doc.setFontSize(12);
        doc.text(data.profession || 'Professional Title', margin, y);
        y += lineHeight * 2;
        if (data.summary) addSection('Professional Summary', data.summary);
        if (data.skills?.length) addSection('Skills', data.skills.filter(s => s && String(s).trim()).join(', '));
        if (data.experiences?.length) {
          const expText = data.experiences.map((ex) => {
            const parts = [ex.role && ex.company ? `${ex.role} at ${ex.company}` : ex.role || ex.company, ex.dateRange].filter(Boolean);
            const header = parts.join(' — ');
            const bullets = (ex.responsibilities || []).filter(Boolean).map((r) => `• ${r}`).join('\n');
            return [header, bullets].filter(Boolean).join('\n');
          }).join('\n\n');
          addSection('Experience', expText);
        }
        if (data.education?.degree || data.education?.school || data.education?.date) {
          const edu = [data.education.degree, data.education.school, data.education.date].filter(Boolean).join('\n');
          addSection('Education', edu);
        }
      } else {
        // Fallback: formatted raw text (condensed, trim excess whitespace)
        const condensed = editableRefContent.replace(/\n{3,}/g, '\n\n').trim();
        const lines = doc.splitTextToSize(condensed, maxWidth);
        lines.forEach((line) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, margin, y);
          y += lineHeight;
        });
      }
      const timestamp = new Date().toISOString().slice(0, 10);
      doc.save(useEditableFilename ? `CV_Editable_${timestamp}.pdf` : `CV_Template_${templateId}_${timestamp}.pdf`);
      return;
    }

    const addSection = (title, content) => {
      if (y > 265) {
        doc.addPage();
        y = 20;
      }
      if (title) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 64, 175);
        doc.text(title, margin, y);
        y += lineHeight + 2;
      }
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(31, 41, 55);
      const lines = doc.splitTextToSize(content || '', maxWidth);
      lines.forEach((line) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      });
      y += 4;
    };

    if (templateId === 10) {
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 64, 175);
      doc.text(nametemp10 || 'Your Name', margin, y);
      y += lineHeight;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(professiontemp10 || 'Professional Title', margin, y);
      y += lineHeight * 2;

      addSection(aboutmetemp10, aboutmeinfotemp10);
      const skillsText = skillstemp10.filter(s => s && String(s).trim()).join(', ');
      addSection(skillslabeltemp10, skillsText);
      addSection(experiencetemp10, [
        `${post1temp10} at ${company1temp10}`,
        ...(workdone1temp10.filter(Boolean).map((r) => `• ${r}`)),
        '',
        `${post2temp10} at ${company2temp10}`,
        ...(workdone2temp10.filter(Boolean).map((r) => `• ${r}`)),
      ].join('\n'));
      addSection(educationlabeltemp10, `${facultytemp10}\n${universitytemp10}\n${datetemp10}`);
    } else if (templateId === 1) {
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(name || 'Your Name', margin, y);
      y += lineHeight;
      doc.setFontSize(12);
      doc.text(profession || 'Professional Title', margin, y);
      y += lineHeight * 2;
      addSection('Summary', brief);
      addSection('Skills', skills.filter(s => s && String(s).trim()).join(', '));
      addSection('Experience', [
        `${title1} at ${company1}`,
        ...(responsibilities1.filter(Boolean).map((r) => `• ${r}`)),
        '',
        `${title2} at ${company2}`,
        ...(responsibilities2.filter(Boolean).map((r) => `• ${r}`)),
      ].join('\n'));
      addSection('Education', `${degree1}\n${school}\n${degree2}\n${college}`);
      addSection('References', `${ref1}\n${ref2}`);
      addSection('Interests', interests.filter(Boolean).join(', '));
      addSection('Languages', languages.filter(Boolean).join(', '));
    } else if (templateId === 2) {
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(nametemp2?.replace(/^Name:\s*/i, '') || 'Your Name', margin, y);
      y += lineHeight;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(titletemp2 || 'Professional Title', margin, y);
      y += lineHeight * 2;
      addSection('CONTACT', [addresstemp2, phonetemp2, emailtemp2, websitetemp2].filter(Boolean).join('\n'));
      addSection('EDUCATION', [
        [educationtemp2, universitytemp2, educationdetailtemp2].filter(Boolean).join('\n'),
        [edu2temp2, university2temp2].filter(Boolean).join('\n'),
      ].filter(Boolean).join('\n\n'));
      addSection('KEY SKILLS', skillstemp2.filter(s => s && String(s).trim()).join(', '));
      addSection('INTERESTS', intereststemp2.filter(Boolean).join(', '));
      addSection('SUMMARY', stripHtml(profileinfotemp2));
      addSection('WORK EXPERIENCE', [
        `${post1temp2}\n${company1temp2}`,
        ...(workdone1temp2.filter(Boolean)),
        '',
        `${post2temp2}\n${company2temp2}`,
        ...(workdone2temp2.filter(Boolean)),
        '',
        `${post3temp2}\n${company3temp2}`,
        ...(workdone3temp2.filter(Boolean)),
      ].join('\n'));
    } else if (templateId === 7) {
      // Template 7: two-column layout matching editor (black sidebar + light grey main)
      const leftColW = 52;
      const leftPad = 6;
      const leftTextW = leftColW - leftPad * 2;
      const rightStart = 56;
      const rightWidth = pageWidth - rightStart - margin;
      let yLeft = 22;
      let yRight = 22;

      const addLeftSection = (title, content) => {
        if (yLeft > 265) return;
        yLeft += 3;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(75, 85, 99);
        doc.roundedRect(leftPad, yLeft - 3.5, leftTextW, 6, 1, 1, 'F');
        doc.setTextColor(0, 0, 0);
        doc.text((title || '').toString(), leftColW / 2, yLeft + 1.5, { align: 'center', maxWidth: leftTextW - 4 });
        doc.setTextColor(255, 255, 255);
        yLeft += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(content || '', leftTextW - 2);
        lines.forEach((line) => {
          if (yLeft > 270) return;
          doc.text(line, leftPad + 2, yLeft);
          yLeft += lineHeight - 0.5;
        });
        yLeft += 6;
      };

      const addRightSection = (title, content) => {
        if (yRight > 265) {
          doc.addPage();
          yRight = 20;
        }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(17, 24, 39);
        doc.text(title || '', rightStart, yRight);
        yRight += lineHeight + 1;
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.8);
        doc.line(rightStart, yRight + 1, pageWidth - margin, yRight + 1);
        yRight += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(31, 41, 55);
        const lines = doc.splitTextToSize(content || '', rightWidth);
        lines.forEach((line) => {
          if (yRight > 270) {
            doc.addPage();
            yRight = 20;
          }
          doc.text(line, rightStart, yRight);
          yRight += lineHeight;
        });
        yRight += 8;
      };

      doc.setFillColor(0, 0, 0);
      doc.rect(0, 0, leftColW, 297, 'F');
      doc.setFillColor(229, 231, 235);
      doc.rect(leftColW, 0, pageWidth - leftColW, 297, 'F');

      const imgSrc = image7DataUrlRef?.current || selectedImage7;
      if (imgSrc && typeof imgSrc === 'string' && imgSrc.startsWith('data:')) {
        try {
          const fmt = imgSrc.includes('png') ? 'PNG' : 'JPEG';
          doc.addImage(imgSrc, fmt, leftPad + 4, yLeft, 36, 36, undefined, 'FAST');
        } catch (_) {}
        yLeft += 42;
      } else {
        yLeft += 5;
      }

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      const nameLines = doc.splitTextToSize((nametemp7 || 'Your Name').toUpperCase(), leftTextW);
      nameLines.forEach((line) => {
        doc.text(line, leftColW / 2, yLeft, { align: 'center', maxWidth: leftTextW });
        yLeft += lineHeight;
      });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const profLines = doc.splitTextToSize(professiontemp7 || '', leftTextW);
      profLines.forEach((line) => {
        doc.text(line, leftColW / 2, yLeft, { align: 'center', maxWidth: leftTextW });
        yLeft += lineHeight - 0.5;
      });
      yLeft += 10;

      doc.setTextColor(255, 255, 255);
      addLeftSection(contactlabeltemp7, [phonetemp7, emailtemp7, websitetemp7, locationtemp7].filter(Boolean).join('\n'));
      addLeftSection(skillslabeltemp7, skillstemp7.filter(s => s && String(s).trim()).map(s => '• ' + s).join('\n'));
      addLeftSection(educationlabeltemp7, `${facultytemp7}\n${universitytemp7}\n${datetemp7}`);

      addRightSection(profilelabeltemp7, stripHtml(profiletemp7));
      addRightSection(worklabeltemp7, [
        `${post1temp7}\n${company1temp7}\n${stripHtml(workdesc1temp7 || '')}`,
        '',
        `${post2temp7}\n${company2temp7}\n${stripHtml(workdesc2temp7 || '')}`,
        '',
        `${post3temp7}\n${company3temp7}\n${stripHtml(workdesc3temp7 || '')}`,
      ].join('\n'));
    } else if (templateId === 8) {
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(nametemp8?.replace(/^Name:\s*/i, '') || 'Your Name', margin, y);
      y += lineHeight;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(professiontemp8 || '', margin, y);
      y += lineHeight * 2;
      addSection(aboutlabeltemp8, stripHtml(abouttemp8));
      addSection(educationlabeltemp8, [
        `${edu1temp8.degree}\n${edu1temp8.school}\n${edu1temp8.date}\n${stripHtml(edu1temp8.desc || '')}`,
        `${edu2temp8.degree}\n${edu2temp8.school}\n${edu2temp8.date}\n${stripHtml(edu2temp8.desc || '')}`,
        `${edu3temp8.degree}\n${edu3temp8.school}\n${edu3temp8.date}\n${stripHtml(edu3temp8.desc || '')}`,
      ].join('\n\n'));
      addSection(worklabeltemp8, [
        `${post1temp8}\n${date1temp8}\n${stripHtml(workdesc1temp8 || '')}`,
        '',
        `${post2temp8}\n${date2temp8}\n${stripHtml(workdesc2temp8 || '')}`,
      ].join('\n'));
    } else if (templateId === 11) {
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(nametemp11 || 'Your Name', margin, y);
      y += lineHeight;
      doc.setFontSize(12);
      doc.text(professiontemp11 || 'Professional Title', margin, y);
      y += lineHeight * 2;
      addSection(summarytemp11, summaryinfotemp11);
      addSection(skilllabelstemp11, skillstemp11.filter(s => s && String(s).trim()).join(', '));
      addSection(experiencetemp11, [
        `${post1temp11} at ${company1temp11}`,
        ...(workdone1temp11.filter(Boolean).map((r) => `• ${r}`)),
        '',
        `${post2temp11} at ${company2temp11}`,
        ...(workdone2temp11.filter(Boolean).map((r) => `• ${r}`)),
      ].join('\n'));
      addSection(educationtemp11, `${facultytemp11}\n${universitytemp11}\n${datetemp11}`);
    } else if (templateId === 3) {
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(nametemp3 || 'Your Name', margin, y);
      y += lineHeight;
      doc.setFontSize(12);
      doc.text(professiontemp3 || 'Professional Title', margin, y);
      y += lineHeight * 2;
      addSection('Phone', `${phone1temp3}\n${phone2temp3}`);
      addSection('Address', addresstemp3);
      addSection('Skills', skillstemp3);
      addSection('Social Media', `${socialHandleTemp3}\n${websitetemp3}\n${emailtemp3}`);
      addSection('About', stripHtml(abouttemp3));
      addSection('Awards', awardstemp3.filter(Boolean).map((a, i) => `${String(i + 1).padStart(2, '0')} ${a}`).join('\n'));
      addSection('Work Experience', [
        posttemp3,
        stripHtml(workdonetemp3),
        '',
        post2temp3,
        stripHtml(workdone2temp3),
      ].join('\n\n'));
      addSection('Educational History', [
        `${edu1temp3}\n${edu1desctemp3}`,
        `${edu2temp3}\n${edu2desctemp3}`,
        `${edu3temp3}\n${edu3desctemp3}`,
      ].filter(Boolean).join('\n\n'));
    } else if (templateId === 4) {
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(nametemp4 || 'Your Name', margin, y);
      y += lineHeight;
      doc.setFontSize(12);
      doc.text(profession4 || 'Professional Title', margin, y);
      y += lineHeight * 2;
      addSection('Personal Info', [addresstemp4, phonetemp4, emailtemp4, linkedintemp4].filter(Boolean).join('\n'));
      addSection('Skills', skillstemp4.map(s => s?.name).filter(Boolean).join(', '));
      addSection('Languages', languagesTemp4.map(l => l?.name).filter(Boolean).join(', '));
      addSection('Summary', stripHtml(summarytemp4));
      addSection('Employment History', [
        `${posttemp4}\n${companytemp4}`,
        ...(workdonetemp4.filter(Boolean).map(stripHtml)),
        '',
        `${post2temp4}\n${company2temp4}`,
        ...(workdone2temp4.filter(Boolean).map(stripHtml)),
      ].join('\n'));
      addSection('Education', `${facultytemp4}\n${collegetemp4}`);
      addSection('Certifications', certstemp4.filter(Boolean).join('\n'));
    } else if (templateId === 5) {
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(nametemp5 || 'Your Name', margin, y);
      y += lineHeight;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(addresstemp5 || '', margin, y);
      y += lineHeight;
      doc.text(phonetemp5 || '', margin, y);
      y += lineHeight * 2;
      addSection(experiencetemp5, [
        `${company1temp5}\n${company1locationtemp5}\n${post1temp5}\n${date1temp5}`,
        ...(workdone1temp5.filter(Boolean).map((r) => `• ${stripHtml(r)}`)),
        '',
        `${company2temp5}\n${company2locationtemp5}\n${post2temp5}\n${date2temp5}`,
        ...(workdone2temp5.filter(Boolean).map((r) => `• ${stripHtml(r)}`)),
      ].join('\n'));
      addSection(educationtemp5, `${universitytemp5}\n${facultytemp5}${datetemp5 ? '\n' + datetemp5 : ''}`);
      addSection(skillstemp5, skillsdetailtemp5.filter(s => s && String(stripHtml(s)).trim()).map(stripHtml).join(', '));
    } else if (templateId === 6) {
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(nametemp6 || 'Your Name', margin, y);
      y += lineHeight;
      doc.setFontSize(12);
      doc.text(professiontemp6 || 'Professional Title', margin, y);
      y += lineHeight * 2;
      addSection(summarylabeltemp6, stripHtml(profileinfotemp6));
      addSection(experiencetemp6, [
        `${post1temp6} at ${company1temp6} | ${date1temp6}`,
        ...(workdone1temp6.filter(Boolean).map((r) => `• ${stripHtml(r)}`)),
        '',
        `${post2temp6} at ${company2temp6} | ${date2temp6}`,
        ...(workdone2temp6.filter(Boolean).map((r) => `• ${stripHtml(r)}`)),
      ].join('\n'));
      addSection(educationlabeltemp6, `${facultytemp6}\n${universitytemp6}\n${datetemp6}\n\n${faculty2temp6}\n${university2temp6}\n${date2temp6Edu}`);
      addSection(achievementslabeltemp6, achievementstemp6.map(a => `${a.title}: ${stripHtml(a.desc)}`).join('\n'));
      addSection(skillslabeltemp6, skillstemp6.filter(Boolean).join(', '));
      addSection(courseslabeltemp6, coursestemp6.map(c => `${c.title}: ${stripHtml(c.desc)}`).join('\n'));
      addSection(passionslabeltemp6, passionstemp6.map(p => `${p.title}: ${stripHtml(p.desc)}`).join('\n'));
    } else if (templateId === 9) {
      const tan9 = [227, 220, 210];
      const centerX = pageWidth / 2;
      const leftColW = pageWidth * 0.35;
      const leftTextW = leftColW - margin - 8;
      const dividerX = leftColW + 4;
      const rightStart = dividerX + 12;
      const rightWidth = pageWidth - margin - rightStart;
      let yLeft = y;
      let yRight = y;

      const profileMaxW = 150;
      const addSection9Centered = (title, content) => {
        if (y > 265) { doc.addPage(); y = 20; }
        if (title) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text(title, centerX, y, { align: 'center' });
          y += lineHeight + 3;
        }
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 70, 85);
        const lines = doc.splitTextToSize(content || '', profileMaxW);
        lines.forEach((line) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(line, centerX, y, { align: 'center' });
          y += lineHeight;
        });
        y += 6;
      };

      const addLeftSection9 = (title, content) => {
        if (yLeft > 265) { doc.addPage(); yLeft = 20; yRight = 20; }
        if (title) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text(title, margin, yLeft);
          yLeft += lineHeight + 3;
        }
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 70, 85);
        const lines = doc.splitTextToSize(content || '', leftTextW);
        lines.forEach((line) => {
          if (yLeft > 270) return;
          doc.text(line, margin, yLeft);
          yLeft += lineHeight - 0.3;
        });
        yLeft += 8;
      };

      const addRightSection9WithTimeline = (title, entries) => {
        if (yRight > 265) { doc.addPage(); yRight = 20; yLeft = 20; }
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(title, rightStart, yRight);
        yRight += lineHeight + 4;
        doc.setDrawColor(...tan9);
        doc.setLineWidth(0.3);
        const timelineX = rightStart - 6;
        doc.line(timelineX, yRight, timelineX, 280);
        entries.forEach((entry) => {
          if (yRight > 270) return;
          doc.setFontSize(10);
          doc.setTextColor(...tan9);
          doc.text('\u2022', timelineX - 1, yRight + 2);
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text(entry.title || '', rightStart, yRight + 2);
          yRight += lineHeight;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(55, 65, 81);
          const lines = doc.splitTextToSize(entry.content || '', rightWidth);
          lines.forEach((line) => {
            if (yRight > 270) return;
            doc.text(line, rightStart, yRight);
            yRight += lineHeight - 0.5;
          });
          yRight += 6;
        });
      };

      doc.setDrawColor(...tan9);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageWidth - margin, y);
      y += lineHeight * 1.5;
      doc.setFontSize(28);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(0, 0, 0);
      doc.text(nametemp9 || 'Your Name', centerX, y, { align: 'center' });
      y += lineHeight * 1.5;
      doc.setDrawColor(...tan9);
      doc.line(margin, y, pageWidth - margin, y);
      y += lineHeight * 1.5;
      addSection9Centered(profilelabeltemp9, stripHtml(profiletemp9));
      doc.setDrawColor(...tan9);
      doc.line(margin, y, pageWidth - margin, y);
      y += lineHeight * 1.5;
      yLeft = y;
      yRight = y;

      doc.setFillColor(245, 243, 240);
      doc.rect(0, y - 2, leftColW + 2, 297 - y + 2, 'F');

      const contactLines = [];
      if (addresstemp9) contactLines.push(addresstemp9);
      if (phonetemp9) contactLines.push(phonetemp9);
      if (emailtemp9) contactLines.push(emailtemp9);
      addLeftSection9(contactlabeltemp9, contactLines.join('\n'));
      addLeftSection9(educationlabeltemp9, `${facultytemp9}\n${universitytemp9}\n${datetemp9}`);
      addLeftSection9(skillslabeltemp9, skillstemp9.filter(s => s && String(s).trim()).join('\n'));

      doc.setDrawColor(...tan9);
      doc.setLineWidth(0.3);
      doc.line(dividerX, y, dividerX, 280);

      const workEntries = [
        {
          title: post1temp9,
          content: [company1temp9, stripHtml(workdesc1temp9), ...(wrokdone1temp9.filter(Boolean).map((r) => '• ' + stripHtml(r)))].filter(Boolean).join('\n'),
        },
        {
          title: post2temp9,
          content: [company2temp9, stripHtml(workdesc2temp9), ...(workdone2temp9.filter(Boolean).map((r) => '• ' + stripHtml(r)))].filter(Boolean).join('\n'),
        },
      ];
      addRightSection9WithTimeline(worklabeltemp9, workEntries);
    } else if (templateId === 12) {
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(nametemp12 || 'Your Name', margin, y);
      y += lineHeight;
      doc.setFontSize(12);
      doc.text(professiontemp12 || 'Professional Title', margin, y);
      y += lineHeight * 2;
      addSection(profiletemp12, profileinfotemp12);
      addSection(experiencetemp12, [
        `${post1temp12} at ${company1temp12}`,
        ...(workdone1temp12.filter(Boolean).map((r) => `• ${r}`)),
        '',
        `${post2temp12} at ${company2temp12}`,
        ...(workdone2temp12.filter(Boolean).map((r) => `• ${r}`)),
      ].join('\n'));
      addSection(educationtemp12, `${facultytemp12}\n${universitytemp12}\n${datetemp12}`);
    } else if (templateId === 13) {
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(nametemp13 || 'Your Name', margin, y);
      y += lineHeight;
      doc.setFontSize(12);
      doc.text(professiontemp13 || 'Professional Title', margin, y);
      y += lineHeight * 2;
      addSection('Professional Summary', summarytemp13);
      addSection('Skills', skillstemp13.filter(s => s && String(s).trim()).join(', '));
      addSection('Experience', [`${post1temp13} at ${company1temp13}`, ...(workdone1temp13.filter(Boolean).map((r) => `• ${r}`))].join('\n'));
      addSection('Education', `${facultytemp13}\n${universitytemp13}\n${datetemp13}`);
    } else if (templateId === 14) {
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(nametemp14 || 'Your Name', margin, y);
      y += lineHeight;
      doc.setFontSize(12);
      doc.text(professiontemp14 || 'Professional Title', margin, y);
      y += lineHeight * 2;
      addSection('Contact', contacttemp14);
      addSection('Skills', skillstemp14.filter(s => s && String(s).trim()).join(', '));
      addSection('Experience', [`${post1temp14} at ${company1temp14}`, ...(workdone1temp14.filter(Boolean).map((r) => `• ${r}`))].join('\n'));
      addSection('Education', `${facultytemp14}\n${universitytemp14}`);
    } else if (templateId === 15) {
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(nametemp15 || 'Your Name', margin, y);
      y += lineHeight;
      doc.setFontSize(10);
      doc.text(subtitletemp15 || 'ACADEMIC CURRICULUM VITAE', margin, y);
      y += lineHeight;
      doc.text([phonetemp15, emailtemp15, webtemp15, addresstemp15].filter(Boolean).join(' | '), margin, y);
      y += lineHeight * 2;
      addSection('Education', educationtemp15.filter(Boolean).join('\n'));
      addSection('Research Focus', researchfocustemp15);
      addSection('Publications', publicationstemp15.filter(Boolean).map((p) => `• ${p}`).join('\n'));
      addSection('Awards & Grants', awardstemp15.filter(Boolean).map((a) => `• ${a}`).join('\n'));
      addSection('Selected Presentations', presentationstemp15.filter(Boolean).map((p) => `• ${p}`).join('\n'));
      addSection('Teaching Experience', teachingtemp15.filter(Boolean).join('\n'));
    } else {
      const fallback = enhancedResume || 'CV content - fill in the template and download.';
      addSection(null, fallback);
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    doc.save(useEditableFilename ? `CV_Editable_${timestamp}.pdf` : `CV_Template_${templateId}_${timestamp}.pdf`);
  };

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

  // Auto-expand summary textarea (Template 11) - must be after summaryinfotemp11 declaration
  useEffect(() => {
    const el = summaryTemp11Ref.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.max(el.scrollHeight, 80) + 'px';
    }
  }, [summaryinfotemp11]);

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
        const validImageTypes = ["image/jpeg", "image/png", "image/gif"];
        if (validImageTypes.includes(file.type)) {
          const reader = new FileReader();
          reader.onload = () => setSelectedImage7(reader.result);
          reader.readAsDataURL(file);
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

  // Template 13 - ATS-Optimized (simple single column)
  const [nametemp13, setNametemp13] = useState("Your Name");
  const [professiontemp13, setProfessiontemp13] = useState("Professional Title");
  const [summarytemp13, setSummarytemp13] = useState("Brief professional summary...");
  const [skillstemp13, setSkillstemp13] = useState(["Skill 1", "Skill 2", "Skill 3", "Skill 4", "Skill 5"]);
  const handleSkillstemp13Change = (i, v) => { const s = [...skillstemp13]; s[i] = v; setSkillstemp13(s); };
  const [post1temp13, setPost1temp13] = useState("Job Title");
  const [company1temp13, setCompany1temp13] = useState("Company Name");
  const [workdone1temp13, setWorkdone1temp13] = useState(["Achievement 1", "Achievement 2", "Achievement 3"]);
  const handleWorkdone1temp13Change = (i, v) => { const w = [...workdone1temp13]; w[i] = v; setWorkdone1temp13(w); };
  const [facultytemp13, setFacultytemp13] = useState("Degree");
  const [universitytemp13, setUniversitytemp13] = useState("University");
  const [datetemp13, setDatetemp13] = useState("Graduation Date");

  // Template 14 - Tech Developer (dark sidebar)
  const [nametemp14, setNametemp14] = useState("Your Name");
  const [professiontemp14, setProfessiontemp14] = useState("Software Developer");
  const [contacttemp14, setContacttemp14] = useState("Email | Phone | Location");
  const [skillstemp14, setSkillstemp14] = useState(["JavaScript", "React", "Node.js", "Python"]);
  const handleSkillstemp14Change = (i, v) => { const s = [...skillstemp14]; s[i] = v; setSkillstemp14(s); };
  const [post1temp14, setPost1temp14] = useState("Senior Developer");
  const [company1temp14, setCompany1temp14] = useState("Tech Corp");
  const [workdone1temp14, setWorkdone1temp14] = useState(["Built scalable systems", "Led team initiatives"]);
  const handleWorkdone1temp14Change = (i, v) => { const w = [...workdone1temp14]; w[i] = v; setWorkdone1temp14(w); };
  const [facultytemp14, setFacultytemp14] = useState("B.S. Computer Science");
  const [universitytemp14, setUniversitytemp14] = useState("University");

  // Template 15 - Academic Scholar (single-column centered, matches preview)
  const [nametemp15, setNametemp15] = useState("DR. ELEANOR S. VANCE");
  const [subtitletemp15, setSubtitletemp15] = useState("ACADEMIC CURRICULUM VITAE");
  const [phonetemp15, setPhonetemp15] = useState("Phone: (617) 555-0123");
  const [emailtemp15, setEmailtemp15] = useState("Email: e.vance@university.edu");
  const [webtemp15, setWebtemp15] = useState("Web: scholar.harvard.edu/evance");
  const [addresstemp15, setAddresstemp15] = useState("Address: 21 23, Scholar, Harvard, TX 30233");
  const [educationtemp15, setEducationtemp15] = useState([
    "Ph.D. in Medieval History (2018-2023), Harvard University.",
    "Dissertation: Hagiography & Power in 10th-Century Byzantium.",
    "M.Phil. in Classical Studies (2016-2018), University of Oxford.",
    "B.A. in History (2012-2016), Yale University (summa cum laude)."
  ]);
  const handleEducationtemp15Change = (i, v) => { const e = [...educationtemp15]; e[i] = v; setEducationtemp15(e); };
  const [researchfocustemp15, setResearchfocustemp15] = useState("Late Antiquity, Byzantine Literature, Manuscript Studies, Digital Humanities.");
  const [publicationstemp15, setPublicationstemp15] = useState([
    "Vance, E.S. The Sacred Text: Faith & Politics in Byzantium (Cambridge Univ. Press, 2024).",
    "\"Hagiographical Narratives...\", Speculum (2023).",
    "\"The Evolving Cult of St. Demetrios...\", Journal of Byzantine Studies (2021)."
  ]);
  const handlePublicationstemp15Change = (i, v) => { const p = [...publicationstemp15]; p[i] = v; setPublicationstemp15(p); };
  const [awardstemp15, setAwardstemp15] = useState(["Fulbright Scholar (2022).", "Getty Research Grant (2020)."]);
  const handleAwardstemp15Change = (i, v) => { const a = [...awardstemp15]; a[i] = v; setAwardstemp15(a); };
  const [presentationstemp15, setPresentationstemp15] = useState([
    "\"Hagiography in Context\", International Medieval Congress, Leeds, 2022.",
    "\"Byzantine Manuscripts\", Dumbarton Oaks Symposium, 2021."
  ]);
  const handlePresentationstemp15Change = (i, v) => { const p = [...presentationstemp15]; p[i] = v; setPresentationstemp15(p); };
  const [teachingtemp15, setTeachingtemp15] = useState(["Teaching Assistant", "Harvard University", "2020-2022"]);

  //end of the states

  const renderTemplate = () => {
    switch (templateId) {
      case 1:
        const T1Bar = ({ children }) => <div className="bg-gray-600 px-3 py-1.5 text-white text-xs font-bold italic uppercase tracking-wider">{children}</div>;
        const T1BarWhite = ({ children }) => <div className="bg-white px-3 py-1.5 text-black text-xs font-bold italic uppercase tracking-wider">{children}</div>;
        return (
          <div className="w-full max-w-3xl mx-auto overflow-hidden font-sans bg-black" style={{ height: "1100px" }}>
            <div className="flex h-full">
              {/* Left Column - Black */}
              <div className="w-[35%] bg-black p-6 text-white">
                <div className="flex justify-center mb-6">
                  <div className="w-28 h-28 rounded border-2 border-gray-500 overflow-hidden cursor-pointer" onClick={() => document.getElementById("imgInput1").click()}>
                    <img src={selectedImage1 || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='112' height='112' viewBox='0 0 112 112'%3E%3Crect fill='%23374151' width='112' height='112'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='12'%3EPhoto%3C/text%3E%3C/svg%3E"} alt="Profile" className="w-full h-full object-cover" />
                  </div>
                  <input id="imgInput1" type="file" accept="image/*" onChange={handleImageChange1} className="hidden" />
                </div>
                <T1Bar>About Me</T1Bar>
                <textarea value={brief} onChange={(e) => setBrief(e.target.value)} className="w-full bg-transparent text-white text-xs mt-2 resize-none italic" rows={4} placeholder="Brief about yourself..." />
                <T1Bar className="mt-6">Skills</T1Bar>
                <ul className="mt-2 space-y-1">
                  {skills.map((s, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-white">-</span>
                      <input type="text" value={s} onChange={(e) => handleSkillChange(i, e.target.value)} className="bg-transparent flex-1 text-white placeholder-white/50" />
                    </li>
                  ))}
                </ul>
                <T1Bar className="mt-6">Contact</T1Bar>
                <div className="mt-2 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-white flex-shrink-0" style={{ minWidth: 16, minHeight: 16 }} />
                    <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-transparent flex-1 text-white" placeholder="+0 123 456 789" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-white flex-shrink-0" style={{ minWidth: 16, minHeight: 16 }} />
                    <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-transparent flex-1 text-white" placeholder="youremail@gmail.com" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-white flex-shrink-0" style={{ minWidth: 16, minHeight: 16 }} />
                    <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} className="bg-transparent flex-1 text-white" placeholder="www.yourwebsite.com" />
                  </div>
                </div>
              </div>

              {/* Right Column - Dark grey curved shape (smooth circle portion) */}
              <div className="w-[65%] relative overflow-hidden">
                <div className="absolute inset-0" style={{ backgroundColor: "#374151", clipPath: "circle(85% at 100% 50%)" }} />
                <div className="relative z-10 p-8">
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="text-3xl font-bold italic bg-transparent text-white uppercase tracking-wider w-full placeholder-white/70" placeholder="YOUR NAME" />
                  <input type="text" value={profession} onChange={(e) => setProfession(e.target.value)} className="text-base italic bg-transparent text-white/90 mt-1 w-full placeholder-white/70" placeholder="Freelance Software Developer" />
                  <div className="mt-8 space-y-6">
                    <div>
                      <T1BarWhite>Experience</T1BarWhite>
                      <div className="mt-2 text-white text-sm space-y-3">
                        <div>
                          <input type="text" value={title1} onChange={(e) => setTitle1(e.target.value)} className="font-semibold bg-transparent w-full text-white placeholder-white/70" placeholder="Job Title" />
                          <input type="text" value={company1} onChange={(e) => setCompany1(e.target.value)} className="bg-transparent w-full text-white/90 text-xs placeholder-white/60" placeholder="Company (Year-Year)" />
                          <ul className="list-disc pl-4 mt-1 space-y-0.5">
                            {responsibilities1.map((r, i) => (
                              <li key={i}><input type="text" value={r} onChange={(e) => handleResponsibilitiesChange1(i, e.target.value)} className="bg-transparent w-full text-white/90 text-xs" /></li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <input type="text" value={title2} onChange={(e) => setTitle2(e.target.value)} className="font-semibold bg-transparent w-full text-white placeholder-white/70" placeholder="Job Title 2" />
                          <input type="text" value={company2} onChange={(e) => setCompany2(e.target.value)} className="bg-transparent w-full text-white/90 text-xs placeholder-white/60" placeholder="Company (Year-Year)" />
                          <ul className="list-disc pl-4 mt-1 space-y-0.5">
                            {responsibilities2.map((r, i) => (
                              <li key={i}><input type="text" value={r} onChange={(e) => handleResponsibilitiesChange2(i, e.target.value)} className="bg-transparent w-full text-white/90 text-xs" /></li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div>
                      <T1BarWhite>Education</T1BarWhite>
                      <div className="mt-2 text-white text-sm space-y-2">
                        <input type="text" value={degree1} onChange={(e) => setDegree1(e.target.value)} className="font-semibold bg-transparent w-full text-white placeholder-white/70" placeholder="Degree (Year-Year)" />
                        <input type="text" value={school} onChange={(e) => setSchool(e.target.value)} className="bg-transparent w-full text-white/90 placeholder-white/60" placeholder="College/University" />
                        <input type="text" value={degree2} onChange={(e) => setDegree2(e.target.value)} className="font-semibold bg-transparent w-full text-white placeholder-white/70 mt-2" placeholder="Degree 2 (Year-Year)" />
                        <input type="text" value={college} onChange={(e) => setCollege(e.target.value)} className="bg-transparent w-full text-white/90 placeholder-white/60" placeholder="School" />
                      </div>
                    </div>
                    <div>
                      <T1BarWhite>References</T1BarWhite>
                      <div className="mt-2 text-white text-sm space-y-1">
                        <input type="text" value={ref1} onChange={(e) => setRef1(e.target.value)} className="font-semibold bg-transparent w-full text-white placeholder-white/70" placeholder="Reference 1" />
                        <input type="text" value={ref2} onChange={(e) => setRef2(e.target.value)} className="font-semibold bg-transparent w-full text-white placeholder-white/70" placeholder="Reference 2" />
                      </div>
                    </div>
                    <div>
                      <T1BarWhite>Interests</T1BarWhite>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {interests.map((x, i) => (
                          <input key={i} type="text" value={x} onChange={(e) => handleInterestsChange(i, e.target.value)} className="bg-transparent text-white text-xs placeholder-white/50" />
                        ))}
                      </div>
                    </div>
                    <div>
                      <T1BarWhite>Languages</T1BarWhite>
                      <ul className="mt-2 space-y-1">
                        {languages.map((l, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <span className="text-white">-</span>
                            <input type="text" value={l} onChange={(e) => handleLanguagesChange(i, e.target.value)} className="bg-transparent flex-1 text-white placeholder-white/50" />
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        const T2Gold = "text-amber-800";
        const T2Divider = <div className="w-px bg-amber-700/60 self-stretch" />;
        return (
          <div className="w-full max-w-3xl mx-auto bg-white overflow-hidden font-serif" style={{ height: "1100px" }}>
            {/* Sage green header */}
            <div className="px-8 py-6" style={{ backgroundColor: "#d4e4d4" }}>
              <input type="text" value={nametemp2} onChange={(e) => setNametemp2(e.target.value)} className="text-3xl font-bold bg-transparent w-full uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" style={{ color: "#2d5a3d" }} placeholder="JOHN DOE" />
              <input type="text" value={titletemp2} onChange={(e) => setTitletemp2(e.target.value)} className="text-sm font-medium bg-transparent w-full uppercase tracking-[0.2em] mt-1 focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" style={{ color: "#3d6b4d" }} placeholder="ATTORNEY" />
            </div>
            {/* Two columns with orange divider */}
            <div className="flex">
              <div className="w-1/3 p-6 space-y-6">
                <div>
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${T2Gold} mb-2`}>CONTACT</h3>
                  <input type="text" value={addresstemp2} onChange={(e) => setAddresstemp2(e.target.value)} className="text-sm bg-transparent w-full text-gray-800 mb-1 focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" />
                  <input type="text" value={phonetemp2} onChange={(e) => setPhonetemp2(e.target.value)} className="text-sm bg-transparent w-full text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" />
                  <input type="text" value={emailtemp2} onChange={(e) => setEmailtemp2(e.target.value)} className="text-sm bg-transparent w-full text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" />
                  <input type="text" value={websitetemp2} onChange={(e) => setWebsitetemp2(e.target.value)} className="text-sm bg-transparent w-full text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" />
                </div>
                <div>
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${T2Gold} mb-2`}>EDUCATION</h3>
                  <input type="text" value={educationtemp2} onChange={(e) => setEducationtemp2(e.target.value)} className="text-sm font-semibold bg-transparent w-full text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" />
                  <input type="text" value={universitytemp2} onChange={(e) => setUniversitytemp2(e.target.value)} className="text-sm italic bg-transparent w-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" />
                  <input type="text" value={educationdetailtemp2} onChange={(e) => setEducationdetailtemp2(e.target.value)} className="text-sm bg-transparent w-full text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" />
                  <input type="text" value={edu2temp2} onChange={(e) => setEdu2temp2(e.target.value)} className="text-sm font-semibold bg-transparent w-full text-gray-800 mt-2 focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" />
                  <input type="text" value={university2temp2} onChange={(e) => setUniversity2temp2(e.target.value)} className="text-sm italic bg-transparent w-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" />
                </div>
                <div>
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${T2Gold} mb-2`}>KEY SKILLS</h3>
                  <ul className="space-y-1">
                    {skillstemp2.map((s, i) => (
                      <li key={i}><input type="text" value={s} onChange={(e) => handleskillstemp2Change(i, e.target.value)} className="text-sm bg-transparent w-full text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" /></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${T2Gold} mb-2`}>INTERESTS</h3>
                  <ul className="space-y-1">
                    {intereststemp2.map((x, i) => (
                      <li key={i}><input type="text" value={x} onChange={(e) => handleIntereststemp2Change(i, e.target.value)} className="text-sm bg-transparent w-full text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" /></li>
                    ))}
                  </ul>
                </div>
              </div>
              {T2Divider}
              <div className="flex-1 p-6 space-y-6">
                <div>
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${T2Gold} mb-2`}>SUMMARY</h3>
                  <RichTextBlock value={profileinfotemp2} onChange={setProfileinfoTemp2} className="text-sm bg-transparent w-full text-gray-800 leading-relaxed focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded-md px-2 py-1.5" minHeight="80px" placeholder="Professional summary..." />
                </div>
                <div>
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${T2Gold} mb-3`}>WORK EXPERIENCE</h3>
                  <div className="space-y-4">
                    <div>
                      <input type="text" value={post1temp2} onChange={(e) => setPost1temp2(e.target.value)} className={`text-sm font-bold uppercase ${T2Gold} bg-transparent w-full focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1`} />
                      <input type="text" value={company1temp2} onChange={(e) => setCompany1temp2(e.target.value)} className="text-sm font-semibold bg-transparent w-full text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" />
                      <ul className="list-none pl-0 mt-1 space-y-1">
                        {workdone1temp2.map((w, i) => (
                          <li key={i}>
                            <textarea value={w} onChange={(e) => handleWorkdone1Change(i, e.target.value)} onInput={(e) => resizeTextareaOnInput(e, 24)} style={{ fieldSizing: 'content' }} className="text-sm bg-transparent w-full resize-none text-gray-700 min-h-[24px] focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1 transition-shadow" />
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <input type="text" value={post2temp2} onChange={(e) => setPost2temp2(e.target.value)} className={`text-sm font-bold uppercase ${T2Gold} bg-transparent w-full focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1`} />
                      <input type="text" value={company2temp2} onChange={(e) => setCompany2temp2(e.target.value)} className="text-sm font-semibold bg-transparent w-full text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" />
                      <ul className="list-none pl-0 mt-1 space-y-1">
                        {workdone2temp2.map((w, i) => (
                          <li key={i}>
                            <textarea value={w} onChange={(e) => handleWorkdone2Change(i, e.target.value)} onInput={(e) => resizeTextareaOnInput(e, 24)} style={{ fieldSizing: 'content' }} className="text-sm bg-transparent w-full resize-none text-gray-700 min-h-[24px] focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1 transition-shadow" />
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <input type="text" value={post3temp2} onChange={(e) => setPost3temp2(e.target.value)} className={`text-sm font-bold uppercase ${T2Gold} bg-transparent w-full focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1`} />
                      <input type="text" value={company3temp2} onChange={(e) => setCompany3temp2(e.target.value)} className="text-sm font-semibold bg-transparent w-full text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" />
                      <ul className="list-none pl-0 mt-1 space-y-1">
                        {workdone3temp2.map((w, i) => (
                          <li key={i}>
                            <textarea value={w} onChange={(e) => handleWorkdone3temp2Change(i, e.target.value)} onInput={(e) => resizeTextareaOnInput(e, 24)} style={{ fieldSizing: 'content' }} className="text-sm bg-transparent w-full resize-none text-gray-700 min-h-[24px] focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1 transition-shadow" />
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="w-full max-w-4xl mx-auto font-serif overflow-visible" style={{ minHeight: "1100px", backgroundColor: "#f5f5f0" }}>
            {/* Header: Profile pic + Name/Title */}
            <div className="flex p-6">
              <div className="flex-shrink-0">
                <label htmlFor="imgInput3" className="block w-24 h-24 rounded cursor-pointer overflow-hidden" style={{ backgroundColor: "#f5d742" }}>
                  {profilePhotoTemp3 ? (
                    <img src={profilePhotoTemp3} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">Photo</div>
                  )}
                </label>
                <input id="imgInput3" type="file" accept="image/*" onChange={handleImageChange3} className="hidden" />
              </div>
              <div className="flex-1 pl-6 flex flex-col justify-center">
                <input type="text" value={nametemp3} onChange={(e) => setNametemp3(e.target.value)} className="text-3xl font-bold bg-transparent w-full text-gray-900" placeholder="Linda Brown" />
                <input type="text" value={professiontemp3} onChange={(e) => setProfessiontemp3(e.target.value)} className="text-lg font-light bg-transparent w-full text-gray-800 mt-1" placeholder="Copywriter" />
              </div>
            </div>
            <div className="border-t-2 border-black mx-6" />
            {/* Contact & Skills Row */}
            <div className="grid grid-cols-3 gap-6 px-6 py-4 text-sm">
              <div>
                <p className="font-bold text-black mb-1">Phone</p>
                <input type="text" value={phone1temp3} onChange={(e) => setPhone1temp3(e.target.value)} className="bg-transparent w-full text-gray-800" />
                <input type="text" value={phone2temp3} onChange={(e) => setPhone2temp3(e.target.value)} className="bg-transparent w-full text-gray-800" />
              </div>
              <div>
                <p className="font-bold text-black mb-1">Address</p>
                <input type="text" value={addresstemp3} onChange={(e) => setAddresstemp3(e.target.value)} className="bg-transparent w-full text-gray-800" />
              </div>
              <div>
                <p className="font-bold text-black mb-1">Skills</p>
                <input type="text" value={skillstemp3} onChange={(e) => setSkillstemp3(e.target.value)} className="bg-transparent w-full text-gray-800" placeholder="Comma-separated skills" />
              </div>
            </div>
            <div className="border-t-2 border-black mx-6" />
            {/* Two columns */}
            <div className="flex">
              <div className="w-1/3 p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-black border-b border-black pb-2 mb-2">Social Media</h3>
                  <input type="text" value={socialHandleTemp3} onChange={(e) => setSocialHandleTemp3(e.target.value)} className="text-sm bg-transparent w-full text-gray-800 mb-1" />
                  <input type="text" value={websitetemp3} onChange={(e) => setWebsitetemp3(e.target.value)} className="text-sm bg-transparent w-full text-gray-800 mb-1" />
                  <input type="text" value={emailtemp3} onChange={(e) => setEmailtemp3(e.target.value)} className="text-sm bg-transparent w-full text-gray-800" />
                </div>
                <div className="border-t border-gray-400 pt-4">
                  <h3 className="text-sm font-bold text-black border-b border-black pb-2 mb-2">About</h3>
                  <RichTextBlock value={abouttemp3} onChange={setAbouttemp3} className="text-sm bg-transparent w-full text-gray-800 leading-relaxed" minHeight="60px" placeholder="About you..." />
                </div>
                <div className="border-t border-gray-400 pt-4">
                  <h3 className="text-sm font-bold text-black border-b border-black pb-2 mb-2">Awards</h3>
                  <div className="space-y-3">
                    {awardstemp3.map((a, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="text-2xl font-bold text-gray-900 flex-shrink-0" style={{ fontFamily: "Georgia, serif" }}>{String(i + 1).padStart(2, "0")}</span>
                        <input type="text" value={a} onChange={(e) => handleAwardstemp3Change(i, e.target.value)} className="text-sm bg-transparent flex-1 text-gray-800" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex-1 p-6 space-y-6 border-l border-gray-300">
                <div>
                  <h3 className="text-sm font-bold text-black border-b border-black pb-2 mb-3">Work Experience</h3>
                  <div className="space-y-4">
                    <div>
                      <input type="text" value={posttemp3} onChange={(e) => setPosttemp3(e.target.value)} className="text-sm font-bold bg-transparent w-full text-gray-900" placeholder="Project Manager (2017 - Present)" />
                      <RichTextBlock value={workdonetemp3} onChange={setWorkdonetemp3} className="text-sm bg-transparent w-full text-gray-800 mt-2 leading-relaxed" minHeight="40px" />
                    </div>
                    <div className="border-t border-gray-400 pt-4">
                      <input type="text" value={post2temp3} onChange={(e) => setPost2temp3(e.target.value)} className="text-sm font-bold bg-transparent w-full text-gray-900" placeholder="Editor (2014 - 2017)" />
                      <RichTextBlock value={workdone2temp3} onChange={setWorkdone2temp3} className="text-sm bg-transparent w-full text-gray-800 mt-2 leading-relaxed" minHeight="40px" />
                    </div>
                  </div>
                </div>
                <div className="border-t-2 border-black pt-4">
                  <h3 className="text-sm font-bold text-black border-b border-black pb-2 mb-3">Educational History</h3>
                  <div className="space-y-4">
                    <div>
                      <input type="text" value={edu1temp3} onChange={(e) => setEdu1temp3(e.target.value)} className="text-sm font-bold bg-transparent w-full text-gray-900" />
                      <textarea value={edu1desctemp3} onChange={(e) => setEdu1desctemp3(e.target.value)} onInput={(e) => resizeTextareaOnInput(e, 28)} style={{ fieldSizing: 'content' }} className="text-sm bg-transparent w-full text-gray-800 mt-1 resize-none min-h-[28px]" />
                    </div>
                    <div className="border-t border-gray-400 pt-4">
                      <input type="text" value={edu2temp3} onChange={(e) => setEdu2temp3(e.target.value)} className="text-sm font-bold bg-transparent w-full text-gray-900" />
                      <textarea value={edu2desctemp3} onChange={(e) => setEdu2desctemp3(e.target.value)} onInput={(e) => resizeTextareaOnInput(e, 28)} style={{ fieldSizing: 'content' }} className="text-sm bg-transparent w-full text-gray-800 mt-1 resize-none min-h-[28px]" />
                    </div>
                    <div className="border-t border-gray-400 pt-4">
                      <input type="text" value={edu3temp3} onChange={(e) => setEdu3temp3(e.target.value)} className="text-sm font-bold bg-transparent w-full text-gray-900" />
                      <textarea value={edu3desctemp3} onChange={(e) => setEdu3desctemp3(e.target.value)} onInput={(e) => resizeTextareaOnInput(e, 28)} style={{ fieldSizing: 'content' }} className="text-sm bg-transparent w-full text-gray-800 mt-1 resize-none min-h-[28px]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        const sidebarBg4 = "#333333";
        const accentBlue4 = "#2563eb";
        return (
          <div className="w-full max-w-4xl mx-auto overflow-visible font-sans antialiased" style={{ minHeight: "1100px" }}>
            {/* Header with diagonal shapes */}
            <div className="relative h-24 flex items-end pb-4">
              <div className="absolute inset-0 bg-gray-200" style={{ clipPath: "polygon(0 0, 30% 0, 15% 100%, 0 100%)" }} />
              <div className="absolute right-0 top-0 bottom-0 w-1/2" style={{ backgroundColor: accentBlue4, clipPath: "polygon(70% 0, 100% 0, 100% 100%, 85% 100%)" }} />
              <div className="relative z-10 w-full px-8 flex justify-center items-end">
                <div className="text-center">
                  <input type="text" value={nametemp4} onChange={(e) => setNametemp4(e.target.value)} className="text-2xl font-bold bg-transparent text-gray-900 uppercase text-center" placeholder="NAME" />
                  <input type="text" value={profession4} onChange={(e) => setProfessiontemp4(e.target.value)} className="text-base bg-transparent w-full text-gray-700 mt-0.5 text-center" placeholder="Job Title" />
                </div>
              </div>
            </div>
            <div className="flex">
              {/* Left Sidebar - Dark grey */}
              <div className="w-1/3 p-6 text-white" style={{ backgroundColor: sidebarBg4 }}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3">Personal Info</h3>
                <input type="text" value={addresstemp4} onChange={(e) => setAddresstemp4(e.target.value)} className="text-sm bg-transparent w-full mb-2 placeholder-white/60" placeholder="Address" />
                <input type="text" value={phonetemp4} onChange={(e) => setPhonetemp4(e.target.value)} className="text-sm bg-transparent w-full mb-2 placeholder-white/60" placeholder="Phone" />
                <input type="text" value={emailtemp4} onChange={(e) => setEmailtemp4(e.target.value)} className="text-sm bg-transparent w-full mb-2 placeholder-white/60" placeholder="Email" />
                <input type="text" value={linkedintemp4} onChange={(e) => setLinkedintemp4(e.target.value)} className="text-sm bg-transparent w-full underline placeholder-white/60" placeholder="LinkedIn" />
                <div className="mt-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3">Skills</h3>
                  <div className="space-y-2">
                    {skillstemp4.map((s, i) => (
                      <div key={i}>
                        <div className="flex gap-2 items-center mb-1">
                          <input type="text" value={s.name} onChange={(e) => handleskillstemp4Change(i, 'name', e.target.value)} className="text-sm bg-transparent flex-1 placeholder-white/60" />
                          <input type="number" min={0} max={100} value={s.level} onChange={(e) => handleskillstemp4Change(i, 'level', e.target.value)} className="w-12 text-xs bg-white/20 text-white rounded px-1" />
                        </div>
                        <div className="h-1 bg-white/30 rounded overflow-hidden">
                          <div className="h-full bg-white rounded" style={{ width: `${Math.min(100, Math.max(0, s.level))}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3">Languages</h3>
                  <div className="space-y-2">
                    {languagesTemp4.map((lang, i) => (
                      <div key={i}>
                        <div className="flex gap-2 items-center mb-1">
                          <input type="text" value={lang.name} onChange={(e) => handleLanguageTemp4Change(i, 'name', e.target.value)} className="text-sm bg-transparent flex-1 placeholder-white/60" />
                          <input type="number" min={0} max={100} value={lang.level} onChange={(e) => handleLanguageTemp4Change(i, 'level', e.target.value)} className="w-12 text-xs bg-white/20 text-white rounded px-1" />
                        </div>
                        <div className="h-1 bg-white/30 rounded overflow-hidden">
                          <div className="h-full bg-white rounded" style={{ width: `${Math.min(100, Math.max(0, lang.level))}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Right - White main content */}
              <div className="flex-1 p-8 bg-white">
                <RichTextBlock value={summarytemp4} onChange={setSummarytemp4} className="text-sm bg-transparent w-full text-gray-800 leading-relaxed mb-6 block" minHeight="50px" placeholder="Professional summary..." />
                <div className="border-b-2 mb-4" style={{ borderColor: accentBlue4 }}>
                  <h3 className="text-sm font-bold uppercase text-gray-900">Employment History</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <input type="text" value={posttemp4} onChange={(e) => setPosttemp4(e.target.value)} className="text-sm font-bold bg-transparent w-full text-gray-900" placeholder="Role | Date Range" />
                    <input type="text" value={companytemp4} onChange={(e) => setCompanytemp4(e.target.value)} className="text-sm font-semibold bg-transparent w-full text-gray-700 italic" placeholder="Company, Location" />
                    <ul className="list-none pl-0 mt-2 space-y-1">
                      {workdonetemp4.map((w, i) => (
                        <li key={i}>
                          <RichTextBlock value={w} onChange={(v) => handleworkdoneChange(i, v)} className="text-sm bg-transparent w-full text-gray-700" minHeight="24px" />
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    <input type="text" value={post2temp4} onChange={(e) => setPost2temp4(e.target.value)} className="text-sm font-bold bg-transparent w-full text-gray-900" placeholder="Role | Date Range" />
                    <input type="text" value={company2temp4} onChange={(e) => setCompany2temp4(e.target.value)} className="text-sm font-semibold bg-transparent w-full text-gray-700 italic" placeholder="Company, Location" />
                    <ul className="list-none pl-0 mt-2 space-y-1">
                      {workdone2temp4.map((w, i) => (
                        <li key={i}>
                          <RichTextBlock value={w} onChange={(v) => handleworkdone2Change(i, v)} className="text-sm bg-transparent w-full text-gray-700" minHeight="24px" />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="mt-8 border-b-2" style={{ borderColor: accentBlue4 }}>
                  <h3 className="text-sm font-bold uppercase text-gray-900">Education</h3>
                </div>
                <div className="mt-4">
                  <input type="text" value={facultytemp4} onChange={(e) => setFacultytemp4(e.target.value)} className="text-sm font-bold bg-transparent w-full text-gray-900" placeholder="Degree | Year" />
                  <input type="text" value={collegetemp4} onChange={(e) => setCollegetemp4(e.target.value)} className="text-sm bg-transparent w-full text-gray-700" placeholder="School" />
                </div>
                <div className="mt-8 border-b-2" style={{ borderColor: accentBlue4 }}>
                  <h3 className="text-sm font-bold uppercase text-gray-900">Certifications</h3>
                </div>
                <ul className="list-none pl-0 mt-4 space-y-1">
                  {certstemp4.map((c, i) => (
                    <li key={i}>
                      <input type="text" value={c} onChange={(e) => handleCertTemp4Change(i, e.target.value)} className="text-sm bg-transparent w-full text-gray-700" />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div
            className="w-full max-w-2xl mx-auto p-8 bg-white rounded-lg shadow-lg font-sans"
            style={{ height: "1100px" }}
          >
            <div className="h-full flex gap-8">
              {/* Left column – name, contact */}
              <div className="w-1/3 flex flex-col">
                <input
                  type="text"
                  value={nametemp5}
                  onChange={(e) => setNametemp5(e.target.value)}
                  className="text-2xl font-bold bg-transparent uppercase tracking-wide leading-tight"
                  style={{ letterSpacing: "0.05em" }}
                />
                <input
                  type="text"
                  value={addresstemp5}
                  onChange={(e) => setAddresstemp5(e.target.value)}
                  className="text-sm mt-4 bg-transparent w-full text-gray-600"
                />
                <input
                  type="text"
                  value={phonetemp5}
                  onChange={(e) => setPhonetemp5(e.target.value)}
                  className="text-sm mt-1 bg-transparent w-full text-gray-600"
                />
              </div>

              {/* Right column – experience, education, skills */}
              <div className="flex-1">
                {/* Experience */}
                <div className="mb-6">
                  <input
                    type="text"
                    value={experiencetemp5}
                    onChange={(e) => setExperiencetemp5(e.target.value)}
                    className="text-xs font-normal uppercase tracking-wider bg-transparent text-gray-500 mb-3"
                  />
                  <div className="mb-4">
                    <input
                      type="text"
                      value={company1temp5}
                      onChange={(e) => setCompany1temp5(e.target.value)}
                      className="text-sm font-semibold bg-transparent w-full"
                    />
                    <input
                      type="text"
                      value={company1locationtemp5}
                      onChange={(e) => setCompany1locationtemp5(e.target.value)}
                      className="text-sm text-gray-500 bg-transparent w-full"
                    />
                    <input
                      type="text"
                      value={post1temp5}
                      onChange={(e) => setPost1temp5(e.target.value)}
                      className="text-sm font-semibold bg-transparent w-full"
                    />
                    <input
                      type="text"
                      value={date1temp5}
                      onChange={(e) => setDate1temp5(e.target.value)}
                      className="text-sm text-gray-500 bg-transparent"
                    />
                    <ul className="mt-2">
                      {workdone1temp5.map((item, index) => (
                        <li key={index} className="flex gap-2 mt-1">
                          <span className="text-gray-400">•</span>
                          <RichTextBlock
                            value={item}
                            onChange={(v) => handleworkdonetemp5Change(index, v)}
                            className="text-sm bg-transparent w-full text-gray-800 leading-relaxed"
                            minHeight="24px"
                          />
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={company2temp5}
                      onChange={(e) => setCompany2temp5(e.target.value)}
                      className="text-sm font-semibold bg-transparent w-full"
                    />
                    <input
                      type="text"
                      value={company2locationtemp5}
                      onChange={(e) => setCompany2locationtemp5(e.target.value)}
                      className="text-sm text-gray-500 bg-transparent w-full"
                    />
                    <input
                      type="text"
                      value={post2temp5}
                      onChange={(e) => setPost2temp5(e.target.value)}
                      className="text-sm font-semibold bg-transparent w-full"
                    />
                    <input
                      type="text"
                      value={date2temp5}
                      onChange={(e) => setDate2temp5(e.target.value)}
                      className="text-sm text-gray-500 bg-transparent"
                    />
                    <ul className="mt-2">
                      {workdone2temp5.map((item, index) => (
                        <li key={index} className="flex gap-2 mt-1">
                          <span className="text-gray-400">•</span>
                          <RichTextBlock
                            value={item}
                            onChange={(v) => handleworkdone2temp5Change(index, v)}
                            className="text-sm bg-transparent w-full text-gray-800 leading-relaxed"
                            minHeight="24px"
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Education */}
                <div className="mb-6">
                  <input
                    type="text"
                    value={educationtemp5}
                    onChange={(e) => setEducationtemp5(e.target.value)}
                    className="text-xs font-normal uppercase tracking-wider bg-transparent text-gray-500 mb-3"
                  />
                  <input
                    type="text"
                    value={universitytemp5}
                    onChange={(e) => setUniversitytemp5(e.target.value)}
                    className="text-sm font-semibold bg-transparent w-full"
                  />
                  <input
                    type="text"
                    value={facultytemp5}
                    onChange={(e) => setFacultytemp5(e.target.value)}
                    className="text-sm bg-transparent w-full"
                  />
                  <input
                    type="text"
                    value={datetemp5}
                    onChange={(e) => setDatetemp5(e.target.value)}
                    className="text-sm text-gray-500 bg-transparent"
                    placeholder="Date"
                  />
                </div>

                {/* Skills */}
                <div>
                  <input
                    type="text"
                    value={skillstemp5}
                    onChange={(e) => setSkillstemp5(e.target.value)}
                    className="text-xs font-normal uppercase tracking-wider bg-transparent text-gray-500 mb-3"
                  />
                  <ul className="space-y-2">
                    {skillsdetailtemp5.map((item, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="text-gray-400">•</span>
                        <RichTextBlock
                          value={item}
                          onChange={(v) => handleskillstemp5Change(index, v)}
                          className="text-sm bg-transparent w-full text-gray-800 leading-relaxed"
                          minHeight="24px"
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 6:
        const accentBlue6 = "#1e40af";
        return (
          <div className="w-full max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-lg font-sans" style={{ minHeight: "1100px" }}>
            {/* Header */}
            <div className="mb-6">
              <input type="text" value={nametemp6} onChange={(e) => setNametemp6(e.target.value)} className="text-3xl font-bold bg-transparent w-full uppercase tracking-wide" />
              <input type="text" value={professiontemp6} onChange={(e) => setProfessiontemp6(e.target.value)} className="text-lg mt-1 bg-transparent w-full" style={{ color: accentBlue6 }} />
              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-gray-600">
                <input type="text" value={phonetemp6} onChange={(e) => setPhonetemp6(e.target.value)} className="bg-transparent flex-1 min-w-[120px]" placeholder="Phone" />
                <input type="text" value={emailtemp6} onChange={(e) => setEmailtemp6(e.target.value)} className="bg-transparent flex-1 min-w-[120px]" placeholder="Email" />
                <input type="text" value={locationtemp6} onChange={(e) => setLocationtemp6(e.target.value)} className="bg-transparent flex-1 min-w-[120px]" placeholder="Location" />
                <input type="text" value={linkedintemp6} onChange={(e) => setLinkedintemp6(e.target.value)} className="bg-transparent flex-1 min-w-[120px]" placeholder="LinkedIn" />
              </div>
            </div>

            <div className="flex gap-8">
              {/* Left Column (2/3) */}
              <div className="flex-1 min-w-0">
                <div className="mb-6">
                  <input type="text" value={summarylabeltemp6} onChange={(e) => setSummarylabeltemp6(e.target.value)} className="text-xs font-bold uppercase tracking-wider bg-transparent border-b-2 border-black pb-2 mb-3 w-full" />
                  <RichTextBlock value={profileinfotemp6} onChange={setProfileinfotemp6} className="text-sm bg-transparent w-full text-gray-800 leading-relaxed" minHeight="60px" placeholder="Professional summary..." />
                </div>

                <div className="mb-6">
                  <input type="text" value={experiencetemp6} onChange={(e) => setExpriencetemp6(e.target.value)} className="text-xs font-bold uppercase tracking-wider bg-transparent border-b-2 border-black pb-2 mb-3 w-full" />
                  <div className="mb-4">
                    <input type="text" value={post1temp6} onChange={(e) => setPost1temp6(e.target.value)} className="text-sm font-bold bg-transparent w-full" />
                    <input type="text" value={company1temp6} onChange={(e) => setComapny1temp6(e.target.value)} className="text-sm font-bold bg-transparent w-full" style={{ color: accentBlue6 }} />
                    <div className="flex gap-3 text-sm text-gray-500">
                      <input type="text" value={date1temp6} onChange={(e) => setDate1temp6(e.target.value)} className="bg-transparent flex-1" placeholder="Date" />
                      <input type="text" value={company1locationtemp6} onChange={(e) => setCompany1locationtemp6(e.target.value)} className="bg-transparent flex-1" placeholder="Location" />
                    </div>
                    <ul className="mt-2 space-y-1">
                      {workdone1temp6.map((item, index) => (
                        <li key={index} className="flex gap-2 items-start">
                          <span className="text-gray-400 flex-shrink-0 pt-0.5">•</span>
                          <RichTextBlock value={item} onChange={(v) => handleworkdone1temp6Change(index, v)} className="text-sm bg-transparent flex-1 min-w-0 text-gray-800 leading-snug" minHeight="24px" />
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <input type="text" value={post2temp6} onChange={(e) => setPost2temp6(e.target.value)} className="text-sm font-bold bg-transparent w-full" />
                    <input type="text" value={company2temp6} onChange={(e) => setCompany2temp6(e.target.value)} className="text-sm font-bold bg-transparent w-full" style={{ color: accentBlue6 }} />
                    <div className="flex gap-3 text-sm text-gray-500">
                      <input type="text" value={date2temp6} onChange={(e) => setDate2temp6(e.target.value)} className="bg-transparent flex-1" placeholder="Date" />
                      <input type="text" value={company2locationtemp6} onChange={(e) => setCompany2locationtemp6(e.target.value)} className="bg-transparent flex-1" placeholder="Location" />
                    </div>
                    <ul className="mt-2 space-y-1">
                      {workdone2temp6.map((item, index) => (
                        <li key={index} className="flex gap-2 items-start">
                          <span className="text-gray-400 flex-shrink-0 pt-0.5">•</span>
                          <RichTextBlock value={item} onChange={(v) => handleworkdone2temp6Change(index, v)} className="text-sm bg-transparent flex-1 min-w-0 text-gray-800 leading-snug" minHeight="24px" />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <input type="text" value={educationlabeltemp6} onChange={(e) => setEducationlabeltemp6(e.target.value)} className="text-xs font-bold uppercase tracking-wider bg-transparent border-b-2 border-black pb-2 mb-3 w-full" />
                  <div className="mb-4">
                    <input type="text" value={facultytemp6} onChange={(e) => setFacultytemp6(e.target.value)} className="text-sm font-bold bg-transparent w-full" />
                    <input type="text" value={universitytemp6} onChange={(e) => setUniversitytemp6(e.target.value)} className="text-sm font-bold bg-transparent w-full" style={{ color: accentBlue6 }} />
                    <input type="text" value={datetemp6} onChange={(e) => setDatetemp6(e.target.value)} className="text-sm text-gray-500 bg-transparent" placeholder="Date" />
                  </div>
                  <div>
                    <input type="text" value={faculty2temp6} onChange={(e) => setFaculty2temp6(e.target.value)} className="text-sm font-bold bg-transparent w-full" />
                    <input type="text" value={university2temp6} onChange={(e) => setUniversity2temp6(e.target.value)} className="text-sm font-bold bg-transparent w-full" style={{ color: accentBlue6 }} />
                    <input type="text" value={date2temp6Edu} onChange={(e) => setDate2temp6Edu(e.target.value)} className="text-sm text-gray-500 bg-transparent" placeholder="Date" />
                  </div>
                </div>
              </div>

              {/* Right Column (1/3) */}
              <div className="w-80 flex-shrink-0">
                <div className="mb-6">
                  <input type="text" value={achievementslabeltemp6} onChange={(e) => setAchievementslabeltemp6(e.target.value)} className="text-xs font-bold uppercase tracking-wider bg-transparent border-b-2 border-black pb-2 mb-3 w-full" />
                  {achievementstemp6.map((a, i) => (
                    <div key={i} className="mb-3">
                      <input type="text" value={a.title} onChange={(e) => handleAchievementtemp6Change(i, "title", e.target.value)} className="text-sm font-bold bg-transparent w-full" />
                      <RichTextBlock value={a.desc} onChange={(v) => handleAchievementtemp6Change(i, "desc", v)} className="text-sm bg-transparent w-full text-gray-700 leading-snug" minHeight="24px" />
                    </div>
                  ))}
                </div>

                <div className="mb-6">
                  <input type="text" value={skillslabeltemp6} onChange={(e) => setSkillslabeltemp6(e.target.value)} className="text-xs font-bold uppercase tracking-wider bg-transparent border-b-2 border-black pb-2 mb-3 w-full" />
                  <div className="flex flex-wrap gap-2">
                    {skillstemp6.map((s, i) => (
                      <input key={i} type="text" value={s} onChange={(e) => handleSkillstemp6Change(i, e.target.value)} className="px-2 py-1 text-xs bg-gray-100 rounded" />
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <input type="text" value={courseslabeltemp6} onChange={(e) => setCourseslabeltemp6(e.target.value)} className="text-xs font-bold uppercase tracking-wider bg-transparent border-b-2 border-black pb-2 mb-3 w-full" />
                  {coursestemp6.map((c, i) => (
                    <div key={i} className="mb-3">
                      <input type="text" value={c.title} onChange={(e) => handleCoursestemp6Change(i, "title", e.target.value)} className="text-sm font-bold bg-transparent w-full" style={{ color: accentBlue6 }} />
                      <RichTextBlock value={c.desc} onChange={(v) => handleCoursestemp6Change(i, "desc", v)} className="text-sm bg-transparent w-full text-gray-700 leading-snug" minHeight="24px" />
                    </div>
                  ))}
                </div>

                <div>
                  <input type="text" value={passionslabeltemp6} onChange={(e) => setPassionslabeltemp6(e.target.value)} className="text-xs font-bold uppercase tracking-wider bg-transparent border-b-2 border-black pb-2 mb-3 w-full" />
                  {passionstemp6.map((p, i) => (
                    <div key={i} className="mb-3">
                      <input type="text" value={p.title} onChange={(e) => handlePassionstemp6Change(i, "title", e.target.value)} className="text-sm font-bold bg-transparent w-full" />
                      <RichTextBlock value={p.desc} onChange={(v) => handlePassionstemp6Change(i, "desc", v)} className="text-sm bg-transparent w-full text-gray-700 leading-snug" minHeight="24px" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="w-full max-w-4xl mx-auto rounded-lg shadow-xl overflow-hidden font-sans antialiased" style={{ minHeight: "1100px", display: "grid", gridTemplateColumns: "256px minmax(400px, 1fr)" }}>
            {/* Left Column - Black sidebar */}
            <div className="bg-black text-white p-6 flex flex-col items-center text-center" style={{ width: "256px", minWidth: "256px" }}>
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-700 cursor-pointer mb-4" onClick={() => document.getElementById("Imageinput7").click()}>
                <img src={selectedImage7 || "https://via.placeholder.com/96"} alt="Profile" className="w-full h-full object-cover" />
              </div>
              <input type="file" id="Imageinput7" accept="image/*" onChange={handleImageChange7} className="hidden" />
              <input type="text" value={nametemp7} onChange={(e) => setNametemp7(e.target.value)} className="text-lg font-bold uppercase tracking-wide bg-transparent w-full text-center placeholder-white/60" placeholder="Your Name" />
              <input type="text" value={professiontemp7} onChange={(e) => setProfessiontemp7(e.target.value)} className="text-sm bg-transparent w-full text-center text-white/90 mt-1 placeholder-white/60" placeholder="Title" />

              <div className="w-full mt-6 space-y-4">
                <div className="bg-gray-600 rounded-lg px-3 py-1.5">
                  <input type="text" value={contactlabeltemp7} onChange={(e) => setContactlabeltemp7(e.target.value)} className="text-xs font-bold uppercase bg-transparent w-full text-center text-black" />
                </div>
                <div className="space-y-2 text-sm text-left">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0 text-white/80" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                    <input type="text" value={phonetemp7} onChange={(e) => setPhonetemp7(e.target.value)} className="bg-transparent flex-1 text-white placeholder-white/50 text-sm" placeholder="Phone" />
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0 text-white/80" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                    <input type="text" value={emailtemp7} onChange={(e) => setEmailtemp7(e.target.value)} className="bg-transparent flex-1 text-white placeholder-white/50 text-sm" placeholder="Email" />
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0 text-white/80" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                    <input type="text" value={websitetemp7} onChange={(e) => setWebsitetemp7(e.target.value)} className="bg-transparent flex-1 text-white placeholder-white/50 text-sm" placeholder="Website" />
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0 text-white/80" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                    <input type="text" value={locationtemp7} onChange={(e) => setLocationtemp7(e.target.value)} className="bg-transparent flex-1 text-white placeholder-white/50 text-sm" placeholder="Location" />
                  </div>
                </div>

                <div className="bg-gray-600 rounded-lg px-3 py-1.5">
                  <input type="text" value={skillslabeltemp7} onChange={(e) => setSkillslabeltemp7(e.target.value)} className="text-xs font-bold uppercase bg-transparent w-full text-center text-black" />
                </div>
                <ul className="space-y-1.5 text-sm text-left pl-2">
                  {skillstemp7.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-white/80 mt-1">•</span>
                      <input type="text" value={s} onChange={(e) => handleSkillstemp7Change(i, e.target.value)} className="bg-transparent flex-1 text-white placeholder-white/50 text-sm" />
                    </li>
                  ))}
                </ul>

                <div className="bg-gray-600 rounded-lg px-3 py-1.5">
                  <input type="text" value={educationlabeltemp7} onChange={(e) => setEducationlabeltemp7(e.target.value)} className="text-xs font-bold uppercase bg-transparent w-full text-center text-black" />
                </div>
                <div className="text-sm text-left space-y-1">
                  <input type="text" value={facultytemp7} onChange={(e) => setFacultytemp7(e.target.value)} className="bg-transparent w-full text-white placeholder-white/50" />
                  <input type="text" value={universitytemp7} onChange={(e) => setUniversitytemp7(e.target.value)} className="bg-transparent w-full text-white/90 placeholder-white/50" />
                  <input type="text" value={datetemp7} onChange={(e) => setDatetemp7(e.target.value)} className="bg-transparent w-full text-white/80 placeholder-white/50 text-xs" />
                </div>
              </div>
            </div>

            {/* Right Column - Light grey main */}
            <div className="bg-gray-200 p-8 min-w-0" style={{ width: "100%" }} data-template7-main>
              <input type="text" value={profilelabeltemp7} onChange={(e) => setProfilelabeltemp7(e.target.value)} className="text-sm font-bold uppercase tracking-wide bg-transparent border-b-2 border-black pb-2 mb-4 w-full text-gray-900" />
              <RichTextBlock value={profiletemp7} onChange={setProfiletemp7} className="text-sm bg-transparent w-full text-gray-800 leading-relaxed mb-8" minHeight="120px" placeholder="Profile..." />

              <input type="text" value={worklabeltemp7} onChange={(e) => setWorklabeltemp7(e.target.value)} className="text-sm font-bold uppercase tracking-wide bg-transparent border-b-2 border-black pb-2 mb-4 w-full text-gray-900" />
              <div className="space-y-6">
                <div>
                  <input type="text" value={post1temp7} onChange={(e) => setPost1temp7(e.target.value)} className="text-sm font-bold uppercase w-full bg-transparent text-gray-900" />
                  <input type="text" value={company1temp7} onChange={(e) => setCompany1temp7(e.target.value)} className="text-sm italic w-full bg-transparent text-gray-700" />
                  <RichTextBlock value={workdesc1temp7} onChange={setWorkdesc1temp7} className="text-sm bg-transparent w-full text-gray-800 mt-2 leading-relaxed" minHeight="50px" />
                </div>
                <div>
                  <input type="text" value={post2temp7} onChange={(e) => setPost2temp7(e.target.value)} className="text-sm font-bold uppercase w-full bg-transparent text-gray-900" />
                  <input type="text" value={company2temp7} onChange={(e) => setCompany2temp7(e.target.value)} className="text-sm italic w-full bg-transparent text-gray-700" />
                  <RichTextBlock value={workdesc2temp7} onChange={setWorkdesc2temp7} className="text-sm bg-transparent w-full text-gray-800 mt-2 leading-relaxed" minHeight="50px" />
                </div>
                <div>
                  <input type="text" value={post3temp7} onChange={(e) => setPost3temp7(e.target.value)} className="text-sm font-bold uppercase w-full bg-transparent text-gray-900" />
                  <input type="text" value={company3temp7} onChange={(e) => setCompany3temp7(e.target.value)} className="text-sm italic w-full bg-transparent text-gray-700" />
                  <RichTextBlock value={workdesc3temp7} onChange={setWorkdesc3temp7} className="text-sm bg-transparent w-full text-gray-800 mt-2 leading-relaxed" minHeight="50px" />
                </div>
              </div>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden font-sans" style={{ minHeight: "1100px" }}>
            {/* Header - Profile pic + Name + Title */}
            <div className="flex items-start gap-6 p-6 border-b border-gray-300">
              <div className="w-28 h-28 flex-shrink-0 overflow-hidden rounded-sm bg-gray-100 cursor-pointer" onClick={() => document.getElementById("Imageinput8").click()}>
                <img src={selectedImage8 || "https://via.placeholder.com/112"} alt="Profile" className="w-full h-full object-cover" />
              </div>
              <input type="file" id="Imageinput8" accept="image/*" onChange={handleImageChange8} className="hidden" />
              <div className="flex-1 min-w-0">
                <input type="text" value={nametemp8} onChange={(e) => setNametemp8(e.target.value)} className="text-2xl font-bold bg-transparent w-full text-gray-800" placeholder="Your Name" />
                <input type="text" value={professiontemp8} onChange={(e) => setProfessiontemp8(e.target.value)} className="text-base text-gray-500 bg-transparent w-full mt-1" placeholder="Professional Title" />
              </div>
            </div>

            {/* Contact Bar */}
            <div className="flex items-center justify-center gap-8 py-3 px-6 border-b border-gray-300 bg-gray-50">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                <input type="text" value={phonetemp8} onChange={(e) => setPhonetemp8(e.target.value)} className="bg-transparent text-sm text-gray-700 w-40" placeholder="Phone" />
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                <input type="text" value={emailtemp8} onChange={(e) => setEmailtemp8(e.target.value)} className="bg-transparent text-sm text-gray-700 w-48" placeholder="Email" />
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                <input type="text" value={locationtemp8} onChange={(e) => setLocationtemp8(e.target.value)} className="bg-transparent text-sm text-gray-700 w-40" placeholder="Location" />
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* About Me */}
              <div>
                <input type="text" value={aboutlabeltemp8} onChange={(e) => setAboutlabeltemp8(e.target.value)} className="text-sm font-bold uppercase tracking-wide bg-transparent border-b border-gray-800 pb-2 mb-3 w-full text-gray-800" />
                <RichTextBlock value={abouttemp8} onChange={setAbouttemp8} className="text-sm bg-transparent w-full text-gray-700 leading-relaxed" minHeight="80px" placeholder="About you..." />
              </div>

              {/* Education - 3 columns */}
              <div>
                <input type="text" value={educationlabeltemp8} onChange={(e) => setEducationlabeltemp8(e.target.value)} className="text-sm font-bold uppercase tracking-wide bg-transparent border-b border-gray-800 pb-2 mb-4 w-full text-gray-800" />
                <div className="grid grid-cols-3 gap-4">
                  {[edu1temp8, edu2temp8, edu3temp8].map((edu, i) => (
                    <div key={i} className="border border-gray-200 rounded p-4">
                      <input type="text" value={edu.degree} onChange={(e) => handleEdu8Change(i, "degree", e.target.value)} className="text-sm font-bold uppercase bg-transparent w-full text-gray-800" />
                      <input type="text" value={edu.school} onChange={(e) => handleEdu8Change(i, "school", e.target.value)} className="text-sm bg-transparent w-full text-gray-600" />
                      <input type="text" value={edu.date} onChange={(e) => handleEdu8Change(i, "date", e.target.value)} className="text-sm text-gray-500 bg-transparent w-full" />
                      <RichTextBlock value={edu.desc} onChange={(v) => handleEdu8Change(i, "desc", v)} className="text-sm bg-transparent w-full text-gray-700 mt-2 leading-snug" minHeight="40px" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Work Experience */}
              <div>
                <input type="text" value={worklabeltemp8} onChange={(e) => setWorklabeltemp8(e.target.value)} className="text-sm font-bold uppercase tracking-wide bg-transparent border-b border-gray-800 pb-2 mb-4 w-full text-gray-800" />
                <div className="space-y-4">
                  <div>
                    <input type="text" value={post1temp8} onChange={(e) => setPost1temp8(e.target.value)} className="text-sm font-bold uppercase bg-transparent w-full text-gray-800" />
                    <input type="text" value={date1temp8} onChange={(e) => setDate1temp8(e.target.value)} className="text-sm text-gray-500 bg-transparent" placeholder="Date" />
                    <RichTextBlock value={workdesc1temp8} onChange={setWorkdesc1temp8} className="text-sm bg-transparent w-full text-gray-700 mt-2 leading-relaxed" minHeight="50px" />
                  </div>
                  <div>
                    <input type="text" value={post2temp8} onChange={(e) => setPost2temp8(e.target.value)} className="text-sm font-bold uppercase bg-transparent w-full text-gray-800" />
                    <input type="text" value={date2temp8} onChange={(e) => setDate2temp8(e.target.value)} className="text-sm text-gray-500 bg-transparent" placeholder="Date" />
                    <RichTextBlock value={workdesc2temp8} onChange={setWorkdesc2temp8} className="text-sm bg-transparent w-full text-gray-700 mt-2 leading-relaxed" minHeight="50px" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 9:
        const accent9 = "#d4d4d4";
        const bg9 = "#F9F9F9";
        const sidebar9 = "#F2EDE4";
        return (
          <div
            data-template9
            className="w-full max-w-5xl mx-auto p-8 rounded-lg shadow-lg overflow-visible"
            style={{ minHeight: "1100px", backgroundColor: bg9 }}
          >
            {/* Header: name framed by two horizontal lines (reference design) */}
            <div className="text-center pt-8 pb-4">
              <div className="mx-auto h-px w-full max-w-2xl mb-6" style={{ backgroundColor: accent9 }} />
              <input
                type="text"
                value={nametemp9}
                onChange={(e) => setNametemp9(e.target.value)}
                className="text-4xl bg-transparent w-full text-center placeholder-gray-400"
                style={{ fontFamily: "'Dancing Script', cursive", color: "#333333" }}
                placeholder="Your Name"
              />
              <div className="mt-3 mx-auto h-px w-full max-w-2xl" style={{ backgroundColor: accent9 }} />
            </div>

            {/* Professional Profile - centered, wide text block */}
            <div className="px-4 py-4 text-center">
              <input
                type="text"
                value={profilelabeltemp9}
                onChange={(e) => setProfilelabeltemp9(e.target.value)}
                className="text-xs font-medium tracking-[0.35em] uppercase bg-transparent mb-3 block w-full text-center"
                style={{ color: "#333333" }}
              />
              <RichTextBlock
                value={profiletemp9}
                onChange={setProfiletemp9}
                data-template9-profile
                className="text-sm bg-transparent w-full max-w-5xl mx-auto leading-relaxed text-center text-[#333333]"
                minHeight="50px"
              />
              <div className="mt-4 mx-auto h-px w-full max-w-5xl" style={{ backgroundColor: accent9 }} />
            </div>

            {/* Two columns: left 1/3 (sidebar), right 2/3 (main) - reference layout */}
            <div data-template9-grid className="grid grid-cols-[minmax(160px,33%)_1px_1fr] gap-0 mt-4 min-h-[480px]">
              {/* Left column: Contact, Education, Skills - light beige sidebar */}
              <div className="p-6 space-y-8 min-w-0 rounded-l-lg" style={{ backgroundColor: sidebar9 }}>
                <div>
                  <input
                    type="text"
                    value={contactlabeltemp9}
                    onChange={(e) => setContactlabeltemp9(e.target.value)}
                    className="text-xs font-medium tracking-[0.35em] uppercase bg-transparent mb-4 block w-full text-[#333333]"
                  />
                  <div className="space-y-3 text-sm text-[#333333]">
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 mt-0.5" style={{ color: "#000", fontSize: "0.9rem" }}>&#8962;</span>
                      <input type="text" value={addresstemp9} onChange={(e) => setAddresstemp9(e.target.value)} className="flex-1 min-w-0 bg-transparent text-[#333333]" placeholder="Address" />
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 mt-0.5" style={{ color: "#000", fontSize: "0.9rem" }}>&#9742;</span>
                      <input type="text" value={phonetemp9} onChange={(e) => setPhonetemp9(e.target.value)} className="flex-1 min-w-0 bg-transparent text-[#333333]" placeholder="Phone" />
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 mt-0.5" style={{ color: "#000", fontSize: "0.9rem" }}>&#9993;</span>
                      <input type="text" value={emailtemp9} onChange={(e) => setEmailtemp9(e.target.value)} className="flex-1 min-w-0 bg-transparent text-[#333333]" placeholder="Email" />
                    </div>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={educationlabeltemp9}
                    onChange={(e) => setEducationlabeltemp9(e.target.value)}
                    className="text-xs font-medium tracking-[0.35em] uppercase bg-transparent text-[#333333] mb-4 block w-full"
                  />
                  <input type="text" value={facultytemp9} onChange={(e) => setFacultytemp9(e.target.value)} className="text-sm font-bold uppercase bg-transparent block w-full text-[#333333]" placeholder="Degree / Major" />
                  <input type="text" value={universitytemp9} onChange={(e) => setUniversitytemp9(e.target.value)} className="text-sm bg-transparent block w-full text-[#333333] mt-1" placeholder="University" />
                  <input type="text" value={datetemp9} onChange={(e) => setDatetemp9(e.target.value)} className="text-sm bg-transparent block w-full text-[#555555] mt-1" placeholder="Location / Years" />
                </div>

                <div>
                  <input
                    type="text"
                    value={skillslabeltemp9}
                    onChange={(e) => setSkillslabeltemp9(e.target.value)}
                    className="text-xs font-medium tracking-[0.35em] uppercase bg-transparent text-[#333333] mb-4 block w-full"
                  />
                  <ul className="space-y-2 text-sm text-[#333333]">
                    {skillstemp9.map((s, i) => (
                      <li key={i}>
                        <input type="text" value={s} onChange={(e) => handelskillstemp9(i, e.target.value)} className="w-full bg-transparent text-[#333333]" />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Vertical tan separator / timeline - spans full column height */}
              <div className="relative flex justify-center h-full min-h-[400px]">
                <div className="w-px h-full" style={{ backgroundColor: accent9 }} />
              </div>

              {/* Right column: Work Experience - white background (reference) */}
              <div className="p-6 pl-8 relative min-w-0 overflow-visible bg-white">
                <input
                  type="text"
                  value={worklabeltemp9}
                  onChange={(e) => setWorklabeltemp9(e.target.value)}
                  className="text-xs font-medium tracking-[0.35em] uppercase bg-transparent text-[#333333] mb-6 block w-full min-w-0"
                />

                {/* Job 1 */}
                <div className="relative pl-6 mb-10">
                  <div className="absolute left-0 top-2 w-3 h-3 rounded-full border-2 -ml-[7px]" style={{ borderColor: accent9, backgroundColor: "transparent" }} />
                  <input type="text" value={post1temp9} onChange={(e) => setPost1temp9(e.target.value)} className="text-sm font-bold uppercase bg-transparent w-full text-[#333333]" placeholder="Job Position" />
                  <input type="text" value={company1temp9} onChange={(e) => setCompany1temp9(e.target.value)} className="text-sm bg-transparent w-full text-[#555555] mt-0.5" placeholder="Company/Location/Years" />
                  <RichTextBlock value={workdesc1temp9} onChange={setWorkdesc1temp9} className="text-sm bg-transparent w-full text-[#333333] mt-2 leading-relaxed" minHeight="40px" />
                  <ul className="mt-2 space-y-1 pl-4 list-disc text-sm text-[#333333]">
                    {wrokdone1temp9.map((item, i) => (
                      <li key={i}>
                        <RichTextBlock value={item} onChange={(v) => { const arr = [...wrokdone1temp9]; arr[i] = v; setWorkdone1temp9(arr); }} className="inline bg-transparent" minHeight="20px" />
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Job 2 */}
                <div className="relative pl-6">
                  <div className="absolute left-0 top-2 w-3 h-3 rounded-full border-2 -ml-[7px]" style={{ borderColor: accent9, backgroundColor: "transparent" }} />
                  <input type="text" value={post2temp9} onChange={(e) => setPost2temp9(e.target.value)} className="text-sm font-bold uppercase bg-transparent w-full text-[#333333]" placeholder="Job Position" />
                  <input type="text" value={company2temp9} onChange={(e) => setCompany2temp9(e.target.value)} className="text-sm bg-transparent w-full text-[#555555] mt-0.5" placeholder="Company/Location/Years" />
                  <RichTextBlock value={workdesc2temp9} onChange={setWorkdesc2temp9} className="text-sm bg-transparent w-full text-[#333333] mt-2 leading-relaxed" minHeight="40px" />
                  <ul className="mt-2 space-y-1 pl-4 list-disc text-sm text-[#333333]">
                    {workdone2temp9.map((item, i) => (
                      <li key={i}>
                        <RichTextBlock value={item} onChange={(v) => { const arr = [...workdone2temp9]; arr[i] = v; setWorkdone2temp9(arr); }} className="inline bg-transparent" minHeight="20px" />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 10:
        return (
          <div
            className="w-full max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-lg overflow-visible"
            style={{ minHeight: "1100px" }}
          >
            <div className="min-h-full overflow-visible">
              {/* Header - centered with name and profession */}
              <div className={`${getTextColor()} p-6 text-center relative`}>
                <div className="flex flex-col items-center justify-center">
                  <input type="text"
                    value={nametemp10}
                    onChange={(e) => setNametemp10(e.target.value)}
                    placeholder="Your Name"
                    className="font-bold text-4xl bg-transparent w-full max-w-2xl text-center break-words"
                  />
                  <input type="text"
                    value={professiontemp10}
                    onChange={(e) => setProfessiontemp10(e.target.value)}
                    placeholder="Job Title"
                    className="text-xl mt-2 bg-transparent w-full max-w-2xl text-center break-words"
                  />
                </div>
                <div className="absolute top-6 right-6">
                  <div
                    className="w-24 h-24 overflow-hidden rounded-xl border-4 border-white "
                    onClick={() => document.getElementById("Imageinput10").click()}
                  >
                    <img
                      src={selectedImage10 || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Crect fill='%23e2e8f0' width='96' height='96'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-size='12' font-family='sans-serif'%3EPhoto%3C/text%3E%3C/svg%3E"}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
                <input
                  type="file"
                  id="Imageinput10"
                  accept="image/*"
                  onChange={handleImageChange10}
                  className="hidden"
                />
              </div>

              <div className="flex flex-col md:flex-row min-h-0 mt-6 overflow-visible">
                {/* Left Section */}
                <div className="md:w-1/2 bg-slate-50 p-8 min-w-0 overflow-visible rounded-r-lg">
                  <input type="text"
                    value={aboutmetemp10}
                    onChange={(e) => setAboutmetemp10(e.target.value)}
                    className="text-2xl font-bold mb-4 bg-transparent w-full break-words"
                  />
                  <textarea
                    ref={aboutMeTemp10Ref}
                    value={aboutmeinfotemp10}
                    onChange={(e) => setAboutmeinfotemp10(e.target.value)}
                    className="text-base bg-transparent resize-none w-full min-h-[120px] break-words overflow-y-auto"
                  />

                  <input type="text"
                    value={skillslabeltemp10}
                    onChange={(e) => setSkillslabeltemp10(e.target.value)}
                    className="text-2xl font-bold mt-8 mb-4 bg-transparent w-full break-words"
                  />
                  <ul className="space-y-1">
                    {skillstemp10.map((skillstemp10, index) => (
                      <li key={index}>
                        <input
                          type="text"
                          value={skillstemp10}
                          onChange={(e) =>
                            handleskillstemp10Chnage(index, e.target.value)
                          }
                          className="bg-transparent w-full break-words text-sm"
                        />
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Right Section */}
                <div className="md:w-1/2 bg-white p-8 min-w-0 overflow-visible">
                  <input type="text"
                    value={experiencetemp10}
                    onChange={(e) => setExperiencetemp10(e.target.value)}
                    className="text-2xl font-bold mb-4 bg-transparent w-full break-words"
                  />
                  <div className="mt-4">
                    <input type="text"
                      value={post1temp10}
                      onChange={(e) => setPost1temp10(e.target.value)}
                      className="text-lg font-semibold w-full break-words"
                    />
                    <input type="text"
                      value={company1temp10}
                      onChange={(e) => setCompany1temp10(e.target.value)}
                      className="italic bg-transparent w-full break-words block mt-1"
                    />
                    <ul className="mt-2 space-y-2 list-none pl-0">
                      {workdone1temp10.map((workdone1temp10, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-gray-700 font-bold flex-shrink-0 mt-0.5">•</span>
                          <textarea
                            value={workdone1temp10}
                            onChange={(e) =>
                              handleworkdone1temp10Chnage(index, e.target.value)
                            }
                            className="bg-transparent flex-1 resize-none break-words text-sm py-0 min-w-0"
                            rows={2}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6">
                    <input type="text"
                      value={post2temp10}
                      onChange={(e) => setPost2temp10(e.target.value)}
                      className="text-lg font-semibold bg-transparent w-full break-words"
                    />
                    <input type="text"
                      value={company2temp10}
                      onChange={(e) => setCompany2temp10(e.target.value)}
                      className="italic bg-transparent w-full break-words block mt-1"
                    />
                    <ul className="mt-2 space-y-2 list-none pl-0">
                      {workdone2temp10.map((workdone2temp10, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-gray-700 font-bold flex-shrink-0 mt-0.5">•</span>
                          <textarea
                            value={workdone2temp10}
                            onChange={(e) =>
                              handleworkdone2temp10Change(index, e.target.value)
                            }
                            className="bg-transparent flex-1 resize-none break-words text-sm py-0 min-w-0"
                            rows={2}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>

                  <input type="text"
                    value={educationlabeltemp10}
                    onChange={(e) => setEducationlabeltemp10(e.target.value)}
                    className="text-2xl font-bold mt-8 bg-transparent w-full break-words"
                  />
                  <div className="mt-4">
                    <input type="text"
                      value={facultytemp10}
                      onChange={(e) => setFacultytemp10(e.target.value)}
                      className="text-lg font-semibold bg-transparent w-full break-words"
                    />
                    <input type="text"
                      value={universitytemp10}
                      onChange={(e) => setUniversitytemp10(e.target.value)}
                      className="italic bg-transparent w-full break-words block mt-1"
                    />
                    <input type="text"
                      value={datetemp10}
                      onChange={(e) => setDatetemp10(e.target.value)}
                      className="bg-transparent w-full break-words mt-1"
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
            className="w-full max-w-2xl mx-auto p-10 bg-white rounded-lg shadow-lg overflow-visible"
            style={{ minHeight: "1100px" }}
          >
            <div className="min-h-full overflow-visible relative">
              <div
                className="absolute top-6 right-6 w-24 h-24 overflow-hidden rounded-xl border-2 border-slate-200 shadow-sm bg-slate-50"
                onClick={() => document.getElementById("imageInput").click()}
              >
                <img
                  src={selectedImage11 || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Crect fill='%23e5e7eb' width='96' height='96'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='14' font-family='sans-serif'%3EPhoto%3C/text%3E%3C/svg%3E"}
                  alt="profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Crect fill='%23e5e7eb' width='96' height='96'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='14'%3EPhoto%3C/text%3E%3C/svg%3E";
                  }}
                />
              </div>
              <input
                type="file"
                id="imageInput"
                accept="image/*"
                onChange={handleImageChange11}
                className="hidden"
              />
          
                 




              {/* Header */}
              <div className="text-center mb-10 flex flex-col items-center">
                <input type="text"
                  value={nametemp11}
                  onChange={(e) => setNametemp11(e.target.value)}
                  className="text-3xl font-bold text-slate-800 bg-transparent w-full max-w-md text-center tracking-tight placeholder-slate-400"
                  placeholder="Your Name"
                />
                <input type="text"
                  value={professiontemp11}
                  onChange={(e) => setProfessiontemp11(e.target.value)}
                  className="text-base font-medium text-slate-600 mt-2 bg-transparent w-full max-w-md text-center placeholder-slate-400"
                  placeholder="Professional Title"
                />
                <input type="text"
                  value={emailtemp11}
                  onChange={(e) => setEmailtemp11(e.target.value)}
                  className="mt-2 bg-transparent w-full max-w-md text-center text-sm text-slate-500 placeholder-slate-400"
                  placeholder="email@example.com"
                />
              </div>

              {/* Summary */}
              <div className="mb-8">
                <input type="text"
                  value={summarytemp11}
                  onChange={(e) => setSummarytemp11(e.target.value)}
                  className="text-xs font-semibold uppercase tracking-wider text-slate-500 bg-transparent mb-2"
                  placeholder="Summary"
                />
                {/* <p className="mt-4">
                  Dynamic marketing professional with 6+ years of experience in
                  digital campaigns, SEO, and content creation. Adept at leading
                  cross-functional teams to deliver high-impact projects.
                </p> */}
                <textarea
                  ref={summaryTemp11Ref}
                  value={summaryinfotemp11}
                  onChange={(e) => setSummaryinfotemp11(e.target.value)}
                  className="mt-2 bg-transparent w-full resize-none min-h-[80px] break-words overflow-y-auto text-slate-700 text-sm leading-relaxed focus:outline-none"
                  rows={3}
                  placeholder="Professional summary..."
                />
              </div>

              {/* Experience */}
              <div className="mb-8">
                <input type="text"
                  value={experiencetemp11}
                  onChange={(e) => setExperiencetemp11(e.target.value)}
                  className="text-xs font-semibold uppercase tracking-wider text-slate-500 bg-transparent mb-3"
                  placeholder="Experience"
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
                  <ul className="mt-2 space-y-2 list-none pl-0">
                    {workdone1temp11.map((workdone1temp11, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-gray-700 font-bold flex-shrink-0 mt-0.5">•</span>
                        <textarea
                          value={workdone1temp11}
                          onChange={(e) =>
                            handleworkdone1temp11Change(index, e.target.value)
                          }
                          className="bg-transparent flex-1 resize-none break-words text-sm py-0 min-w-0"
                          rows={2}
                        />
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6">
                  <input type="text"
                    value={post2temp11}
                    onChange={(e) => setPost2temp11(e.target.value)}
                    className="text-lg font-semibold bg-transparent w-full"
                  />
                  <input type="text"
                    value={company2temp11}
                    onChange={(e) => setCompany2temp11(e.target.value)}
                    className="italic bg-transparent w-full block mt-1"
                  />
                  <ul className="mt-2 space-y-2 list-none pl-0">
                    {workdone2temp11.map((workdone2temp11, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-gray-700 font-bold flex-shrink-0 mt-0.5">•</span>
                        <textarea
                          value={workdone2temp11}
                          onChange={(e) =>
                            handleworkdone2temp11Change(index, e.target.value)
                          }
                          className="bg-transparent flex-1 resize-none break-words text-sm py-0 min-w-0"
                          rows={2}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Education */}
              <div className="mb-8">
                <input type="text"
                  value={educationtemp11}
                  onChange={(e) => seteducationtemp11(e.target.value)}
                  className="text-xs font-semibold uppercase tracking-wider text-slate-500 bg-transparent mb-3"
                  placeholder="Education"
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
                <input type="text"
                  value={skilllabelstemp11}
                  onChange={(e) => setSkillslabeltemp11(e.target.value)}
                  className="text-xs font-semibold uppercase tracking-wider text-slate-500 bg-transparent mb-3"
                  placeholder="Skills"
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
            className="w-full max-w-3xl mx-auto p-8 bg-white rounded-lg shadow-lg"
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
                      src={selectedImage12 || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Crect fill='%23e2e8f0' width='96' height='96'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-size='12' font-family='sans-serif'%3EPhoto%3C/text%3E%3C/svg%3E"}
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

      case 13:
        return (
          <div className="w-full max-w-2xl mx-auto bg-white p-8" style={{ height: "1100px" }}>
            <div className="border-b-2 border-gray-800 pb-4 mb-6">
              <input type="text" value={nametemp13} onChange={(e) => setNametemp13(e.target.value)} className="text-3xl font-bold bg-transparent w-full" placeholder="Your Name" />
              <input type="text" value={professiontemp13} onChange={(e) => setProfessiontemp13(e.target.value)} className="text-lg text-gray-600 bg-transparent w-full mt-1" placeholder="Professional Title" />
            </div>
            <div className="mb-6">
              <h3 className="text-sm font-bold uppercase text-gray-500 mb-2">Professional Summary</h3>
              <textarea value={summarytemp13} onChange={(e) => setSummarytemp13(e.target.value)} className="w-full bg-transparent resize-none text-sm" rows={3} />
            </div>
            <div className="mb-6">
              <h3 className="text-sm font-bold uppercase text-gray-500 mb-2">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {skillstemp13.map((s, i) => (
                  <input key={i} type="text" value={s} onChange={(e) => handleSkillstemp13Change(i, e.target.value)} className="bg-gray-50 px-2 py-1 text-sm w-24" />
                ))}
              </div>
            </div>
            <div className="mb-6">
              <h3 className="text-sm font-bold uppercase text-gray-500 mb-2">Experience</h3>
              <input type="text" value={post1temp13} onChange={(e) => setPost1temp13(e.target.value)} className="font-semibold bg-transparent w-full" />
              <input type="text" value={company1temp13} onChange={(e) => setCompany1temp13(e.target.value)} className="text-gray-600 italic bg-transparent w-full text-sm" />
              <ul className="list-disc pl-5 mt-2 space-y-1">
                {workdone1temp13.map((w, i) => (
                  <li key={i}><input type="text" value={w} onChange={(e) => handleWorkdone1temp13Change(i, e.target.value)} className="bg-transparent w-full text-sm" /></li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase text-gray-500 mb-2">Education</h3>
              <input type="text" value={facultytemp13} onChange={(e) => setFacultytemp13(e.target.value)} className="font-semibold bg-transparent w-full" />
              <input type="text" value={universitytemp13} onChange={(e) => setUniversitytemp13(e.target.value)} className="text-gray-600 bg-transparent w-full text-sm" />
              <input type="text" value={datetemp13} onChange={(e) => setDatetemp13(e.target.value)} className="text-gray-500 bg-transparent w-full text-sm" />
            </div>
          </div>
        );

      case 14:
        const sidebarStyle14 = getColorStyle('blue-900');
        const sidebarBg14 = sidebarStyle14.backgroundColor || '#0f172a';
        return (
          <div className="w-full max-w-3xl mx-auto overflow-hidden" style={{ height: "1100px" }}>
            <div className="flex h-full">
              <div className="w-1/3 p-6 text-white" style={{ backgroundColor: sidebarBg14 }}>
                <input type="text" value={nametemp14} onChange={(e) => setNametemp14(e.target.value)} className="text-xl font-bold bg-transparent w-full text-white placeholder-white/60" placeholder="Name" />
                <input type="text" value={professiontemp14} onChange={(e) => setProfessiontemp14(e.target.value)} className="text-sm italic bg-transparent w-full text-white/90 mt-1 placeholder-white/60" placeholder="Title" />
                <div className="mt-6">
                  <h3 className="text-xs font-bold uppercase opacity-80 mb-2">Contact</h3>
                  <textarea value={contacttemp14} onChange={(e) => setContacttemp14(e.target.value)} className="bg-transparent w-full text-sm text-white/90 resize-none" rows={3} />
                </div>
                <div className="mt-6">
                  <h3 className="text-xs font-bold uppercase opacity-80 mb-2">Skills</h3>
                  <ul className="space-y-1">
                    {skillstemp14.map((s, i) => (
                      <li key={i}><input type="text" value={s} onChange={(e) => handleSkillstemp14Change(i, e.target.value)} className="bg-transparent w-full text-sm text-white placeholder-white/50" /></li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="w-2/3 p-6 bg-white overflow-y-auto">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Experience</h3>
                <input type="text" value={post1temp14} onChange={(e) => setPost1temp14(e.target.value)} className="font-semibold bg-transparent w-full" />
                <input type="text" value={company1temp14} onChange={(e) => setCompany1temp14(e.target.value)} className="text-gray-600 italic bg-transparent w-full text-sm" />
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  {workdone1temp14.map((w, i) => (
                    <li key={i}><input type="text" value={w} onChange={(e) => handleWorkdone1temp14Change(i, e.target.value)} className="bg-transparent w-full text-sm" /></li>
                  ))}
                </ul>
                <div className="mt-8">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Education</h3>
                  <input type="text" value={facultytemp14} onChange={(e) => setFacultytemp14(e.target.value)} className="font-semibold bg-transparent w-full" />
                  <input type="text" value={universitytemp14} onChange={(e) => setUniversitytemp14(e.target.value)} className="text-gray-600 bg-transparent w-full text-sm" />
                </div>
              </div>
            </div>
          </div>
        );

      case 15:
        const renderAcadSection = (title, content) => (
          <div className="mb-8">
            <div className="border-t border-gray-400 my-3" />
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-center text-gray-900 py-2" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{title}</h3>
            <div className="border-t border-gray-400 mb-4" />
            <div className="text-left">{content}</div>
          </div>
        );
        return (
          <div
            className="w-full max-w-2xl mx-auto p-12"
            style={{ height: "1100px", backgroundColor: "#faf8f5", fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {/* Centered header - exact preview match */}
            <div className="text-center mb-8">
              <input
                type="text"
                value={nametemp15}
                onChange={(e) => setNametemp15(e.target.value)}
                className="text-2xl font-bold bg-transparent w-full text-center uppercase tracking-widest text-gray-900 placeholder-gray-500"
                placeholder="DR. YOUR NAME"
                style={{ letterSpacing: "0.15em" }}
              />
              <input
                type="text"
                value={subtitletemp15}
                onChange={(e) => setSubtitletemp15(e.target.value)}
                className="text-xs font-semibold bg-transparent w-full text-center uppercase tracking-[0.25em] text-gray-700 mt-2 placeholder-gray-500"
                placeholder="ACADEMIC CURRICULUM VITAE"
              />
              <div className="mt-4 text-sm text-gray-800 space-y-1" style={{ fontSize: "11px" }}>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                  <input type="text" value={phonetemp15} onChange={(e) => setPhonetemp15(e.target.value)} className="bg-transparent text-center" placeholder="Phone" />
                  <span className="text-gray-400">|</span>
                  <input type="text" value={emailtemp15} onChange={(e) => setEmailtemp15(e.target.value)} className="bg-transparent text-center" placeholder="Email" />
                  <span className="text-gray-400">|</span>
                  <input type="text" value={webtemp15} onChange={(e) => setWebtemp15(e.target.value)} className="bg-transparent text-center" placeholder="Web" />
                </div>
                <div className="text-center">
                  <input type="text" value={addresstemp15} onChange={(e) => setAddresstemp15(e.target.value)} className="bg-transparent text-center w-full" placeholder="Address" />
                </div>
              </div>
            </div>
            {renderAcadSection("Education", educationtemp15.map((e, i) => (
              <input key={i} type="text" value={e} onChange={(ev) => handleEducationtemp15Change(i, ev.target.value)} className="bg-transparent w-full mb-1 text-gray-900 block" style={{ fontSize: "12px" }} />
            )))}
            {renderAcadSection("Research Focus", <textarea value={researchfocustemp15} onChange={(e) => setResearchfocustemp15(e.target.value)} className="w-full bg-transparent resize-none text-gray-900" rows={2} style={{ fontSize: "12px" }} />)}
            {renderAcadSection("Publications", <ul className="list-disc pl-5 space-y-2">{publicationstemp15.map((p, i) => (<li key={i}><input type="text" value={p} onChange={(e) => handlePublicationstemp15Change(i, e.target.value)} className="bg-transparent w-full text-gray-900" style={{ fontSize: "12px" }} /></li>))}</ul>)}
            {renderAcadSection("Awards & Grants", <ul className="list-disc pl-5 space-y-2">{awardstemp15.map((a, i) => (<li key={i}><input type="text" value={a} onChange={(e) => handleAwardstemp15Change(i, e.target.value)} className="bg-transparent w-full text-gray-900" style={{ fontSize: "12px" }} /></li>))}</ul>)}
            {renderAcadSection("Selected Presentations", <ul className="list-disc pl-5 space-y-2">{presentationstemp15.map((p, i) => (<li key={i}><input type="text" value={p} onChange={(e) => handlePresentationstemp15Change(i, e.target.value)} className="bg-transparent w-full text-gray-900" style={{ fontSize: "12px" }} /></li>))}</ul>)}
            {renderAcadSection("Teaching Experience", <>
              <input type="text" value={teachingtemp15[0]} onChange={(e) => setTeachingtemp15([e.target.value, teachingtemp15[1], teachingtemp15[2]])} className="font-semibold bg-transparent w-full text-gray-900 block" style={{ fontSize: "12px" }} />
              <input type="text" value={teachingtemp15[1]} onChange={(e) => setTeachingtemp15([teachingtemp15[0], e.target.value, teachingtemp15[2]])} className="bg-transparent w-full text-gray-700 block" style={{ fontSize: "12px" }} />
              <input type="text" value={teachingtemp15[2]} onChange={(e) => setTeachingtemp15([teachingtemp15[0], teachingtemp15[1], e.target.value])} className="bg-transparent w-full text-gray-600 block" style={{ fontSize: "12px" }} />
            </>)}
          </div>
        );

      default:
        return <p>Template not found</p>;
    }
  };

  // No template selected (e.g. direct URL, refresh, or back navigation)
  const hasValidTemplate = templateId && !Number.isNaN(templateId) && templateId >= 1 && templateId <= 15;
  if (!hasValidTemplate) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 8.414V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800">No template selected</h1>
          <p className="text-gray-600">
            Please choose a template first. You can navigate from the template selection page to fill in your CV.
          </p>
          <button
            onClick={() => navigate("/choose_templates")}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Choose a template
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
  <div>
  <nav className="fixed top-0 left-0 right-0 w-full h-14 bg-slate-800 shadow-md z-50">
    <img src={Logo} className="h-[70px] w-52 ml-20 mt-[-10px] absolute object-contain" alt="Logo" />
    <p className="text-slate-100 ml-[600px] font-medium text-lg mt-3 absolute">Click anywhere to edit your CV</p>
    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 text-sm font-medium">
      {TEMPLATE_NAMES[templateId] || `Template ${templateId}`}
    </span>
  </nav>
  </div>

      {enhancedResume && (
        <div className="fixed left-4 top-20 z-40 max-w-sm">
          <button
            onClick={() => setShowEnhancedRef(!showEnhancedRef)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold shadow-lg hover:from-blue-700 hover:to-purple-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 8.414V19a2 2 0 01-2 2z" />
            </svg>
            {showEnhancedRef ? 'Hide' : 'Show'} Enhanced CV Reference
          </button>
          {showEnhancedRef && (
            <div className="mt-2 p-4 bg-white rounded-xl shadow-lg border border-slate-200 max-h-[70vh] overflow-y-auto">
              <p className="text-sm text-green-600 font-medium mb-2">✓ Content auto-filled</p>
              <p className="text-xs text-gray-500 mb-2">Edit below, then use Copy or Download:</p>
              <textarea
                value={editableRefContent}
                onChange={(e) => setEditableRefContent(e.target.value)}
                rows={14}
                className="w-full p-3 text-sm border border-gray-200 rounded-lg bg-white resize-none focus:ring-2 focus:ring-blue-400"
                placeholder="Paste or edit your CV content here..."
              />
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyRefContent}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {copied ? 'Copied!' : 'Copy content'}
                  </button>
                  <button
                    onClick={() => setEditableRefContent(enhancedResume)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    Reset
                  </button>
                </div>
                <button
                  onClick={() => applyEditedContentToTemplate(editableRefContent)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Apply to template
                </button>
                <p className="text-xs text-gray-500">Apply updates the template. Then use Download.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* {renderTemplate()} */}

      <FormattingToolbar />
      <div className="px-4 pt-28 pb-6 bg-slate-50 min-h-screen">
        <div 
          ref={cvRef} 
          className="bg-white mx-auto antialiased"
          style={{ 
            border: 'none',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            overflow: 'visible',
            minHeight: '100%',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            textRendering: 'optimizeLegibility'
          }}
        >
          <div key={templateId}>
            {renderTemplate()}
          </div>
        </div>

        {/* Enhanced Download Section */}
        <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 flex flex-col gap-3 items-end max-w-[90vw] md:max-w-none">
          {/* Download Options */}
          <div className={`bg-white rounded-xl shadow-lg border border-slate-100 p-4 md:p-5 flex flex-col gap-3 transition-all duration-300 ${
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
              onClick={() => handleDownload('pdf', true)}
              disabled={isDownloading}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 w-full md:min-w-[180px] justify-center text-sm md:text-base"
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 8.414V19a2 2 0 01-2 2z" />
                  </svg>
                  Download as Editable PDF
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 -mt-1">Editable text — select and copy in any PDF viewer</p>

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
