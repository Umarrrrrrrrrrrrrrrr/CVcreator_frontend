/**
 * True if a line is a date range fragment, not a job title (e.g. "03/2013 — to", "2017 - Present").
 */
export function looksLikeDateRangeLine(s) {
  if (!s || typeof s !== "string") return false;
  const t = s.trim();
  if (!t || t.length > 100) return false;
  if (/^[,;:\s–—\-]+$/u.test(t)) return true;
  const hasNumDate = /\d{1,2}\/\d{4}|\b(19|20)\d{2}\b/.test(t);
  const rangeMarker =
    /(?:\bto\b|–|—|present|current|\bjan\.?\b|\bfeb\.?\b|\bmar\b|\bapr\.?\b|\bmay\b|\bjun\.?\b|\bjul\.?\b|\baug\.?\b|\bsep\.?\b|\boct\.?\b|\bnov\.?\b|\bdec\.?\b)/i.test(
      t
    ) || /(?:^|\s)[-–—](?:\s|$)/.test(t);
  if (hasNumDate && rangeMarker) return true;
  if (/^\d{1,2}\/\d{4}\s*[–—-]\s*to\s*$/i.test(t)) return true;
  if (/^\d{4}\s*[–—-]\s*to\s*$/i.test(t)) return true;
  return false;
}

/**
 * Normalize common mojibake/encoding artifacts from pasted CV text.
 * Examples: "Â·", "â€¢", zero-width chars, NBSPs.
 */
function normalizeEnhancedInput(raw) {
  if (!raw || typeof raw !== "string") return "";
  return raw
    .replace(/\u200b|\uFEFF|ï¼​/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/Â(?=[•·:\-\s])/g, "")
    .replace(/â€¢|Â·|·/g, "\n• ")
    .replace(/\s*[•▪●]\s*/g, "\n• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripSummaryPlaceholders(summary) {
  return String(summary || "")
    .replace(/\[[^\]]*add[^\]]*\]/gi, "")
    .replace(/\[[A-Z\s_]{4,}\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isGenericOrPlaceholderSummary(summary) {
  const s = String(summary || "").trim();
  if (!s) return true;
  if (/\[[^\]]+\]/.test(s)) return true;
  if (/add your|add key|add goal|placeholder|lorem ipsum/i.test(s)) return true;
  const genericPatterns = [
    /results-driven professional with proven experience/i,
    /skilled in/i,
    /seeking to leverage expertise/i,
    /demonstrated success in/i,
  ];
  const genericHits = genericPatterns.filter((p) => p.test(s)).length;
  return genericHits >= 2;
}

function buildMeaningfulSummary(result) {
  const parts = [];
  const title = result.profession || "Professional";
  const topSkills = (result.skills || []).filter(Boolean).slice(0, 4);
  const firstExp = (result.experiences || [])[0] || null;
  const firstResp = (firstExp?.responsibilities || []).find((r) => r && r.length > 18);

  if (topSkills.length > 0) {
    parts.push(`${title} with strengths in ${topSkills.join(", ")}.`);
  } else {
    parts.push(`${title} focused on delivering reliable, high-quality outcomes.`);
  }
  if (firstResp) {
    const cleanResp = firstResp.replace(/\.$/, "").trim();
    parts.push(`Key contribution includes ${cleanResp}.`);
  } else if (firstExp && (firstExp.role || firstExp.company)) {
    const roleCompany = [firstExp.role, firstExp.company].filter(Boolean).join(" at ");
    if (roleCompany) parts.push(`Recent experience includes ${roleCompany}.`);
  }
  return parts.join(" ").trim();
}

function isLikelyCertificationLine(line) {
  const s = String(line || "").trim();
  if (!s || s.length < 4 || s.length > 160) return false;
  if (/^(about|profile|summary|objective)\b/i.test(s)) return false;
  if (/\b(passionate|curious|committed|eager|seeking|motivated individual)\b/i.test(s)) return false;
  const certKeyword =
    /\b(certified|certification|certificate|credential|license|licensed|accredited|associate|professional)\b/i.test(s);
  const knownCred =
    /\b(PMP|PRINCE2|ITIL|CISSP|CEH|CCNA|CCNP|OCA|OCP|AWS|AZ-?\d{2,4}|GCP|TOEFL|IELTS|SCRUM|CSM|PSM|Kubernetes|CKA|CKAD|CompTIA)\b/i.test(
      s
    );
  const examCode = /\b[A-Z]{2,6}-\d{2,4}\b/.test(s);
  return certKeyword || knownCred || examCode;
}

function stripMergedAddressFromCertLine(s) {
  const t = String(s || "").trim();
  const idx = t.search(/\s+(?:Sundarharaicha|Dharan|Biratnagar|Itahari|Kathmandu|Lalitpur|Pokhara|Morang|Province|Ward)\b/i);
  if (idx > 12) return t.slice(0, idx).trim();
  return t.replace(/\s+\d+\s*[-–]\s*\d+\s*,\s*Morang.*$/i, "").trim();
}

function uniqueCertifications(items) {
  const out = [];
  const seen = new Set();
  for (const raw of items || []) {
    let t = String(raw || "").replace(/^[-•*▪]\s*/, "").trim();
    t = stripMergedAddressFromCertLine(t);
    if (!isLikelyCertificationLine(t)) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/**
 * Parses enhanced CV text into structured data for auto-populating template fields.
 */
export function parseEnhancedResumeToStructuredData(text) {
  if (!text || typeof text !== "string") return null;
  const normalizedText = normalizeEnhancedInput(text);

  const result = {
    name: "",
    profession: "",
    summary: "",
    skills: [],
    languages: [],
    experiences: [],
    highlights: [],
    achievements: [],
    certifications: [],
    education: { degree: "", school: "", date: "" },
    contact: { phone: "", email: "", address: "", linkedin: "", location: "" },
  };

  const lines = normalizedText.split("\n").map((l) => l.trim()).filter(Boolean);
  const textLower = normalizedText.toLowerCase();

  const sectionHeaders = [
    "professional summary", "executive summary", "summary", "profile", "about me",
    "experience", "work experience", "employment", "professional experience",
    "skills", "technical skills", "competencies", "expertise", "expertise spans",
    "highlights", "key highlights", "core strengths",
    "education", "academic", "qualification", "certifications", "achievements",
    "awards",
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
  // Title case / mixed job title on line 2 after name (common in AI CVs)
  if (
    !result.profession &&
    result.name &&
    secondLine &&
    secondLine.length > 2 &&
    secondLine.length < 90 &&
    !/^[-•*]/.test(secondLine)
  ) {
    const low = secondLine.toLowerCase();
    if (
      !sectionHeaders.some((h) => low.startsWith(h) || low === h) &&
      !/\b(experience|education|skills|summary|profile|employment)\b/.test(low)
    ) {
      result.profession = secondLine.trim();
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLower = line.toLowerCase();

    if (
      lineLower.includes("professional summary") ||
      lineLower.includes("executive summary") ||
      (lineLower === "summary" && i > 2) ||
      lineLower === "profile" ||
      /^about(\s+me)?$/i.test(line.trim()) ||
      (lineLower.startsWith("about") && line.length < 48)
    ) {
      const content = getSectionContent(i);
      const joined = content
        .join("\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      result.summary = joined.slice(0, 800);
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
    } else if (
      /\blanguages?\b/i.test(lineLower) &&
      !/programming/i.test(lineLower) &&
      !/\b(code|framework|stack|typescript|python|java|react)\b/i.test(lineLower)
    ) {
      const content = getSectionContent(i);
      const langs = [];
      const pushLang = (raw) => {
        let t = String(raw || "")
          .trim()
          .replace(/^[-•*▪]\s*/, "");
        if (t.length < 2 || t.length > 52 || /^\d+$/.test(t)) return;
        t = t.replace(/\s*\([^)]*\)\s*$/, "").trim();
        const head = t.split(/[–—:|]/)[0].trim();
        if (head.length >= 2 && head.length <= 40 && !/\d{3,}/.test(head)) {
          langs.push(head.replace(/\s+/g, " "));
        }
      };
      for (const c of content) {
        if (!c.trim()) continue;
        if (c.includes(",") || c.includes(";")) {
          c.split(/[,;]/).forEach((p) => pushLang(p));
        } else {
          pushLang(c);
        }
      }
      result.languages = [...new Set(langs.map((l) => l.replace(/\.$/, "")))].slice(0, 8);
    } else if (
      /\bhighlights?\b/.test(lineLower) ||
      lineLower.includes("key highlights") ||
      /\bcore strengths\b/.test(lineLower)
    ) {
      const content = getSectionContent(i);
      for (const c of content) {
        const t = c.trim();
        if (!t) continue;
        if (/^[-•*▪]/.test(t)) {
          const item = t.replace(/^[-•*▪]\s*/, "").trim();
          if (item.length > 2) result.highlights.push(item);
        } else if (t.includes(",") || t.includes(";")) {
          t.split(/[,;]/)
            .map((s) => s.trim())
            .filter((s) => s.length > 1 && s.length < 120)
            .forEach((s) => {
              result.highlights.push(s);
              result.skills.push(s);
            });
        } else if (t.length < 180) {
          result.highlights.push(t);
        }
      }
      result.skills = [...new Set(result.skills)].filter(Boolean).slice(0, 25);
    } else if (lineLower.includes("certification") && !lineLower.includes("education")) {
      const content = getSectionContent(i);
      for (const c of content) {
        const t = c.trim();
        if (!t) continue;
        const cleaned = /^[-•*▪]/.test(t) ? t.replace(/^[-•*▪]\s*/, "").trim() : t;
        if (isLikelyCertificationLine(cleaned)) result.certifications.push(cleaned);
      }
    } else if (lineLower.includes("achievement") || lineLower.includes("awards")) {
      const content = getSectionContent(i);
      for (const c of content) {
        const t = c.trim();
        if (!t) continue;
        const cleaned = /^[-•*▪]/.test(t) ? t.replace(/^[-•*▪]\s*/, "").trim() : t;
        if (isLikelyCertificationLine(cleaned)) result.certifications.push(cleaned);
        else if (cleaned.length > 4 && cleaned.length < 220) result.achievements.push(cleaned);
      }
    } else if (lineLower.includes("experience") || lineLower.includes("employment")) {
      const content = getSectionContent(i);
      // Match 2017-2020, 2017 – Present, Jan 2020 - Present, MM/YYYY, etc.
      const datePattern =
        /(\d{1,2}\/\d{4}|\d{4})\s*(?:to|–|-)\s*(?:Current|Present|\d{1,2}\/\d{4}|\d{4})|\d{4}\s*[-–]\s*(?:Present|Current|\d{4})|\(\s*\d{4}\s*[-–]\s*(?:Present|Current)\s*\)|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\s*[-–]\s*(?:Present|Current|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4})/i;
      const sectionExperiences = [];
      let current = { role: "", company: "", dateRange: "", responsibilities: [] };
      let expectRole = false;
      let expectCompany = false;

      for (const c of content) {
        let dateMatch = c.match(datePattern);
        if (!dateMatch && /^\d{1,2}\/\d{4}\s*[–—-]\s*to\s*$/i.test(c.trim())) {
          dateMatch = [c.trim()];
        }
        if (dateMatch) {
          if (current.role || current.responsibilities.length) sectionExperiences.push({ ...current });
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
        } else if (
          (c.startsWith("-") || c.startsWith("•") || c.startsWith("*") || c.trim().length >= 35) &&
          current.role
        ) {
          current.responsibilities.push(c.replace(/^[-•*]\s*/, "").trim());
        }
      }
      if (current.role || current.responsibilities.length) sectionExperiences.push(current);

      // Many CVs omit a separate "date line": Job title → company → bullets (no strict date match)
      if (sectionExperiences.length === 0 && content.length > 0) {
        let j = 0;
        let pendingDate = "";
        while (j < content.length) {
          const line = content[j];
          if (looksLikeDateRangeLine(line)) {
            pendingDate = line.trim();
            j++;
            continue;
          }
          if (/^[-•*]/.test(line)) {
            const resp = [];
            while (j < content.length && /^[-•*]/.test(content[j])) {
              resp.push(content[j].replace(/^[-•*]\s*/, "").trim());
              j++;
            }
            while (
              j < content.length &&
              !/^[-•*]/.test(content[j]) &&
              content[j].trim().length >= 28
            ) {
              resp.push(content[j].trim());
              j++;
            }
            sectionExperiences.push({
              role: "Professional experience",
              company: "",
              dateRange: pendingDate,
              responsibilities: resp,
            });
            pendingDate = "";
            continue;
          }
          const pipeParts = line.split(/\|/).map((p) => p.trim());
          if (pipeParts.length >= 2 && pipeParts[0].length < 100) {
            const role = pipeParts[0];
            const company = pipeParts[1] || "";
            let dateRange = "";
            if (pipeParts[2] && /\d/.test(pipeParts[2])) dateRange = pipeParts[2];
            j++;
            const resp = [];
            while (j < content.length && /^[-•*]/.test(content[j])) {
              resp.push(content[j].replace(/^[-•*]\s*/, "").trim());
              j++;
            }
            while (
              j < content.length &&
              !/^[-•*]/.test(content[j]) &&
              content[j].trim().length >= 28
            ) {
              resp.push(content[j].trim());
              j++;
            }
            sectionExperiences.push({
              role,
              company,
              dateRange: dateRange || pendingDate,
              responsibilities: resp,
            });
            pendingDate = "";
            continue;
          }
          const roleLine = line;
          j++;
          let companyLine = "";
          if (j < content.length && !/^[-•*]/.test(content[j]) && content[j].length < 140) {
            companyLine = content[j];
            j++;
          }
          const resp = [];
          while (j < content.length && /^[-•*]/.test(content[j])) {
            resp.push(content[j].replace(/^[-•*]\s*/, "").trim());
            j++;
          }
          while (
            j < content.length &&
            !/^[-•*]/.test(content[j]) &&
            content[j].trim().length >= 28
          ) {
            resp.push(content[j].trim());
            j++;
          }
          sectionExperiences.push({
            role: roleLine,
            company: companyLine,
            dateRange: pendingDate,
            responsibilities: resp,
          });
          pendingDate = "";
        }
      }

      result.experiences.push(...sectionExperiences);
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

  // Contact (phone, email, address) for templates that expose those fields
  const emailM = normalizedText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailM) result.contact.email = emailM[0];
  const phoneM = normalizedText.match(
    /(?:\+?\d{1,3}[-.\s\u00a0]?)?(?:\(\d{3}\)|\d{3})[-.\s\u00a0]?\d{3}[-.\s\u00a0]?\d{4}\b/
  );
  if (phoneM) result.contact.phone = phoneM[0].trim();
  if (!result.contact.phone) {
    const np = normalizedText.match(/\+977[\s-]?\d{9,10}\b/);
    if (np) result.contact.phone = np[0].replace(/\s+/g, " ").trim();
  }
  const linkedinM = normalizedText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i);
  if (linkedinM) result.contact.linkedin = linkedinM[0].replace(/^https?:\/\//i, "");
  if (!result.contact.linkedin) {
    const ghM = normalizedText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[\w.-]+/i);
    if (ghM) result.contact.linkedin = ghM[0].replace(/^https?:\/\//i, "");
  }
  const addrLine = lines.find(
    (l) =>
      /\d/.test(l) &&
      l.length > 12 &&
      l.length < 160 &&
      /\b(street|st\.|road|rd\.|avenue|ave|lane|ln\.|drive|dr\.|boulevard|blvd|way|city|zip|postal|apt)\b/i.test(l)
  );
  if (addrLine) result.contact.address = addrLine.trim();
  if (!result.contact.address) {
    const nepalStyle = lines.find(
      (l) =>
        l.length > 8 &&
        l.length < 140 &&
        /\b(morang|sundarharaicha|kathmandu|biratnagar|dharan|itahari|nepal|province)\b/i.test(l) &&
        /[-–]\s*\d+/.test(l)
    );
    if (nepalStyle) result.contact.address = nepalStyle.trim();
  }
  if (!result.contact.address) {
    const loose = lines.find((l) => {
      const t = l.trim();
      if (t.length < 12 || t.length > 160) return false;
      if (/^[-•*]/.test(t)) return false;
      if (/@/.test(t)) return false;
      if (/^[A-Z\s]+$/i.test(t) && t.length < 40 && !/\d/.test(t)) return false;
      if (!/\d/.test(t)) return false;
      return /,/.test(t) || /\b(nepal|province|ward|street|st\.|road|city|zip|postal)\b/i.test(t);
    });
    if (loose) result.contact.address = loose.trim();
  }

  result.summary = stripSummaryPlaceholders(result.summary);
  if (!result.summary) {
    const firstPara = lines.find((l) => l.length > 60 && !sectionHeaders.some((h) => l.toLowerCase().includes(h)));
    if (firstPara) result.summary = firstPara.slice(0, 800);
  }

  if (result.skills.length === 0) {
    const skillKeywords = normalizedText.match(/\b(JavaScript|Python|React|Node\.?js|AWS|SQL|Java|C\+\+|HTML|CSS|Docker|Kubernetes|Git|Linux|Excel|Management|Leadership|Network|IT|Administration|WAN|LAN|WLAN|tracking|deployment|backup|enterprise)\b/gi);
    if (skillKeywords) result.skills = [...new Set(skillKeywords)].slice(0, 10);
  }

  // Extract name: look for "Name:" prefix
  if (!result.name) {
    const nameLine = lines.find((l) => /^name\s*:\s*/i.test(l));
    if (nameLine) result.name = nameLine.replace(/^name\s*:\s*/i, "").trim();
  }

  // Use Highlights as job duties when work blocks have a title but no bullets (common in AI CVs)
  if (result.experiences.length > 0 && result.highlights.length > 0) {
    const first = result.experiences[0];
    if (first.responsibilities.length === 0) {
      first.responsibilities = [...result.highlights];
    }
  }
  if (result.experiences.length === 0 && result.highlights.length > 0) {
    result.experiences = [
      {
        role: result.profession || "Professional highlights",
        company: "",
        dateRange: "",
        responsibilities: [...result.highlights],
      },
    ];
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

  if (result.certifications.length === 0) {
    const certLikeLines = lines.filter((l) => isLikelyCertificationLine(l));
    result.certifications = uniqueCertifications(certLikeLines).slice(0, 8);
  } else {
    result.certifications = uniqueCertifications(result.certifications).slice(0, 8);
  }

  result.summary = stripSummaryPlaceholders(result.summary);
  if (isGenericOrPlaceholderSummary(result.summary)) {
    result.summary = buildMeaningfulSummary(result);
  }

  // Drop employment bullets (and noisy roles) that repeat the summary — avoids duplicate lines in template/PDF
  if (result.summary && result.experiences?.length > 0) {
    const sumNorm = result.summary.toLowerCase().replace(/\s+/g, " ").trim();
    result.experiences = result.experiences.map((ex) => {
      let role = ex.role || "";
      const rNorm = role.trim().toLowerCase().replace(/\s+/g, " ");
      if (rNorm.length > 25 && sumNorm.includes(rNorm)) {
        role = "";
      } else if (rNorm.length > 30 && sumNorm.includes(rNorm.slice(0, Math.min(48, rNorm.length)))) {
        role = "";
      }
      const responsibilities = (ex.responsibilities || []).filter((r) => {
        const t = String(r).trim().toLowerCase().replace(/\s+/g, " ").replace(/\.{2,}/g, ".");
        if (t.length < 8) return true;
        if (t.length < 40 && sumNorm.includes(t)) return false;
        // Only strip long bullets that are fully embedded in the summary (avoid wiping all job duties)
        if (t.length >= 80 && sumNorm.includes(t)) return false;
        return true;
      });
      return { ...ex, role, responsibilities };
    });
  }

  return result;
}
