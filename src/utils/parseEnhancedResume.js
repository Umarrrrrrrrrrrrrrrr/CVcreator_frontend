/**
 * Parses enhanced CV text into structured data for auto-populating template fields.
 */
export function parseEnhancedResumeToStructuredData(text) {
  if (!text || typeof text !== "string") return null;

  const result = {
    name: "",
    profession: "",
    summary: "",
    skills: [],
    experiences: [],
    education: { degree: "", school: "", date: "" },
  };

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const textLower = text.toLowerCase();

  const sectionHeaders = [
    "professional summary", "executive summary", "summary", "profile", "about me",
    "experience", "work experience", "employment", "professional experience",
    "skills", "technical skills", "competencies", "expertise", "expertise spans",
    "education", "academic", "qualification", "certifications", "achievements",
  ];

  const getSectionContent = (startIdx) => {
    const content = [];
    for (let i = startIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      const lineLower = line.toLowerCase();
      if (sectionHeaders.some((h) => lineLower.startsWith(h) || lineLower === h)) break;
      if (/^-{3,}$/.test(line)) continue;
      content.push(line);
    }
    return content;
  };

  // Skip "Enhanced CV - AI Optimized" header, get profession from first meaningful line
  let firstContentIdx = 0;
  if (lines[0] && (lines[0].toLowerCase().includes("enhanced") || lines[0].toLowerCase().includes("ai optimized"))) {
    firstContentIdx = 1;
  }
  const firstLine = lines[firstContentIdx];
  if (firstLine && firstLine.length < 100 && /^[A-Z\s\-&]+$/.test(firstLine)) {
    result.profession = firstLine;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLower = line.toLowerCase();

    if (lineLower.includes("professional summary") || lineLower.includes("executive summary") || (lineLower === "summary" && i > 2) || lineLower === "profile") {
      const content = getSectionContent(i);
      result.summary = content.join(" ").replace(/\s+/g, " ").trim().slice(0, 800);
    } else if (lineLower.includes("skills") || lineLower.includes("competencies") || lineLower.includes("expertise")) {
      const content = getSectionContent(i);
      const skillItems = [];
      for (const c of content) {
        const bullets = c.split(/[•\-\*]\s*/).filter((b) => b.trim().length > 0);
        const comma = c.split(/[,;]/).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 50);
        if (bullets.length > 1) skillItems.push(...bullets.map((b) => b.trim()));
        else if (comma.length > 1) skillItems.push(...comma);
        else if (c.length < 70 && !c.match(/^\d/) && !c.toLowerCase().includes("company name")) skillItems.push(c);
      }
      result.skills = [...new Set(skillItems)].filter(Boolean).slice(0, 15);
    } else if (lineLower.includes("experience") || lineLower.includes("employment")) {
      const content = getSectionContent(i);
      const datePattern = /(\d{1,2}\/\d{4}|\d{4})\s*(?:to|–|-)\s*(?:Current|\d{1,2}\/\d{4}|\d{4})/i;
      let current = { role: "", company: "", dateRange: "", responsibilities: [] };
      let expectRole = false;
      let expectCompany = false;

      for (const c of content) {
        const dateMatch = c.match(datePattern);
        if (dateMatch) {
          if (current.role || current.responsibilities.length) result.experiences.push({ ...current });
          current = { role: "", company: "", dateRange: dateMatch[0], responsibilities: [] };
          expectRole = true;
          expectCompany = false;
        } else if (expectRole && c.length > 0 && c.length < 100 && !c.startsWith("-") && !c.startsWith("•")) {
          current.role = c;
          expectRole = false;
          expectCompany = true;
        } else if (expectCompany && c.length > 0 && c.length < 100 && !c.startsWith("-") && !c.startsWith("•")) {
          if (!c.toLowerCase().includes("city") && !c.toLowerCase().includes("state")) current.company = c;
          expectCompany = false;
        } else if ((c.startsWith("-") || c.startsWith("•") || c.startsWith("*") || c.length > 60) && current.role) {
          current.responsibilities.push(c.replace(/^[-•*]\s*/, "").trim());
        }
      }
      if (current.role || current.responsibilities.length) result.experiences.push(current);
    } else if (lineLower.includes("education") || lineLower.includes("academic")) {
      const content = getSectionContent(i);
      for (const c of content) {
        if (/\d{4}|\d{1,2}\/\d{4}/.test(c) && !result.education.date) result.education.date = c;
        else if (c.length > 10 && c.length < 100 && !result.education.degree && !c.toLowerCase().includes("company")) result.education.degree = c;
        else if (c.length > 5 && !result.education.school && c !== result.education.degree && !c.toLowerCase().includes("company")) result.education.school = c;
      }
    }
  }

  if (!result.summary) {
    const firstPara = lines.find((l) => l.length > 60 && !sectionHeaders.some((h) => l.toLowerCase().includes(h)));
    if (firstPara) result.summary = firstPara.slice(0, 800);
  }

  if (result.skills.length === 0) {
    const skillKeywords = text.match(/\b(JavaScript|Python|React|Node\.?js|AWS|SQL|Java|C\+\+|HTML|CSS|Docker|Kubernetes|Git|Linux|Excel|Management|Leadership|Network|IT|Administration)\b/gi);
    if (skillKeywords) result.skills = [...new Set(skillKeywords)].slice(0, 10);
  }

  return result;
}
