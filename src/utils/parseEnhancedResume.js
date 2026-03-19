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
  const secondLine = lines[firstContentIdx + 1];
  if (firstLine && firstLine.length < 100) {
    const looksLikeName = /^[A-Za-z][a-z]*\s+[A-Za-z][a-z]*(\s+[A-Za-z][a-z]*)?$/.test(firstLine.trim()) && firstLine.split(/\s+/).length <= 4;
    const looksLikeProfession = /^[A-Z\s\-&]+$/.test(firstLine) && firstLine.length > 10;
    if (looksLikeName) result.name = firstLine.trim();
    else if (looksLikeProfession) result.profession = firstLine;
  }
  if (!result.profession && secondLine && secondLine.length < 100 && /^[A-Z\s\-&]+$/.test(secondLine)) {
    result.profession = secondLine;
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
      // Avoid mapping job bullets / IT duties into Education (e.g. "Troubleshooting…")
      const jobDutyLine = (s) =>
        /\b(troubleshoot|troubleshooting|deployed|implemented|managed|leading\s|led\s|resolved|stakeholder|customers?|ticket|incident|agile|scrum|WAN|LAN|WLAN|backup|monitoring|configured|administered|enterprise|network\s+admin|technical\s+support)\b/i.test(
          s
        );
      const eduKeywordLine = (s) =>
        /\b(bachelor|b\.?\s*s\.?|b\.?\s*a\.?|master|m\.?\s*s\.?|mba|m\.?tech|ph\.?d|doctorate|associate|diploma|degree|ged|high\s+school|secondary|university|college|institute|academy|faculty|graduate|undergraduate|postgraduate|qualification|certification|gpa|honors?|cum\s+laude|dean'?s\s+list)\b/i.test(
          s
        );
      const institutionLine = (s) => /\b(university|college|institute|academy|school|polytechnic)\b/i.test(s);

      const goodLines = content.filter((c) => {
        const t = c.trim();
        if (t.length < 6 || t.length > 180) return false;
        if (/^[-•*]/.test(t)) return false;
        if (jobDutyLine(t) && !eduKeywordLine(t)) return false;
        // Skip stray one-letter tails (e.g. "… q") unless it clearly looks like education
        if (/\s[a-z]$/i.test(t) && t.length < 48 && !eduKeywordLine(t)) return false;
        return eduKeywordLine(t) || institutionLine(t);
      });

      for (const c of content) {
        const t = c.trim();
        if (!result.education.date && /\d{4}/.test(t) && (!jobDutyLine(t) || eduKeywordLine(t))) {
          const m = t.match(/\d{4}\s*[-–/]\s*\d{4}|\d{1,2}\/\d{4}\s*[-–]\s*(?:current|\d{1,2}\/\d{4}|\d{4})|\d{4}/i);
          if (m) result.education.date = m[0];
        }
      }

      if (goodLines.length >= 1) {
        const degCandidate =
          goodLines.find((c) => eduKeywordLine(c) && !institutionLine(c)) ||
          goodLines.find((c) => eduKeywordLine(c)) ||
          goodLines[0];
        const schCandidate = goodLines.find((c) => c.trim() !== degCandidate.trim() && institutionLine(c)) ||
          goodLines.find((c) => c.trim() !== degCandidate.trim());
        result.education.degree = degCandidate.trim();
        if (schCandidate) result.education.school = schCandidate.trim();
        if (institutionLine(degCandidate) && !schCandidate && goodLines.length === 1) {
          result.education.school = degCandidate.trim();
          result.education.degree = "";
        }
      }
    }
  }

  if (!result.summary) {
    const firstPara = lines.find((l) => l.length > 60 && !sectionHeaders.some((h) => l.toLowerCase().includes(h)));
    if (firstPara) result.summary = firstPara.slice(0, 800);
  }

  if (result.skills.length === 0) {
    const skillKeywords = text.match(/\b(JavaScript|Python|React|Node\.?js|AWS|SQL|Java|C\+\+|HTML|CSS|Docker|Kubernetes|Git|Linux|Excel|Management|Leadership|Network|IT|Administration|WAN|LAN|WLAN|tracking|deployment|backup|enterprise)\b/gi);
    if (skillKeywords) result.skills = [...new Set(skillKeywords)].slice(0, 10);
  }

  // Extract name: look for "Name:" prefix
  if (!result.name) {
    const nameLine = lines.find((l) => /^name\s*:\s*/i.test(l));
    if (nameLine) result.name = nameLine.replace(/^name\s*:\s*/i, "").trim();
  }

  // Fallback: if content has bullet points but no structured experience, create one experience from all bullets
  if (result.experiences.length === 0) {
    const bulletLines = lines.filter(
      (l) =>
        l.startsWith("-") || l.startsWith("•") || l.startsWith("*") || (l.length > 50 && !sectionHeaders.some((h) => l.toLowerCase().startsWith(h)))
    );
    const responsibilities = bulletLines.map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter((r) => r.length > 10);
    if (responsibilities.length > 0) {
      result.experiences = [{ role: "Professional Experience", company: "", dateRange: "", responsibilities }];
    }
  }

  return result;
}
