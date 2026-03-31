import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
// import html2pdf from "html2pdf.js";
// import { html2pdf } from "html2pdf.js";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import Logo from "../assets/logoo.png";
import { useAuth } from "../../context/AuthContext";
import { parseEnhancedResumeToStructuredData, looksLikeDateRangeLine } from "../../utils/parseEnhancedResume";
import FormattingToolbar from "../../components/FormattingToolbar";
import RichTextBlock from "../../components/RichTextBlock";
import Navbar from "../Navbar/Navbar";

const stripHtml = (html) => {
  if (!html || typeof html !== 'string') return '';
  const normalized = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ');
  const tmp = document.createElement('div');
  tmp.innerHTML = normalized;
  return (tmp.textContent || tmp.innerText || '').replace(/\n{3,}/g, '\n\n').trim();
};

/** Plain text → simple HTML for RichTextBlock (contenteditable expects HTML) */
const plainToRichHtml = (text) => {
  if (!text || typeof text !== 'string') return '';
  const t = text.trim();
  if (!t) return '';
  if (/<[a-z][\s\S]*>/i.test(t)) return t;
  return t
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, '<br />')}</p>`)
    .join('');
};

/** Keeps hyphenated tokens (e.g. anti-virus) on one line in narrow sidebars — matches PDF onclone behavior */
const protectHyphensForT4 = (s) =>
  String(s || '').replace(/([a-zA-Z0-9])-([a-zA-Z0-9])/g, '$1\u2011$2');

/** Convert noisy bullet-style text into one readable paragraph. */
const toReadableParagraph = (text) => {
  if (!text || typeof text !== 'string') return '';
  const cleaned = text
    .replace(/Â/g, '')
    .replace(/\u200b|\uFEFF|ï¼​/g, '')
    .replace(/\r\n/g, '\n');
  const parts = cleaned
    .split(/\n|•|·|\u2022/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
};

const cleanJobHeaderPart = (s) => {
  if (!s || typeof s !== 'string') return '';
  return s.replace(/^[,;:\s–—\-]+|[,;:\s–—\-]+$/g, '').trim();
};

const isEmploymentNoiseToken = (s) => {
  const t = cleanJobHeaderPart(s || '').toLowerCase();
  if (!t) return true;
  if (/^\/?\d{4}$/.test(t)) return true;
  if (["to", "current", "present", "city", "state", "company name", "company", "n/a"].includes(t)) return true;
  return looksLikeDateRangeLine(t);
};

const splitParagraphToBullets = (text, max = 4) => {
  const cleaned = toReadableParagraph(text || "");
  if (!cleaned) return [];
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => cleanJobHeaderPart(s))
    .filter(Boolean);
  if (sentences.length > 0) return sentences.slice(0, max);
  return [cleaned].slice(0, max);
};

const isTemplate4GenericEmploymentLine = (s) => {
  const t = cleanJobHeaderPart(String(s || "")).toLowerCase();
  if (!t) return true;
  if (/\[[^\]]+\]/.test(t)) return true;
  if (
    /\b(results-driven professional|professional with strengths|recent experience includes|skilled in|demonstrated success|seeking to leverage expertise|add your key skills|add key achievement|add goal)\b/i.test(
      t
    )
  ) {
    return true;
  }
  return false;
};

/** True if a bullet is only a fragment already stated in the summary (e.g. "reliable performance..") */
const template4BulletDuplicatesSummary = (bullet, summaryPlain) => {
  const s = String(summaryPlain || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  const b = String(bullet || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\.{2,}/g, ".")
    .trim();
  if (!s || !b || b.length < 10) return false;
  if (s.includes(b)) return true;
  if (b.length >= 18 && s.includes(b.slice(0, Math.min(48, b.length)))) return true;
  const words = b.split(/\s+/).filter((w) => w.length > 2);
  if (words.length >= 2 && words.length <= 8) {
    const phrase = words.join(" ");
    if (phrase.length >= 14 && s.includes(phrase)) return true;
  }
  return false;
};

const template4PostDuplicatesSummary = (post, summaryPlain) => {
  const s = String(summaryPlain || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  const raw = String(post || "").trim();
  if (!s || !raw || raw.length < 12) return false;
  const p = raw.toLowerCase().replace(/\s+/g, " ");
  if (s.includes(p)) return true;
  const head = p.split("|")[0].trim();
  if (head.length > 20 && s.includes(head)) return true;
  return false;
};

const normalizeTemplate4Experience = (ex, fallbackTitle = "Professional Experience", blockedBullets = [], summaryPlain = "") => {
  const roleRaw = cleanJobHeaderPart(ex?.role || '');
  const companyRaw = cleanJobHeaderPart(ex?.company || '');
  const dateRaw = cleanJobHeaderPart(ex?.dateRange || '');
  let role = roleRaw;
  let company = companyRaw;
  let date = dateRaw;
  const roleIsMonthYear = /^\d{1,2}\/\d{4}$/.test(roleRaw);
  const dateIsConnectorOnly = /^(to|current|present)$/i.test(dateRaw);

  if (isEmploymentNoiseToken(role)) {
    if (!date && roleRaw) date = roleRaw;
    role = '';
  }
  if (isEmploymentNoiseToken(company)) {
    if (!date && companyRaw) date = companyRaw;
    company = '';
  }
  if (!role && company && !isEmploymentNoiseToken(company)) {
    role = company;
    company = '';
  }
  if (roleIsMonthYear && (!date || dateIsConnectorOnly)) {
    date = roleRaw;
    role = '';
  }
  if (dateIsConnectorOnly) {
    date = "";
  }

  const sum = String(summaryPlain || "").trim();
  let bullets = (ex?.responsibilities || [])
    .map((r) => toReadableParagraph(String(r || '')))
    .map((r) => cleanJobHeaderPart(r))
    .filter((r) => r && !isEmploymentNoiseToken(r) && !isTemplate4GenericEmploymentLine(r))
    .filter((r) => !blockedBullets.some((b) => cleanJobHeaderPart(String(b || "")).toLowerCase() === r.toLowerCase()))
    .filter((r) => !sum || !template4BulletDuplicatesSummary(r, sum))
    .slice(0, 4);

  if (!role && bullets.length > 0) {
    const maybeTitle = bullets[0];
    if (maybeTitle.length <= 80 && !/[.!?]$/.test(maybeTitle) && !isTemplate4GenericEmploymentLine(maybeTitle)) {
      if (!sum || !template4BulletDuplicatesSummary(maybeTitle, sum)) {
        role = maybeTitle;
        bullets.shift();
      }
    }
  }

  let post = date ? `${role || fallbackTitle} | ${date}` : (role || fallbackTitle);
  if (sum && template4PostDuplicatesSummary(post, sum)) {
    post = date ? `${fallbackTitle} | ${date}` : fallbackTitle;
  }
  // If summary-dedupe removed every bullet, keep role duties so Employment isn't empty vs the editor
  if (bullets.length === 0 && (ex?.responsibilities || []).length > 0) {
    bullets = (ex.responsibilities || [])
      .map((r) => toReadableParagraph(String(r || '')))
      .map((r) => cleanJobHeaderPart(r))
      .filter((r) => r && !isEmploymentNoiseToken(r) && !isTemplate4GenericEmploymentLine(r))
      .slice(0, 4);
  }
  return { post, company, bullets };
};

/** Plain bullets → RichTextBlock HTML (one block per bullet). */
const template4BulletsToRichHtml = (bullets) =>
  (bullets || [])
    .filter(Boolean)
    .map((b) => plainToRichHtml(toReadableParagraph(String(b))))
    .filter(Boolean);

const extractLanguagesFromText = (text, max = 3) => {
  const raw = String(text || "").toLowerCase();
  if (!raw) return [];
  const known = [
    "english", "hindi", "tamil", "nepali", "urdu", "arabic", "french", "german",
    "spanish", "italian", "portuguese", "russian", "japanese", "korean", "chinese",
  ];
  const found = [];
  for (const lang of known) {
    if (new RegExp(`\\b${lang}\\b`, "i").test(raw)) found.push(lang);
  }
  const uniq = [...new Set(found)].slice(0, max);
  return uniq.map((l) => l.charAt(0).toUpperCase() + l.slice(1));
};

const isLikelyCertificationItem = (value) => {
  const s = String(value || "").trim();
  if (!s || s.length < 4 || s.length > 160) return false;
  if (/\b(passionate|curious|committed|eager|seeking|motivated individual)\b/i.test(s)) return false;
  return /\b(certified|certification|certificate|credential|license|licensed|accredited|PMP|ITIL|CISSP|CCNA|CCNP|OCA|OCP|AWS|AZ-?\d{2,4}|GCP|TOEFL|IELTS|SCRUM|CSM|PSM|CKA|CKAD|CompTIA)\b/i.test(s)
    || /\b[A-Z]{2,6}-\d{2,4}\b/.test(s);
};

/** Remove city/address fragments accidentally merged onto cert lines (e.g. "AWS ... Engineering Sundarharaicha - 4, Morang") */
const stripMergedAddressFromCert = (s) => {
  const t = String(s || '').trim();
  const idx = t.search(/\s+(?:Sundarharaicha|Dharan|Biratnagar|Itahari|Kathmandu|Lalitpur|Pokhara|Morang|Province|Ward)\b/i);
  if (idx > 12) return t.slice(0, idx).trim();
  return t.replace(/\s+\d+\s*[-–]\s*\d+\s*,\s*Morang.*$/i, '').trim();
};

const normalizeCertificationItems = (items, max = 4) => {
  const out = [];
  const seen = new Set();
  (items || []).forEach((x) => {
    let t = String(typeof x === 'string' ? x : (x?.title || x?.name || ''))
      .replace(/^[-•*▪]\s*/, '')
      .trim();
    t = stripMergedAddressFromCert(t);
    if (!isLikelyCertificationItem(t)) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  });
  return out.slice(0, max);
};

const T3_SECTION_ALIASES = {
  summary: ["professional summary", "executive summary", "summary", "profile", "about", "about me"],
  skills: ["skills", "technical skills", "competencies", "expertise", "key skills"],
  highlights: ["highlights", "key highlights", "core strengths"],
  experience: ["work experience", "professional experience", "experience", "employment"],
  awards: ["awards", "achievements", "certifications"],
  education: ["education", "academic", "qualification", "qualifications"],
};

const normalizeT3Header = (line) => {
  const h = (line || "").toLowerCase().replace(/[:\s]+$/g, "").trim();
  for (const [key, aliases] of Object.entries(T3_SECTION_ALIASES)) {
    if (aliases.some((a) => h === a || h.startsWith(`${a} `))) return key;
  }
  return null;
};

const stripListPrefix = (s) => String(s || "").replace(/^[-*•▪\d.)\s]+/, "").trim();

const splitTemplate3Sections = (text) => {
  const out = { intro: [], summary: [], skills: [], highlights: [], experience: [], awards: [], education: [] };
  let current = "intro";
  (text || "").split("\n").forEach((raw) => {
    const line = raw.trim();
    if (!line) return;
    const hdr = normalizeT3Header(line);
    if (hdr) {
      current = hdr;
      return;
    }
    out[current].push(line);
  });
  return out;
};

const isTemplate3NoiseLine = (line) => {
  const t = cleanJobHeaderPart(stripListPrefix(line || "")).toLowerCase();
  if (!t) return true;
  if (/^[,.;:|/\\-]+$/.test(t)) return true;
  if (looksLikeDateRangeLine(t)) return true;
  if (["to", "current", "present", "company name", "company", "n/a"].includes(t)) return true;
  return false;
};

const isLikelyTemplate3RoleTitle = (line) => {
  const t = cleanJobHeaderPart(line);
  if (!t) return false;
  if (isTemplate3NoiseLine(t)) return false;
  if (looksLikeDateRangeLine(t)) return false;
  if (t.length < 4 || t.length > 90) return false;
  if (/[.?!]$/.test(t)) return false;
  if (/\b(city|state)\b/i.test(t)) return false;
  return /\b(manager|administrator|consultant|technician|engineer|director|analyst|specialist|coordinator|lead|developer|officer)\b/i.test(
    t
  );
};

const uniqueInOrder = (arr) => {
  const out = [];
  const seen = new Set();
  for (const raw of arr || []) {
    const x = cleanJobHeaderPart(raw);
    if (!x) continue;
    const key = x.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(x);
  }
  return out;
};

const inferTemplate3Awards = (lines, max = 4) => {
  const pool = uniqueInOrder(cleanTemplate3Lines(lines));
  const picks = pool.filter((l) =>
    /\b(award|awarded|certified|certification|certificate|partner|milestone|honor|recognized|recognised)\b/i.test(l)
  );
  return picks.slice(0, max);
};

const cleanTemplate3Lines = (lines) =>
  (lines || [])
    .map((l) => cleanJobHeaderPart(stripListPrefix(String(l || "").replace(/ï¼​|\u200b|\uFEFF/g, ""))))
    .filter((l) => l && !isTemplate3NoiseLine(l));

const limitUniqueSkills = (skills, max = 10) => {
  const out = [];
  const seen = new Set();
  for (const raw of skills || []) {
    const s = cleanJobHeaderPart(raw);
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
};

const splitTemplate3Skills = (lines) => {
  const parts = [];
  for (const line of lines || []) {
    String(line || "")
      .split(/[,;|]/)
      .map((x) => cleanJobHeaderPart(x))
      .filter(Boolean)
      .forEach((x) => parts.push(x));
  }
  return parts;
};

const parseTemplate3ExperienceEntries = (lines) => {
  const clean = cleanTemplate3Lines(lines);
  if (clean.length === 0) return [];

  const entries = [];
  let current = null;
  for (let i = 0; i < clean.length; i++) {
    const line = clean[i];
    const years = line.match(/\b(?:19|20)\d{2}\b/g) || [];

    if (isLikelyTemplate3RoleTitle(line)) {
      if (current && (current.title || current.body.length)) entries.push(current);
      current = { title: cleanJobHeaderPart(line), body: [], years: [] };
      continue;
    }

    if (!current) continue;

    if (looksLikeDateRangeLine(line) || /^\/?\d{4}$/.test(line)) {
      if (years.length) current.years.push(...years);
      continue;
    }
    if (/\b(city|state)\b/i.test(line)) continue;

    current.body.push(line);
  }
  if (current && (current.title || current.body.length)) entries.push(current);

  return entries
    .map((e) => {
      const years = uniqueInOrder(e.years).slice(0, 2);
      const dateRange = years.length === 2 ? `${years[0]} - ${years[1]}` : years[0] || "";
      const body = uniqueInOrder(e.body).slice(0, 6);
      return { title: e.title, body, dateRange };
    })
    .filter((e) => e.title)
    .slice(0, 2);
};

const cleanTemplate3EducationLine = (line) =>
  cleanJobHeaderPart(stripListPrefix(String(line || "").replace(/ï¼​|\u200b|\uFEFF/g, "")));

const isTemplate3EducationNoise = (line) => {
  const t = cleanTemplate3EducationLine(line).toLowerCase();
  if (!t) return true;
  if (/^[,.;:|/\\-]+$/.test(t)) return true;
  if (["to", "current", "present", "city", "state", "company name", "company", "n/a"].includes(t)) return true;
  if (/^\/?\d{4}$/.test(t)) return true;
  return false;
};

const isLikelyEducationTitle = (line) =>
  /\b(bachelor|master|phd|doctorate|diploma|degree|high school|school|college|university|academy|institute|technician|associate)\b/i.test(
    line || ""
  );

const parseTemplate3EducationEntries = (lines) => {
  const clean = (lines || [])
    .map(cleanTemplate3EducationLine)
    .filter((l) => l && !isTemplate3EducationNoise(l));
  if (clean.length === 0) return [];

  const entries = [];
  let current = null;
  for (const line of clean) {
    if (isLikelyEducationTitle(line)) {
      if (current && current.title) entries.push(current);
      current = { title: line, desc: [] };
      continue;
    }
    if (!current) {
      current = { title: line, desc: [] };
      continue;
    }
    current.desc.push(line);
  }
  if (current && current.title) entries.push(current);

  return entries.slice(0, 3).map((e) => ({
    title: e.title,
    desc: uniqueInOrder(e.desc).slice(0, 2).join(" "),
  }));
};

/** Extracts Template 3 fields from raw text with minimal guessing. */
const extractTemplate3Content = (text) => {
  const sec = splitTemplate3Sections(text || "");
  const intro = cleanTemplate3Lines(sec.intro);
  const nameFromPrefix = intro.find((l) => /^name\s*:/i.test(l))?.replace(/^name\s*:/i, "").trim() || "";
  const introPlain = intro.filter((l) => !/^name\s*:/i.test(l));

  const summaryLines = cleanTemplate3Lines(sec.summary);
  const skillLines = limitUniqueSkills(splitTemplate3Skills(cleanTemplate3Lines(sec.skills)), 10);
  const highlightLines = cleanTemplate3Lines(sec.highlights);
  const awardsLines = cleanTemplate3Lines(sec.awards);
  const expLines = cleanTemplate3Lines(sec.experience);
  const eduEntries = parseTemplate3EducationEntries(sec.education);
  const expHasSection = expLines.length > 0;
  const parsedEntries = parseTemplate3ExperienceEntries(expHasSection ? expLines : highlightLines);
  const inferredAwards =
    awardsLines.length > 0
      ? []
      : inferTemplate3Awards([
          ...sec.highlights,
          ...sec.experience,
          ...sec.summary,
          ...sec.skills,
        ]);

  // Ordered mapping:
  // - If Experience section exists: first non-date line is title, rest are paragraph lines.
  // - Else: use Highlights in order (first item title, rest paragraph).
  let post1 = "";
  let work1Lines = [];
  let post2 = "";
  let work2Lines = [];

  if (parsedEntries.length > 0) {
    const e1 = parsedEntries[0];
    post1 = e1.title || "";
    work1Lines = [e1.dateRange, ...(e1.body || [])].filter(Boolean);
    const e2 = parsedEntries[1];
    if (e2) {
      post2 = e2.title || "";
      work2Lines = [e2.dateRange, ...(e2.body || [])].filter(Boolean);
    }
  } else if (expHasSection) {
    post1 = expLines[0] || "";
    work1Lines = expLines.slice(1).slice(0, 6);
  } else if (highlightLines.length > 0) {
    post1 = highlightLines[0] || "";
    work1Lines = highlightLines.slice(1).slice(0, 6);
  }

  // Optional second block only when there are many experience lines.
  if (!post2 && expHasSection && work1Lines.length >= 8) {
    post2 = work1Lines[0] || "";
    work2Lines = work1Lines.slice(1).slice(0, 6);
    // Keep first block focused and in-order.
    work1Lines = [];
  }

  return {
    name: nameFromPrefix || introPlain[0] || "",
    profession: introPlain[1] || "",
    skills: skillLines.join(", "),
    summaryHtml: summaryLines.length ? plainToRichHtml(summaryLines.join("\n\n")) : "",
    post1,
    work1Html: work1Lines.length ? plainToRichHtml(work1Lines.join("\n\n")) : "",
    post2,
    work2Html: work2Lines.length ? plainToRichHtml(work2Lines.join("\n\n")) : "",
    awards: (awardsLines.length > 0 ? awardsLines : inferredAwards).slice(0, 4),
    edu1Title: eduEntries[0]?.title || "",
    edu1Desc: eduEntries[0]?.desc || "",
    edu2Title: eduEntries[1]?.title || "",
    edu2Desc: eduEntries[1]?.desc || "",
    edu3Title: eduEntries[2]?.title || "",
    edu3Desc: eduEntries[2]?.desc || "",
  };
};

/** Recognize common CV section headers for organized preview */
const ENHANCED_RESUME_SECTION_REGEX =
  /^(professional\s+summary|executive\s+summary|summary|profile|about\s+me|skills?|technical\s+skills|core\s+competencies|competencies|expertise|work\s+experience|professional\s+experience|experience|employment|education|academic|qualifications?|certifications?|achievements?|projects?|contact|references?|languages?|interests?|objective|highlights?|key\s+skills)\s*:?\s*$/i;

function EnhancedResumeOrganizedPreview({ text }) {
  const lines = useMemo(() => (text || '').split('\n'), [text]);
  const parsed = useMemo(() => parseEnhancedResumeToStructuredData(text || ''), [text]);
  const certificationItems = useMemo(
    () => normalizeCertificationItems(parsed?.certifications || [], 4),
    [parsed]
  );
  const hasParsedContent = Boolean(
    parsed &&
      (
        parsed.name ||
        parsed.profession ||
        parsed.summary ||
        (parsed.skills && parsed.skills.length > 0) ||
        certificationItems.length > 0 ||
        (parsed.experiences && parsed.experiences.length > 0) ||
        parsed.education?.degree ||
        parsed.education?.school ||
        parsed.education?.date ||
        parsed.contact?.email ||
        parsed.contact?.phone ||
        parsed.contact?.linkedin ||
        parsed.contact?.address
      )
  );
  return (
    <div className="rounded-lg border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3 max-h-[42vh] overflow-y-auto shadow-inner">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Organized preview</p>
      {hasParsedContent ? (
        <div className="space-y-2">
          {(parsed.name || parsed.profession) && (
            <div className="pb-1 border-b border-indigo-200/80">
              {parsed.name && <p className="text-xs font-bold text-slate-900">{parsed.name}</p>}
              {parsed.profession && <p className="text-xs text-slate-700">{parsed.profession}</p>}
            </div>
          )}
          {parsed.summary && (
            <div>
              <h3 className="text-[11px] font-bold text-indigo-800 uppercase tracking-wide mb-1">Summary</h3>
              <p className="text-xs text-slate-700 leading-relaxed break-words">{parsed.summary}</p>
            </div>
          )}
          {parsed.skills?.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold text-indigo-800 uppercase tracking-wide mb-1">Skills</h3>
              <p className="text-xs text-slate-700 leading-relaxed break-words">
                {parsed.skills.slice(0, 12).join(", ")}
              </p>
            </div>
          )}
          {certificationItems.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold text-indigo-800 uppercase tracking-wide mb-1">Certifications</h3>
              <div className="space-y-1">
                {certificationItems.map((item, i) => (
                  <p key={`cert-${i}`} className="text-xs text-slate-700 leading-relaxed pl-3 ml-1 border-l-2 border-indigo-200">
                    <span className="text-indigo-500 mr-1">•</span>{item}
                  </p>
                ))}
              </div>
            </div>
          )}
          {parsed.experiences?.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold text-indigo-800 uppercase tracking-wide mb-1">Experience</h3>
              <div className="space-y-1">
                {parsed.experiences.slice(0, 2).map((ex, i) => (
                  <div key={i}>
                    <p className="text-xs font-semibold text-slate-800">
                      {[ex.role, ex.company, ex.dateRange].filter(Boolean).join(" | ")}
                    </p>
                    {(ex.responsibilities || []).slice(0, 2).map((r, ri) => (
                      <p key={`${i}-${ri}`} className="text-xs text-slate-700 leading-relaxed pl-3 ml-1 border-l-2 border-indigo-200">
                        <span className="text-indigo-500 mr-1">•</span>{r}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          {(parsed.education?.degree || parsed.education?.school || parsed.education?.date) && (
            <div>
              <h3 className="text-[11px] font-bold text-indigo-800 uppercase tracking-wide mb-1">Education</h3>
              <p className="text-xs text-slate-700 leading-relaxed break-words">
                {[parsed.education.degree, parsed.education.school, parsed.education.date].filter(Boolean).join(" | ")}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-0">
          {lines.map((line, i) => {
            const t = line.trimEnd();
            const trimmed = t.trim();
            if (!trimmed) return <div key={i} className="h-2 shrink-0" aria-hidden />;
            if (ENHANCED_RESUME_SECTION_REGEX.test(trimmed)) {
              const label = trimmed.replace(/:\s*$/, '').trim();
              return (
                <h3
                  key={i}
                  className="text-[11px] font-bold text-indigo-800 uppercase tracking-wide mt-3 first:mt-0 mb-1.5 pb-1 border-b border-indigo-200/80"
                >
                  {label}
                </h3>
              );
            }
            if (/^[-•*▪]\s/.test(trimmed) || /^\d+[\.)]\s/.test(trimmed)) {
              const body = trimmed.replace(/^[-•*▪]\s*/, '').replace(/^\d+[\.)]\s*/, '');
              return (
                <p key={i} className="text-xs text-slate-700 leading-relaxed pl-3 ml-1 my-1 border-l-2 border-indigo-200">
                  <span className="text-indigo-500 mr-1">•</span>
                  {body}
                </p>
              );
            }
            if (
              trimmed.length >= 8 &&
              trimmed.length <= 72 &&
              trimmed === trimmed.toUpperCase() &&
              /^[A-Z0-9\s\-&,\/']+$/.test(trimmed) &&
              trimmed.split(/\s+/).length <= 10
            ) {
              return (
                <p key={i} className="text-[11px] font-semibold text-slate-800 tracking-wide mt-2 mb-0.5">
                  {trimmed}
                </p>
              );
            }
            return (
              <p key={i} className="text-xs text-slate-700 leading-relaxed my-1 break-words">
                {trimmed}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Shared interactive “Enhanced CV” reference panel */
function EnhancedCvReferencePanelCard({
  textareaId,
  editableRefContent,
  setEditableRefContent,
  handleCopyToTemplate,
  isApplyingToTemplate,
  applyFeedback,
  handleCopyRefContent,
  copied,
  enhancedResume,
  compact,
}) {
  return (
    <div
      className={`flex flex-col flex-1 min-h-0 bg-white rounded-xl shadow-xl border border-slate-200/80 overflow-hidden ${
        compact ? 'max-lg:rounded-2xl max-lg:min-h-0' : ''
      }`}
    >
      <div className="shrink-0 p-3 border-b border-slate-100 bg-gradient-to-b from-emerald-50/80 to-white space-y-2">
        <div className="flex items-start gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">
            ✓
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">Enhanced CV loaded</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-snug">
              Edit the text below, then copy into your template (~2–3s).
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleCopyToTemplate}
          disabled={isApplyingToTemplate}
          className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
        >
          {isApplyingToTemplate ? (
            <>
              <svg className="w-5 h-5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Copying to template…
            </>
          ) : (
            <>
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Copy to template
            </>
          )}
        </button>
        {applyFeedback && (
          <p className={`text-xs font-medium ${applyFeedback.startsWith('Content applied') ? 'text-green-700' : 'text-amber-700'}`}>
            {applyFeedback}
          </p>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        <EnhancedResumeOrganizedPreview text={editableRefContent} />
        <div className="mt-3">
          <label htmlFor={textareaId} className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block mb-1.5">
            Full text (edit here)
          </label>
          <textarea
            id={textareaId}
            value={editableRefContent}
            onChange={(e) => setEditableRefContent(e.target.value)}
            rows={6}
            className="w-full p-3 text-sm text-slate-800 border border-slate-200 rounded-lg bg-slate-50/80 resize-y min-h-[120px] focus:ring-2 focus:ring-indigo-400 focus:border-indigo-300 focus:bg-white leading-relaxed font-mono"
            placeholder="Paste or edit your CV content here..."
            spellCheck
            style={{ wordBreak: 'break-word' }}
          />
        </div>
      </div>

      <div className="shrink-0 p-3 border-t border-slate-200 bg-slate-50 space-y-2">
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              const tidied = (editableRefContent || '')
                .replace(/\r\n/g, '\n')
                .split('\n')
                .map((l) => l.trimEnd())
                .join('\n')
                .replace(/\n{4,}/g, '\n\n\n')
                .trim();
              setEditableRefContent(tidied);
            }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-white shrink-0"
            title="Remove extra blank lines"
          >
            Tidy spacing
          </button>
          <button
            type="button"
            onClick={handleCopyRefContent}
            className="flex-1 min-w-[7rem] flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copied ? 'Copied!' : 'Copy text'}
          </button>
          <button
            type="button"
            onClick={() => setEditableRefContent(enhancedResume)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-white bg-white"
          >
            Reset
          </button>
        </div>
        <p className="text-[11px] text-slate-500 leading-snug">
          Use the green <strong>Copy to template</strong> button above to fill the CV fields from this text.
        </p>
      </div>
    </div>
  );
}

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

const PREMIUM_TEMPLATE_IDS = [2, 5, 7, 11, 14, 16]; // Premium templates - pay to access
const VISUAL_PDF_TEMPLATE_IDS = [1, 2, 3, 4, 9, 10, 11, 12, 13, 14, 15, 16];

const TEMPLATE_NAMES = {
  1: "Modern Professional", 2: "Classic Elegant", 3: "Creative Design",
  4: "Corporate Standard", 5: "Minimalist Style", 6: "Traditional Layout",
  7: "Bold Creative", 8: "Executive Format", 9: "Contemporary Design",
  10: "Timeless Classic", 11: "Executive Two-Column", 12: "Business Professional",
  13: "ATS-Optimized", 14: "Classic Red Accent", 15: "Clean Blue Header",
  16: "Professional Clean"
};

/** Section `<h3>` titles: vertically center label in row, left-aligned (match Template 1 bar behavior) */
const CV_SEC_H3 =
  'flex w-full min-w-0 items-center justify-start text-left min-h-[3rem] py-2 leading-normal box-border';
/** Same, centered (sidebars / centered layouts) */
const CV_SEC_H3_C =
  'flex w-full min-w-0 items-center justify-center text-center min-h-[3rem] py-2 leading-normal box-border';
/** Editable `<input>` section titles with border-b / underline */
const CV_SEC_IN = 'min-h-[3rem] py-2.5 box-border leading-normal';

/** Keeps AI-enhanced text available after refresh or direct URL (?templateId=) */
const FILL_CV_ENHANCED_SESSION = 'fillCvEnhancedResume';

const Fill_cv = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  useAuth(); // Keep for upgradeToPremium if needed
  // Read directly from localStorage - most reliable
  const isPremium = typeof window !== 'undefined' && localStorage.getItem('isPremium') === 'true';
  // Read templateId from URL (persists across navigation) or state (from Choose_templates)
  const templateId = Number(location.state?.templateId ?? searchParams.get("templateId"));
  const selectedColor = location.state?.selectedColor || null;
  const enhancedResumeFromState = location.state?.enhancedResume ?? null;
  const [enhancedResumeSession, setEnhancedResumeSession] = useState(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(FILL_CV_ENHANCED_SESSION);
  });

  useEffect(() => {
    if (enhancedResumeFromState) {
      sessionStorage.setItem(FILL_CV_ENHANCED_SESSION, enhancedResumeFromState);
      setEnhancedResumeSession(enhancedResumeFromState);
      return;
    }
    const pending = sessionStorage.getItem('pendingEnhancedResume');
    if (pending) {
      sessionStorage.setItem(FILL_CV_ENHANCED_SESSION, pending);
      sessionStorage.removeItem('pendingEnhancedResume');
      setEnhancedResumeSession(pending);
      return;
    }
    const stored = sessionStorage.getItem(FILL_CV_ENHANCED_SESSION);
    if (stored) setEnhancedResumeSession(stored);
  }, [location.key, enhancedResumeFromState]);

  const enhancedResume = enhancedResumeFromState || enhancedResumeSession || null;

  const cvRef = useRef(null); // ref to capture the cv section (PDF/PNG = template only, not the reference sidebar)
  const addressTemp4Ref = useRef(null); // Template 4: auto-resize address textarea in sidebar
  const image7DataUrlRef = useRef(null); // for blob→dataURL conversion when generating Template 7 PDF
  const addressTemp3Ref = useRef(null);
  const skillsTemp3Ref = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showEnhancedRef, setShowEnhancedRef] = useState(true);
  const [showDownloadOptions, setShowDownloadOptions] = useState(true);
  const [editableRefContent, setEditableRefContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [isApplyingToTemplate, setIsApplyingToTemplate] = useState(false);
  const editableRefContentRef = useRef('');
  useEffect(() => {
    editableRefContentRef.current = editableRefContent;
  }, [editableRefContent]);

  useEffect(() => {
    if (enhancedResume) setEditableRefContent(enhancedResume);
  }, [enhancedResume]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const value = (editableRefContent || '').trim();
    if (!value) return;
    sessionStorage.setItem(FILL_CV_ENHANCED_SESSION, editableRefContent);
    setEnhancedResumeSession(editableRefContent);
  }, [editableRefContent]);

  const handleCopyRefContent = async () => {
    try {
      await navigator.clipboard.writeText(editableRefContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Could not copy. Please select and copy manually.');
    }
  };

  const [applyFeedback, setApplyFeedback] = useState('');
  /** @returns {boolean} true if parsed and mapped to template fields */
  const applyEditedContentToTemplate = (text) => {
    const tid = Number(templateId);
    if (!text?.trim() || !Number.isFinite(tid) || tid < 1) {
      setApplyFeedback('Select a template and add content in the sidebar to apply.');
      setTimeout(() => setApplyFeedback(''), 4000);
      return false;
    }
    const data = parseEnhancedResumeToStructuredData(text);
    if (!data) {
      setApplyFeedback('Could not parse content. Ensure it has sections like Experience, Skills, or bullet points.');
      setTimeout(() => setApplyFeedback(''), 4000);
      return false;
    }
    if (templateId === 10) {
      if (data.name) setNametemp10(data.name);
      if (data.profession) setProfessiontemp10(data.profession);
      if (data.contact?.address) setAddresstemp10(data.contact.address);
      if (data.contact?.phone) setPhonetemp10(data.contact.phone);
      if (data.contact?.email) setEmailtemp10(data.contact.email);
      if (data.contact?.linkedin) setLinkedintemp10(data.contact.linkedin);
      if (data.summary) setAboutmeinfotemp10(data.summary);
      if (data.skills.length > 0) {
        const skills = data.skills.slice(0, 4);
        setSkillstemp10(skills);
        setSkillLeveltemp10(skills.map((_, i) => 85 - i * 5));
      }
      if (data.experiences.length > 0) {
        const ex0 = data.experiences[0];
        if (ex0.dateRange) setDate1temp10(ex0.dateRange);
        if (ex0.role) setPost1temp10(ex0.role);
        if (ex0.company) setCompany1temp10(ex0.company);
        if (ex0.responsibilities.length > 0) setWorkdone1temp10(ex0.responsibilities.slice(0, 5));
      }
      if (data.experiences.length > 1) {
        const ex1 = data.experiences[1];
        if (ex1.dateRange) setDate2temp10(ex1.dateRange);
        if (ex1.role) setPost2temp10(ex1.role);
        if (ex1.company) setCompany2temp10(ex1.company);
        if (ex1.responsibilities.length > 0) setWorkdone2temp10(ex1.responsibilities.slice(0, 5));
      }
      if (data.education.degree) setFacultytemp10(data.education.degree);
      if (data.education.school) setUniversitytemp10(data.education.school);
      if (data.education.date) setEduDate1temp10(data.education.date);
      if (data.education.gpa) setGpatemp10(data.education.gpa);
    } else if (templateId === 11) {
      if (data.name) setNametemp11(data.name.toUpperCase?.() || data.name);
      if (data.profession) setProfessiontemp11(data.profession);
      if (data.contact?.email) setEmailtemp11(data.contact.email);
      if (data.contact?.phone) setPhonetemp11(data.contact.phone);
      if (data.contact?.location) setLocationtemp11(data.contact.location);
      if (data.contact?.linkedin) setLinkedintemp11(data.contact.linkedin);
      if (data.summary) setSummaryinfotemp11(data.summary);
      if (data.skills.length > 0) setSkillstemp11(data.skills.slice(0, 8));
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        if (ex.dateRange) setDate1temp11(ex.dateRange);
        if (ex.role) setPost1temp11(ex.role);
        if (ex.company) setCompany1temp11(ex.company);
        if (ex.responsibilities.length > 0) setWorkdone1temp11(ex.responsibilities.slice(0, 4));
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        if (ex.dateRange) setDate2temp11(ex.dateRange);
        if (ex.role) setPost2temp11(ex.role);
        if (ex.company) setCompany2temp11(ex.company);
        if (ex.responsibilities.length > 0) setworkdone2temp11(ex.responsibilities.slice(0, 4));
      }
      if (data.experiences.length > 2) {
        const ex = data.experiences[2];
        if (ex.dateRange) setDate3temp11(ex.dateRange);
        if (ex.role) setPost3temp11(ex.role);
        if (ex.company) setCompany3temp11(ex.company);
        if (ex.responsibilities.length > 0) setWorkdone3temp11(ex.responsibilities.slice(0, 4));
      }
      if (data.education.degree) setFacultytemp11(data.education.degree);
      if (data.education.school) setUniversitytemp11(data.education.school);
      if (data.education.date) setDatetemp11(data.education.date);
    } else if (templateId === 12) {
      if (data.name) setNametemp12(data.name);
      if (data.profession) setProfessiontemp12(data.profession);
      if (data.summary) setSummaryinfotemp12(data.summary);
      if (data.contact?.location) setLocationtemp12(data.contact.location);
      if (data.contact?.phone) setPhonetemp12(data.contact.phone);
      if (data.contact?.email) setEmailtemp12(data.contact.email);
      if (data.contact?.linkedin) setLinkedintemp12(data.contact.linkedin);
      if (data.skills.length > 0) setSkillstemp12(data.skills.slice(0, 8));
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        if (ex.dateRange) setDate1temp12(ex.dateRange);
        if (ex.role) setPost1temp12(ex.role);
        if (ex.company) setCompany1temp12(ex.company);
        if (ex.responsibilities.length > 0) setWorkdone1temp12(ex.responsibilities.slice(0, 5));
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        if (ex.dateRange) setDate2temp12(ex.dateRange);
        if (ex.role) setPost2temp12(ex.role);
        if (ex.company) setCompany2temp12(ex.company);
        if (ex.responsibilities.length > 0) setWorkdone2temp12(ex.responsibilities.slice(0, 5));
      }
      if (data.education.degree) setFacultytemp12(data.education.degree);
      if (data.education.school) setUniversitytemp12(data.education.school);
      if (data.education.gpa) setAwardstemp12(data.education.gpa);
      if (data.certifications?.length) setCertificationstemp12(data.certifications.slice(0, 4));
    } else if (templateId === 2) {
      if (data.summary) setProfileinfoTemp2(data.summary);
      if (data.profession) setTitletemp2(data.profession.toUpperCase());
      if (data.skills.length > 0) setSkillstemp2(data.skills.slice(0, 5));
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        const datePart = ex.dateRange ? ` - ${ex.dateRange}` : '';
        if (ex.role) setPost1temp2(ex.role.toUpperCase() + datePart);
        if (ex.company) setCompany1temp2(ex.company);
        if (ex.responsibilities.length > 0) setWorkdone1temp2(ex.responsibilities.slice(0, 3));
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        const datePart = ex.dateRange ? ` - ${ex.dateRange}` : '';
        if (ex.role) setPost2temp2(ex.role.toUpperCase() + datePart);
        if (ex.company) setCompany2temp2(ex.company);
        if (ex.responsibilities.length > 0) setWorkdone2temp2(ex.responsibilities.slice(0, 3));
      }
      if (data.experiences.length > 2) {
        const ex = data.experiences[2];
        const datePart = ex.dateRange ? ` - ${ex.dateRange}` : '';
        if (ex.role) setPost3temp2(ex.role.toUpperCase() + datePart);
        if (ex.company) setCompany3temp2(ex.company);
        if (ex.responsibilities.length > 0) setWorkdone3temp2(ex.responsibilities.slice(0, 3));
      }
      if (data.education.degree) setEducationtemp2(data.education.date ? `${data.education.degree} - ${data.education.date}` : data.education.degree);
      if (data.education.school) setUniversitytemp2(data.education.school);
      if (data.name) setNametemp2(data.name.replace(/^Name:\s*/i, "").toUpperCase());
    } else if (templateId === 3) {
      // For template 3, map directly from visible sidebar text sections with minimal guessing.
      const sourceText = typeof text === 'string' ? text : (enhancedResume || editableRefContent || '');
      const t3 = extractTemplate3Content(sourceText);

      // Clear placeholders so only provided content appears.
      setPosttemp3('');
      setPost2temp3('');
      setWorkdonetemp3('');
      setWorkdone2temp3('');
      setSkillstemp3('');
      setAwardstemp3(['', '', '', '']);

      if (data.contact?.phone) setPhone1temp3(data.contact.phone);
      if (data.contact?.email) setEmailtemp3(data.contact.email);
      if (data.contact?.address) setAddresstemp3(data.contact.address);
      if (data.contact?.linkedin) setWebsitetemp3(data.contact.linkedin);

      if (t3.name) setNametemp3(t3.name);
      else if (data.name) setNametemp3(data.name);
      if (t3.profession) setProfessiontemp3(t3.profession);
      else if (data.profession) setProfessiontemp3(data.profession);
      if (t3.skills) setSkillstemp3(t3.skills);
      if (t3.summaryHtml) setAbouttemp3(t3.summaryHtml);

      const awards = [...(t3.awards || [])];
      while (awards.length < 4) awards.push('');
      setAwardstemp3(awards.slice(0, 4));

      setPosttemp3(t3.post1 || '');
      setWorkdonetemp3(t3.work1Html || '');
      setPost2temp3(t3.post2 || '');
      setWorkdone2temp3(t3.work2Html || '');
      setEdu1temp3('');
      setEdu1desctemp3('');
      setEdu2temp3('');
      setEdu2desctemp3('');
      setEdu3temp3('');
      setEdu3desctemp3('');
      if (t3.edu1Title) setEdu1temp3(t3.edu1Title);
      if (t3.edu1Desc) setEdu1desctemp3(t3.edu1Desc);
      if (t3.edu2Title) setEdu2temp3(t3.edu2Title);
      if (t3.edu2Desc) setEdu2desctemp3(t3.edu2Desc);
      if (t3.edu3Title) setEdu3temp3(t3.edu3Title);
      if (t3.edu3Desc) setEdu3desctemp3(t3.edu3Desc);
      if (!t3.edu1Title && data.education.degree) {
        setEdu1temp3(data.education.date ? `${data.education.degree} (${data.education.date})` : data.education.degree);
      }
      if (!t3.edu1Desc && data.education.school) setEdu1desctemp3(data.education.school);
    } else if (templateId === 4) {
      const sourceTextT4 = typeof text === 'string' ? text : '';
      setSummarytemp4('');
      setCertstemp4(['', '']);
      setSkillstemp4([
        { name: "", level: 0 },
        { name: "", level: 0 },
        { name: "", level: 0 },
        { name: "", level: 0 },
        { name: "", level: 0 },
      ]);
      setLanguagesTemp4([
        { name: "", level: 0 },
        { name: "", level: 0 },
        { name: "", level: 0 },
      ]);
      if (data.profession) setProfessiontemp4(data.profession);
      if (data.summary) setSummarytemp4(plainToRichHtml(toReadableParagraph(data.summary)));
      let skillsT4 = (data.skills || []).filter(Boolean);
      if (skillsT4.length === 1 && (String(skillsT4[0]).match(/[,;]/g) || []).length >= 2) {
        skillsT4 = String(skillsT4[0])
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (skillsT4.length > 0) {
        setSkillstemp4(
          skillsT4.slice(0, 5).map((name, i) => ({ name: protectHyphensForT4(name), level: 90 - i * 5 }))
        );
      }
      const langsFromData = (data.languages || []).filter(Boolean);
      if (langsFromData.length > 0) {
        setLanguagesTemp4(langsFromData.slice(0, 3).map((name, i) => ({ name, level: 100 - i * 10 })));
      } else {
        const detectedLangs = extractLanguagesFromText(sourceTextT4, 3);
        if (detectedLangs.length > 0) {
          setLanguagesTemp4(detectedLangs.map((name, i) => ({ name, level: 100 - i * 10 })));
        }
      }
      if (data.contact?.phone) setPhonetemp4(data.contact.phone);
      if (data.contact?.email) setEmailtemp4(data.contact.email);
      if (data.contact?.address) setAddresstemp4(data.contact.address);
      else if (data.contact?.location) setAddresstemp4(data.contact.location);
      if (data.contact?.linkedin) setLinkedintemp4(data.contact.linkedin);
      const certItems = normalizeCertificationItems(data.certifications || [], 4);
      if (certItems.length > 0) {
        setCertstemp4(certItems);
      }
      const summaryBullets = splitParagraphToBullets(data.summary, 4);
      setPosttemp4('');
      setCompanytemp4('');
      setWorkdonetemp4([]);
      setPost2temp4('');
      setCompany2temp4('');
      setWorkdone2temp4([]);
      let hasMeaningfulEmployment = false;
      if (data.experiences.length > 0) {
        const ex = normalizeTemplate4Experience(
          data.experiences[0],
          data.profession || "Professional Experience",
          summaryBullets,
          data.summary || ''
        );
        if (ex.post) setPosttemp4(ex.post);
        if (ex.company) setCompanytemp4(ex.company);
        const w1 = template4BulletsToRichHtml(ex.bullets);
        if (w1.length > 0) {
          setWorkdonetemp4(w1);
          hasMeaningfulEmployment = true;
        }
        if (ex.post?.trim() || ex.company?.trim()) hasMeaningfulEmployment = true;
      }
      if (data.experiences.length > 1) {
        const ex = normalizeTemplate4Experience(
          data.experiences[1],
          "Professional Experience",
          summaryBullets,
          data.summary || ''
        );
        if (ex.post) setPost2temp4(ex.post);
        if (ex.company) setCompany2temp4(ex.company);
        const w2 = template4BulletsToRichHtml(ex.bullets);
        if (w2.length > 0) {
          setWorkdone2temp4(w2);
          hasMeaningfulEmployment = true;
        }
        if (ex.post?.trim() || ex.company?.trim()) hasMeaningfulEmployment = true;
      }
      if (!hasMeaningfulEmployment) {
        setPosttemp4("Please add your data");
        setCompanytemp4("");
        setWorkdonetemp4([plainToRichHtml("Please add your employment history details.")]);
        setPost2temp4("");
        setCompany2temp4("");
        setWorkdone2temp4([]);
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
    } else if (templateId === 6) {
      if (data.name) setNametemp6((data.name.toUpperCase?.() || data.name).trim());
      if (data.profession) setProfessiontemp6(data.profession);
      if (data.contact?.phone) setPhonetemp6(data.contact.phone);
      if (data.contact?.email) setEmailtemp6(data.contact.email);
      if (data.contact?.location) setLocationtemp6(data.contact.location);
      if (data.contact?.linkedin) setLinkedintemp6(data.contact.linkedin);
      if (data.summary) setProfileinfotemp6(data.summary);
      if (data.skills.length > 0) {
        const s = [...data.skills];
        while (s.length < 6) s.push('');
        setSkillstemp6(s.slice(0, 6));
      }
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        if (ex.role) setPost1temp6(ex.role);
        if (ex.company) setComapny1temp6(ex.company);
        if (ex.dateRange) setDate1temp6(ex.dateRange);
        if (ex.location) setCompany1locationtemp6(ex.location);
        const bullets = ex.responsibilities || [];
        const w1 = [...bullets.slice(0, 3)];
        while (w1.length < 3) w1.push('');
        setWorkdone1temp6(w1);
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        if (ex.role) setPost2temp6(ex.role);
        if (ex.company) setCompany2temp6(ex.company);
        if (ex.dateRange) setDate2temp6(ex.dateRange);
        if (ex.location) setCompany2locationtemp6(ex.location);
        const bullets = ex.responsibilities || [];
        const w2 = [...bullets.slice(0, 3)];
        while (w2.length < 3) w2.push('');
        setWorkdone2temp6(w2);
      }
      if (data.education.degree) setFacultytemp6(data.education.degree);
      if (data.education.school) setUniversitytemp6(data.education.school);
      if (data.education.date) setDatetemp6(data.education.date);
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
      if (data.name) setNametemp8(data.name.replace(/^Name:\s*/i, ''));
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
        setEdu1temp8((prev) => ({
          ...prev,
          degree: data.education.degree || prev.degree,
          school: data.education.school || prev.school,
          date: data.education.date || prev.date,
        }));
      }
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
      if (data.contact?.email) setEmailtemp13(data.contact.email);
      if (data.contact?.linkedin) setLinkedintemp13(data.contact.linkedin);
      if (data.contact?.location) setLocationtemp13(data.contact.location);
      if (data.summary) setSummarytemp13(data.summary);
      if (data.skills.length > 0) setSkillstemp13(data.skills.slice(0, 8));
      if (data.experiences.length > 0) { const ex = data.experiences[0]; if (ex.role) setPost1temp13(ex.role); if (ex.dateRange) setDate1temp13(ex.dateRange); if (ex.company) setCompany1temp13(ex.company); if (ex.location) setLocation1temp13(ex.location); if (ex.responsibilities.length > 0) setWorkdone1temp13(ex.responsibilities.slice(0, 5)); }
      if (data.experiences.length > 1) { const ex = data.experiences[1]; if (ex.role) setPost2temp13(ex.role); if (ex.dateRange) setDate2temp13(ex.dateRange); if (ex.company) setCompany2temp13(ex.company); if (ex.location) setLocation2temp13(ex.location); if (ex.responsibilities.length > 0) setWorkdone2temp13(ex.responsibilities.slice(0, 4)); }
      if (data.education.degree) setFacultytemp13(data.education.degree);
      if (data.education.date) setDateedutemp13(data.education.date);
      if (data.education.school) setUniversitytemp13(data.education.school);
      if (data.certifications?.length) setCertificationstemp13(data.certifications.slice(0, 3).map(c => typeof c === 'string' ? { title: c, issuer: '' } : { title: c.name || c.title || c, issuer: c.issuer || c.provider || '' }));
    } else if (templateId === 14) {
      if (data.name) {
        const parts = data.name.trim().split(/\s+/);
        if (parts.length >= 2) {
          setFirstnametemp14(parts[0].toUpperCase());
          setLastnametemp14(parts.slice(1).join(' ').toUpperCase());
        } else if (parts.length === 1) {
          setFirstnametemp14(parts[0].toUpperCase());
        }
      }
      if (data.contact?.location) setLocationtemp14(data.contact.location);
      if (data.contact?.phone) setPhonetemp14(data.contact.phone);
      if (data.contact?.email) setEmailtemp14(data.contact.email);
      if (data.summary) setSummarytemp14(data.summary);
      if (data.skills.length > 0) setSkillstemp14(data.skills.slice(0, 8));
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        if (ex.role) setPost1temp14(ex.role);
        if (ex.dateRange) setDate1temp14(ex.dateRange);
        if (ex.company) setCompany1temp14(ex.company);
        const w1 = [...(ex.responsibilities || []).slice(0, 5)];
        while (w1.length < 5) w1.push('');
        setWorkdone1temp14(w1);
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        if (ex.role) setPost2temp14(ex.role);
        if (ex.dateRange) setDate2temp14(ex.dateRange);
        if (ex.company) setCompany2temp14(ex.company);
        const w2 = [...(ex.responsibilities || []).slice(0, 5)];
        while (w2.length < 5) w2.push('');
        setWorkdone2temp14(w2);
      }
      if (data.education.degree) setFacultytemp14(data.education.degree);
      if (data.education.school) setUniversitytemp14(data.education.school + (data.education.location ? ` - ${data.education.location}` : ''));
      if (data.experiences.length > 2) {
        const ex = data.experiences[2];
        if (ex.role) setPost3temp14(ex.role);
        if (ex.dateRange) setDate3temp14(ex.dateRange);
        if (ex.company) setCompany3temp14(ex.company);
        const w3 = [...(ex.responsibilities || []).slice(0, 5)];
        while (w3.length < 3) w3.push('');
        setWorkdone3temp14(w3);
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
    } else if (templateId === 15) {
      if (data.name) setNametemp15(data.name.toUpperCase());
      if (data.contact?.phone) setPhonetemp15(data.contact.phone);
      if (data.contact?.email) setEmailtemp15(data.contact.email);
      if (data.contact?.location) setLocationtemp15(data.contact.location);
      if (data.contact?.linkedin) setLinkedintemp15(data.contact.linkedin);
      if (data.summary) setSummarytemp15(data.summary);
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        if (ex.role) setPost1temp15(ex.role);
        if (ex.dateRange) setDate1temp15(ex.dateRange);
        if (ex.company) setCompany1temp15(ex.company);
        if (ex.location) setLocation1temp15(ex.location);
        if (ex.responsibilities.length > 0) setWorkdone1temp15(ex.responsibilities.slice(0, 5));
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        if (ex.role) setPost2temp15(ex.role);
        if (ex.dateRange) setDate2temp15(ex.dateRange);
        if (ex.company) setCompany2temp15(ex.company);
        if (ex.location) setLocation2temp15(ex.location);
        if (ex.responsibilities.length > 0) setWorkdone2temp15(ex.responsibilities.slice(0, 5));
      }
      if (data.education.school) setUniversitytemp15(data.education.school);
      if (data.education.location) setLocationedutemp15(data.education.location);
      if (data.education.date) setDateedutemp15(data.education.date);
      if (data.education.degree) setDegreetemp15(data.education.degree);
      if (data.skills.length > 0) setTechnicalSkillstemp15(data.skills.slice(0, 8).join(', '));
    } else if (templateId === 16) {
      if (data.name) setNametemp16(data.name.toUpperCase());
      if (data.summary) setProfiletemp16(data.summary);
      if (data.skills.length > 0) {
        const s = [...data.skills];
        while (s.length < 9) s.push('');
        setSkillstemp16(s.slice(0, 9));
      }
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        if (ex.company) setCompany1temp16(ex.company);
        if (ex.role) setPost1temp16(ex.role);
        if (ex.dateRange) setDate1temp16(ex.dateRange);
        if (ex.responsibilities.length > 0) {
          setWorkdesc1temp16(ex.responsibilities[0]);
          setWorkdone1temp16(ex.responsibilities.slice(1, 4));
        }
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        if (ex.company) setCompany2temp16(ex.company);
        if (ex.role) setPost2temp16(ex.role);
        if (ex.dateRange) setDate2temp16(ex.dateRange);
        if (ex.responsibilities.length > 0) {
          setWorkdesc2temp16(ex.responsibilities[0]);
          setWorkdone2temp16(ex.responsibilities.slice(1, 3));
        }
      }
      if (data.education.school) setUniversitytemp16(data.education.school);
      if (data.education.degree) setFacultytemp16(data.education.degree);
      if (data.education.date) setYear16temp16(data.education.date);
    } else {
      setApplyFeedback('Could not apply: unsupported template.');
      setTimeout(() => setApplyFeedback(''), 4000);
      return false;
    }
    setApplyFeedback('Content applied to template!');
    setTimeout(() => setApplyFeedback(''), 3000);
    return true;
  };

  const handleCopyToTemplate = async () => {
    if (isApplyingToTemplate) return;
    setIsApplyingToTemplate(true);
    setApplyFeedback('');
    const delayMs = 2500;
    await new Promise((r) => setTimeout(r, delayMs));
    try {
      applyEditedContentToTemplate(editableRefContentRef.current);
    } finally {
      setIsApplyingToTemplate(false);
    }
  };

  useEffect(() => {
    if (!templateId) return;
    if (PREMIUM_TEMPLATE_IDS.includes(templateId) && !isPremium) {
      navigate("/payment", { state: { product: "premiumTemplates", message: "Pay NRS 250 to use this premium template." } });
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

    // Enhanced download function — visual templates use html2canvas for PDF/PNG; others use text jsPDF for PDF
    const handleDownload = async (format = 'pdf', useEditableFilename = false) => {
      // PDFs that mirror the on-screen layout (html2canvas) — same look as the editor (incl. Template 2 two-column design)
      const pdfUsesHtml2Canvas = VISUAL_PDF_TEMPLATE_IDS.includes(templateId);
      const useVisualPdf = format === 'pdf' && pdfUsesHtml2Canvas;

      if (!cvRef.current && (format === 'png' || useVisualPdf)) {
        alert('CV content not found. Please try again.');
        return;
      }

      // PDF: listed templates use html2canvas (WYSIWYG); remaining templates use programmatic jsPDF (plain text layout)
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

      // PNG or visual PDF: html2canvas for pixel-perfect capture
      setIsDownloading(true);
      setDownloadProgress(10);

      let contentEditableBackups = new Map();
      let template7RightBackup = null;
      let template1Backups = [];
      let template10Backups = [];
      let template11Backups = [];
      let template2Backups = [];
      let template4Backups = [];
      let template12Backups = [];
      let template13Backups = [];
      let template14AncestorBackups = [];
      try {
        // Find the actual template content (might be nested) — CV only, not the enhanced reference sidebar
        let element = cvRef.current;
        // Template 4: always capture [data-template4] only — capturing the outer cvRef wrapper
        // makes html2canvas use a huge canvas with the CV in a corner (tiny preview on the PDF).
        if (templateId === 4) {
          const t4Root = cvRef.current?.querySelector('[data-template4]');
          if (t4Root) element = t4Root;
        }

        // If the ref is on a wrapper, find the actual template div
        const template1El = templateId === 1 ? element.querySelector('[data-template1]') : null;
        const template2El = templateId === 2 ? element.querySelector('[data-template2]') : null;
        const template10El = templateId === 10 ? element.querySelector('[data-template10]') : null;
        const template11El = templateId === 11 ? element.querySelector('[data-template11]') : null;
        const template12El = templateId === 12 ? element.querySelector('[data-template12]') : null;
        const template13El = templateId === 13 ? element.querySelector('[data-template13]') : null;
        const template14El = templateId === 14 ? element.querySelector('[data-template14]') : null;
        const template15El = templateId === 15 ? element.querySelector('[data-template15]') : null;
        const template16El = templateId === 16 ? element.querySelector('[data-template16]') : null;
        // querySelector does not match the element itself — if we already narrowed to [data-template4], use it
        const template4El =
          templateId === 4
            ? element.hasAttribute?.('data-template4')
              ? element
              : element.querySelector('[data-template4]')
            : null;
        const templateDiv = template1El || template2El || template4El || template10El || template11El || template12El || template13El || template14El || template15El || template16El || element.querySelector('div[style*="height"], div[class*="max-w"]');
        if (templateDiv && templateDiv !== element) {
          // Check if templateDiv is a direct child or nested
          const isDirectChild = Array.from(element.children).includes(templateDiv);
          if (isDirectChild || templateDiv.offsetHeight > 500) {
            element = templateDiv;
          }
        }
        // Scroll into view so html2canvas captures correctly
        if ((templateId === 1 || templateId === 2 || templateId === 4 || templateId === 10 || templateId === 11 || templateId === 12 || templateId === 13 || templateId === 14 || templateId === 15 || templateId === 16) && element) {
          element.scrollIntoView({ behavior: 'instant', block: 'start' });
          await new Promise(resolve => setTimeout(resolve, 150));
          // Template 14: also scroll to end so education section at bottom is fully laid out
          if (templateId === 14) {
            element.scrollIntoView({ behavior: 'instant', block: 'end' });
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        // Store original styles to restore later
        const originalStyles = {
          border: element.style.border,
          boxShadow: element.style.boxShadow,
          overflow: element.style.overflow,
          height: element.style.height,
          maxHeight: element.style.maxHeight,
          minHeight: element.style.minHeight,
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
        element.style.minHeight = (templateId === 1 || templateId === 2 || templateId === 4 || templateId === 10 || templateId === 11 || templateId === 12 || templateId === 13 || templateId === 14 || templateId === 15 || templateId === 16) ? '0' : element.style.minHeight; // avoid fixed min-height clipping / blank PDF pages
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
              // Template 4: do not strip heights inside header band — html2canvas can hide name/title behind shapes
              if (templateId === 4 && childElement.closest?.('[data-template4-header-row]')) {
                if (childElement.hasAttribute('data-template4-header-row')) {
                  // Taller than h-24 so name + title are never clipped in html2canvas
                  childElement.style.minHeight = '132px';
                  childElement.style.height = 'auto';
                  childElement.style.overflow = 'visible';
                }
              } else {
                childElement.style.height = 'auto';
              }
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

        // Wait for webfonts (Tailwind/system stack) so PDF text metrics match the editor
        if (typeof document !== 'undefined' && document.fonts?.ready) {
          try {
            await document.fonts.ready;
          } catch {
            /* ignore */
          }
        }
        
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
          // Template 16 profile & work desc: full width so PDF matches editor
          if (templateId === 16 && (el.hasAttribute('data-template16-profile') || el.hasAttribute('data-template16-workdesc'))) {
            el.style.width = '100%';
            el.style.minWidth = '100%';
            el.style.maxWidth = '100%';
            el.style.flex = 'none';
            return;
          }
          // Template 2 Summary: sibling <h3> is full-width — generic math leaves ~0px; use inner column width (minus padding)
          if (templateId === 2 && el.hasAttribute('data-template2-summary')) {
            const col = el.closest('[data-template2-right]');
            let inner = 0;
            if (col) {
              const cs = getComputedStyle(col);
              const pl = parseFloat(cs.paddingLeft) || 0;
              const pr = parseFloat(cs.paddingRight) || 0;
              inner = (col.clientWidth || col.offsetWidth) - pl - pr;
            }
            if (inner < 200) {
              const t2 = el.closest('[data-template2]');
              const flexRow = t2?.querySelector(':scope > div.flex');
              const rightCol = flexRow?.children?.[2];
              if (rightCol) {
                const cs2 = getComputedStyle(rightCol);
                const pl2 = parseFloat(cs2.paddingLeft) || 0;
                const pr2 = parseFloat(cs2.paddingRight) || 0;
                inner = (rightCol.clientWidth || rightCol.offsetWidth) - pl2 - pr2;
              }
            }
            const pw = Math.max(280, inner - 4);
            el.style.width = `${pw}px`;
            el.style.minWidth = `${pw}px`;
            el.style.maxWidth = `${pw}px`;
            el.style.boxSizing = 'border-box';
            el.style.display = 'block';
            el.style.flex = 'none';
            return;
          }
          // Template 4 (Corporate Standard): RichText in flex-1 main column — avoid ~0 width in PDF capture
          if (templateId === 4 && el.closest('[data-template4]')) {
            const mainCol = el.closest('.flex-1') || el.closest('[class*="flex-1"]');
            let inner = 0;
            if (mainCol) {
              const cs = getComputedStyle(mainCol);
              const pl = parseFloat(cs.paddingLeft) || 0;
              const pr = parseFloat(cs.paddingRight) || 0;
              inner = (mainCol.clientWidth || mainCol.offsetWidth) - pl - pr;
            }
            const pw = Math.max(200, inner - 4);
            el.style.width = `${pw}px`;
            el.style.minWidth = `${pw}px`;
            el.style.maxWidth = `${pw}px`;
            el.style.boxSizing = 'border-box';
            el.style.display = 'block';
            el.style.flex = 'none';
            return;
          }
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

        // Template 4: Corporate Standard — lock width + flex columns so PDF matches preview (max-w-4xl ≈ 896px)
        if (templateId === 4) {
          const t4 = element.querySelector('[data-template4]') || element;
          const targetW = 896;
          template4Backups.push({
            el: t4,
            props: ['width', 'minWidth', 'maxWidth', 'marginLeft', 'marginRight', 'minHeight', 'height', 'boxSizing'],
            vals: [t4.style.width, t4.style.minWidth, t4.style.maxWidth, t4.style.marginLeft, t4.style.marginRight, t4.style.minHeight, t4.style.height, t4.style.boxSizing],
          });
          t4.style.width = `${targetW}px`;
          t4.style.minWidth = `${targetW}px`;
          t4.style.maxWidth = `${targetW}px`;
          t4.style.marginLeft = 'auto';
          t4.style.marginRight = 'auto';
          t4.style.boxSizing = 'border-box';
          t4.style.height = 'auto';
          const bodyRow = t4.querySelector('[data-template4-body]') || t4.querySelector(':scope > div.grid') || t4.querySelector(':scope > div.flex');
          if (bodyRow) {
            template4Backups.push({
              el: bodyRow,
              props: ['display', 'flexDirection', 'alignItems', 'width', 'gridTemplateColumns', 'minHeight'],
              vals: [
                bodyRow.style.display,
                bodyRow.style.flexDirection,
                bodyRow.style.alignItems,
                bodyRow.style.width,
                bodyRow.style.gridTemplateColumns,
                bodyRow.style.minHeight,
              ],
            });
            const kids = [...bodyRow.children];
            const leftCol = kids[0];
            const rightCol = kids[1];
            const totalW = targetW;
            const leftW = Math.round(totalW / 3);
            const rightW = Math.max(400, totalW - leftW);
            const applyCol = (col, w, isLeft) => {
              if (!col) return;
              template4Backups.push({
                el: col,
                props: ['width', 'minWidth', 'maxWidth', 'flex', 'flexShrink', 'gridColumn'],
                vals: [col.style.width, col.style.minWidth, col.style.maxWidth, col.style.flex, col.style.flexShrink, col.style.gridColumn],
              });
              if (isLeft) {
                col.style.flex = `0 0 ${w}px`;
                col.style.width = `${w}px`;
                col.style.minWidth = `${w}px`;
                col.style.maxWidth = `${w}px`;
                col.style.flexShrink = '0';
              } else {
                col.style.flex = '1 1 auto';
                col.style.minWidth = '0';
                col.style.width = `${w}px`;
                col.style.maxWidth = 'none';
              }
            };
            bodyRow.style.display = 'flex';
            bodyRow.style.flexDirection = 'row';
            bodyRow.style.alignItems = 'stretch';
            bodyRow.style.width = '100%';
            bodyRow.style.gridTemplateColumns = '';
            bodyRow.style.minHeight = '';
            applyCol(leftCol, leftW, true);
            applyCol(rightCol, rightW, false);
            void element.offsetHeight;
            await new Promise(resolve => setTimeout(resolve, 40));
          }
          // At least one A4 page tall at 896px width so PDF fills the sheet (sidebar stretches with grid)
          const a4MinPx = Math.ceil(targetW * (297 / 210));
          const naturalH = t4.scrollHeight || t4.offsetHeight;
          t4.style.minHeight = `${Math.max(naturalH + 24, a4MinPx)}px`;
          const headerRowLive = t4.querySelector('[data-template4-header-row]');
          if (headerRowLive) {
            template4Backups.push({
              el: headerRowLive,
              props: ['height', 'minHeight', 'overflow'],
              vals: [headerRowLive.style.height, headerRowLive.style.minHeight, headerRowLive.style.overflow],
            });
            headerRowLive.style.height = 'auto';
            headerRowLive.style.minHeight = '132px';
            headerRowLive.style.overflow = 'visible';
          }
          void element.offsetHeight;
          await new Promise(resolve => setTimeout(resolve, 40));
        }

        // Template 2: html2canvas needs explicit two-column widths (Classic Elegant / max-w-3xl)
        if (templateId === 2) {
          const t2 = element.querySelector('[data-template2]') || element;
          template2Backups.push({
            el: t2,
            props: ['width', 'minWidth', 'maxWidth', 'height'],
            vals: [t2.style.width, t2.style.minWidth, t2.style.maxWidth, t2.style.height],
          });
          t2.style.width = '768px';
          t2.style.minWidth = '768px';
          t2.style.maxWidth = '768px';
          t2.style.height = 'auto';
          const flexRow = t2.querySelector(':scope > div.flex');
          if (flexRow) {
            template2Backups.push({
              el: flexRow,
              props: ['width', 'display'],
              vals: [flexRow.style.width, flexRow.style.display],
            });
            flexRow.style.width = '100%';
            flexRow.style.display = 'flex';
            const rowKids = [...flexRow.children];
            const leftCol = rowKids[0];
            const rightCol = rowKids[2];
            if (leftCol) {
              template2Backups.push({
                el: leftCol,
                props: ['width', 'minWidth', 'maxWidth', 'flex', 'flexShrink'],
                vals: [leftCol.style.width, leftCol.style.minWidth, leftCol.style.maxWidth, leftCol.style.flex, leftCol.style.flexShrink],
              });
              leftCol.style.width = '256px';
              leftCol.style.minWidth = '256px';
              leftCol.style.maxWidth = '256px';
              leftCol.style.flex = 'none';
              leftCol.style.flexShrink = '0';
            }
            if (rightCol) {
              template2Backups.push({
                el: rightCol,
                props: ['flex', 'minWidth', 'maxWidth', 'width', 'flexShrink', 'boxSizing'],
                vals: [rightCol.style.flex, rightCol.style.minWidth, rightCol.style.maxWidth, rightCol.style.width, rightCol.style.flexShrink, rightCol.style.boxSizing],
              });
              const rightW = 768 - 256 - 1;
              rightCol.style.flex = 'none';
              rightCol.style.flexShrink = '0';
              rightCol.style.minWidth = `${rightW}px`;
              rightCol.style.width = `${rightW}px`;
              rightCol.style.maxWidth = `${rightW}px`;
              rightCol.style.boxSizing = 'border-box';
            }
          }
          void element.offsetHeight;
          await new Promise((resolve) => setTimeout(resolve, 80));
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

        // Template 11: pre-capture layout fix so PDF matches editor
        if (templateId === 11) {
          const t11 = element.querySelector('[data-template11]') || element;
          template11Backups.push({ el: t11, props: ['width', 'minWidth'], vals: [t11.style.width, t11.style.minWidth] });
          t11.style.width = '768px';
          t11.style.minWidth = '768px';
          const leftCol = t11.querySelector('[data-template11-left]');
          if (leftCol) {
            template11Backups.push({ el: leftCol, props: ['width', 'minWidth', 'flex'], vals: [leftCol.style.width, leftCol.style.minWidth, leftCol.style.flex] });
            leftCol.style.width = '256px';
            leftCol.style.minWidth = '256px';
            leftCol.style.flex = 'none';
          }
          const rightCol = leftCol?.nextElementSibling;
          if (rightCol) {
            template11Backups.push({ el: rightCol, props: ['flex', 'minWidth'], vals: [rightCol.style.flex, rightCol.style.minWidth] });
            rightCol.style.flex = '1';
            rightCol.style.minWidth = '400px';
          }
          void element.offsetHeight;
          await new Promise(resolve => setTimeout(resolve, 80));
        }

        // Template 12: pre-capture layout fix so PDF matches editor (two-column: left 2/3, right 1/3)
        if (templateId === 12) {
          const t12 = element.querySelector('[data-template12]') || element;
          template12Backups.push({ el: t12, props: ['width', 'minWidth'], vals: [t12.style.width, t12.style.minWidth] });
          t12.style.width = '768px';
          t12.style.minWidth = '768px';
          t12.style.overflow = 'visible';
          const leftCol = t12.querySelector('[data-template12-left]');
          const rightCol = t12.querySelector('[data-template12-right]');
          if (leftCol) {
            template12Backups.push({ el: leftCol, props: ['flex', 'minWidth'], vals: [leftCol.style.flex, leftCol.style.minWidth] });
            leftCol.style.flex = '1';
            leftCol.style.minWidth = '400px';
            leftCol.style.overflow = 'visible';
          }
          if (rightCol) {
            template12Backups.push({ el: rightCol, props: ['flex', 'minWidth'], vals: [rightCol.style.flex, rightCol.style.minWidth] });
            rightCol.style.flex = 'none';
            rightCol.style.minWidth = '220px';
          }
          // Work experience: ensure section expands and shows full content
          const workSection = t12.querySelector('[data-template12-work]');
          if (workSection) workSection.style.overflow = 'visible';
          void element.offsetHeight;
          await new Promise(resolve => setTimeout(resolve, 80));
        }

        // Template 13: pre-capture layout fix so PDF matches editor (two-column: left ~65%, right ~35%)
        if (templateId === 13) {
          const t13 = element.querySelector('[data-template13]') || element;
          template13Backups.push({ el: t13, props: ['width', 'minWidth'], vals: [t13.style.width, t13.style.minWidth] });
          t13.style.width = '768px';
          t13.style.minWidth = '768px';
          t13.style.overflow = 'visible';
          const cols = t13.querySelector('.flex');
          if (cols) {
            const leftCol = cols.children[0];
            const rightCol = cols.children[1];
            if (leftCol) {
              template13Backups.push({ el: leftCol, props: ['flex', 'minWidth'], vals: [leftCol.style.flex, leftCol.style.minWidth] });
              leftCol.style.flex = '1';
              leftCol.style.minWidth = '400px';
              leftCol.style.overflow = 'visible';
            }
            if (rightCol) {
              template13Backups.push({ el: rightCol, props: ['width', 'minWidth'], vals: [rightCol.style.width, rightCol.style.minWidth] });
              rightCol.style.width = '268px';
              rightCol.style.minWidth = '200px';
              rightCol.style.flex = 'none';
            }
          }
          void element.offsetHeight;
          await new Promise(resolve => setTimeout(resolve, 80));
        }

        // Template 14: pre-capture layout fix - ensure full content (Education, Skills) is captured
        if (templateId === 14) {
          const t14 = element.querySelector('[data-template14]') || element;
          t14.style.width = '768px';
          t14.style.minWidth = '768px';
          t14.style.height = 'auto';
          t14.style.minHeight = '0';
          t14.style.maxHeight = 'none';
          t14.style.overflow = 'visible';
          // Ensure all ancestors allow full content to be visible (no clipping)
          let parent = t14.parentElement;
          while (parent && parent !== document.body) {
            template14AncestorBackups.push({
              el: parent,
              overflow: parent.style.overflow,
              overflowY: parent.style.overflowY,
              maxHeight: parent.style.maxHeight
            });
            const cs = getComputedStyle(parent);
            if (cs.overflow === 'hidden' || cs.overflow === 'auto' || cs.overflowY === 'hidden' || cs.overflowY === 'auto') {
              parent.style.overflow = 'visible';
              parent.style.overflowY = 'visible';
            }
            if (cs.maxHeight && cs.maxHeight !== 'none') {
              parent.style.maxHeight = 'none';
            }
            parent = parent.parentElement;
          }
          void element.offsetHeight;
          await new Promise(resolve => setTimeout(resolve, 150));
        }

        // Template 15: pre-capture layout fix (single-column, fixed width)
        if (templateId === 15) {
          const t15 = element.querySelector('[data-template15]') || element;
          t15.style.width = '672px';
          t15.style.minWidth = '672px';
          t15.style.height = 'auto';
          t15.style.minHeight = '0';
          t15.style.maxHeight = 'none';
          t15.style.overflow = 'visible';
          void element.offsetHeight;
          await new Promise(resolve => setTimeout(resolve, 80));
        }

        // Template 1: print width + A4 min height so PDF has no white band under short content
        if (templateId === 1) {
          const t1 = element.matches?.('[data-template1]') ? element : element.querySelector('[data-template1]');
          if (t1) {
            const targetW = 900;
            template1Backups.push({
              el: t1,
              props: ['width', 'minWidth', 'maxWidth', 'marginLeft', 'marginRight', 'minHeight'],
              vals: [t1.style.width, t1.style.minWidth, t1.style.maxWidth, t1.style.marginLeft, t1.style.marginRight, t1.style.minHeight],
            });
            t1.style.width = `${targetW}px`;
            t1.style.minWidth = `${targetW}px`;
            t1.style.maxWidth = 'none';
            t1.style.marginLeft = '0';
            t1.style.marginRight = '0';
            t1.style.boxSizing = 'border-box';
            void t1.offsetHeight;
            const a4MinPx = Math.ceil(t1.offsetWidth * (297 / 210));
            const naturalH = t1.scrollHeight;
            const targetMinH = Math.max(naturalH + 32, a4MinPx);
            t1.style.minHeight = `${targetMinH}px`;
            const innerFlex = t1.firstElementChild;
            if (innerFlex?.classList?.contains('flex')) {
              template1Backups.push({
                el: innerFlex,
                props: ['width', 'minWidth', 'minHeight', 'alignItems'],
                vals: [innerFlex.style.width, innerFlex.style.minWidth, innerFlex.style.minHeight, innerFlex.style.alignItems],
              });
              innerFlex.style.width = '100%';
              innerFlex.style.minWidth = '100%';
              innerFlex.style.minHeight = `${targetMinH}px`;
              innerFlex.style.alignItems = 'stretch';
            }
            void t1.offsetHeight;
            await new Promise((r) => setTimeout(r, 80));
          }
        }

        // Template 10: pre-capture layout fix so PDF matches editor
        if (templateId === 10) {
          const t10 = element.querySelector('[data-template10]') || element;
          const targetW = 768;
          template10Backups.push({ el: t10, props: ['width', 'minWidth', 'maxWidth'], vals: [t10.style.width, t10.style.minWidth, t10.style.maxWidth] });
          t10.style.width = targetW + 'px';
          t10.style.minWidth = targetW + 'px';
          t10.style.maxWidth = targetW + 'px';
          t10.querySelectorAll('[data-template10-skillbar]').forEach((track) => {
            const fill = track.firstElementChild;
            const fillWidthOrig = fill?.style?.width || '';
            template10Backups.push({ el: track, props: ['minWidth', 'width', 'flex'], vals: [track.style.minWidth, track.style.width, track.style.flex] });
            if (fill) template10Backups.push({ el: fill, props: ['width'], vals: [fillWidthOrig] });
            track.style.minWidth = '180px';
            track.style.width = '180px';
            track.style.flex = '1';
            if (fill) {
              const pct = parseFloat(String(fillWidthOrig || '0')) || 0;
              fill.style.width = Math.round(180 * pct / 100) + 'px';
            }
          });
          void element.offsetHeight;
          await new Promise(resolve => setTimeout(resolve, 80));
        }

        // Get the actual content dimensions (including overflow)
        let contentWidth = Math.max(
          element.scrollWidth,
          element.offsetWidth,
          element.clientWidth
        );
        let contentHeight = Math.max(
          element.scrollHeight,
          element.offsetHeight,
          element.clientHeight
        );
        // Template 14: add buffer to ensure Education & Skills at bottom are fully captured
        if (templateId === 14) {
          contentHeight = Math.max(contentHeight, element.scrollHeight) + 20;
        }
        // Template 15: add buffer for full content
        if (templateId === 15) {
          contentHeight = Math.max(contentHeight, element.scrollHeight) + 20;
        }
        if (templateId === 1) {
          contentHeight = Math.max(contentHeight, element.scrollHeight) + 32;
        }
        if (templateId === 2) {
          contentHeight = Math.max(contentHeight, element.scrollHeight) + 24;
        }

        // Template 1: use exact layout width (not scrollWidth) so html2canvas has no white side gutters
        if (templateId === 1) {
          const rw = Math.round(element.getBoundingClientRect().width);
          if (rw > 0) contentWidth = rw;
        }
        if (templateId === 2) {
          const rw2 = Math.round(element.getBoundingClientRect().width);
          if (rw2 > 0) contentWidth = rw2;
        }
        if (templateId === 4) {
          const rw4 = Math.round(
            Math.max(element.offsetWidth || 0, element.getBoundingClientRect().width || 0)
          );
          contentWidth = rw4 > 0 ? rw4 : 896;
          contentHeight = Math.max(
            element.scrollHeight,
            element.offsetHeight,
            element.clientHeight
          ) + 32;
        }

        // High-quality canvas capture - match edit menu appearance
        // Template 4: do NOT pass width/height/windowWidth/windowHeight — if they exceed the
        // painted element bounds, html2canvas creates an oversized canvas and the CV sits in a corner.
        const canvas = await html2canvas(element, {
          scale: 3, // Balance quality vs memory (4 can cause issues on long templates)
          useCORS: true,
          allowTaint: false,
          backgroundColor: templateId === 1 ? '#000000' : '#ffffff',
          logging: false,
          ...(templateId === 4
            ? {}
            : {
                width: contentWidth,
                height: contentHeight,
                windowWidth: contentWidth,
                windowHeight: contentHeight,
              }),
          scrollX: 0,
          scrollY: 0,
          removeContainer: false,
          imageTimeout: 20000,
          foreignObjectRendering: false, // false = more consistent cross-browser (true can help positioning but varies)
          onclone: (clonedDoc, clonedElement) => {
            // Inject styles so clone matches edit menu (html2canvas may not inherit all CSS)
            const styleEl = clonedDoc.createElement('style');
            styleEl.textContent = `
              [data-template14] { font-family: Helvetica, Arial, sans-serif !important; }
              [data-template14-section] { font-size: 1.1rem !important; font-weight: 400 !important; color: #000 !important; }
              [data-template14-contact] { background: #000 !important; color: #fff !important; }
              [data-template14-education] input, [data-template14-education] div { font-weight: bold !important; }
              ${
                templateId === 4
                  ? `
              [data-template4], [data-template4] * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              [data-template4] { -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision; }
              [data-template4] [contenteditable="true"] {
                word-break: normal !important;
                overflow-wrap: anywhere !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
              }
              [data-template4] .flex.gap-2.items-start { align-items: flex-start !important; }
              [data-template4-header-row] {
                position: relative !important;
                overflow: visible !important;
                isolation: isolate !important;
                min-height: 132px !important;
                height: auto !important;
              }
              [data-template4-header-bg="left"] {
                background-color: #e5e7eb !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              [data-template4-header-bg="right"] {
                background-color: #2563eb !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              [data-template4-header-content] {
                position: relative !important;
                z-index: 50 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              [data-template4-header-row] > div.absolute { z-index: 0 !important; pointer-events: none !important; }
              [data-template4-header-print] { position: relative !important; z-index: 60 !important; color: inherit !important; }
              [data-template4] input[data-template4-contact],
              [data-template4] textarea[data-template4-contact],
              [data-template4] input[data-template4-skill-name],
              [data-template4] input[data-template4-lang-name] {
                overflow-wrap: anywhere !important;
                word-break: normal !important;
                max-width: 100% !important;
              }
            `
                  : ''
              }
            `;
            clonedDoc.head.appendChild(styleEl);

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
              // Template 4: show skill/language level numbers (otherwise generic handler hides number inputs)
              if (templateId === 4 && input.type === 'number' && input.closest('[data-template4]')) {
                const span = clonedDoc.createElement('span');
                span.textContent = input.value ?? '0';
                span.style.cssText =
                  'font-size:12px;color:rgba(255,255,255,0.95);width:2.25rem;min-width:2.25rem;flex-shrink:0;text-align:right;font-variant-numeric:tabular-nums;display:inline-block;';
                input.parentNode.replaceChild(span, input);
                return;
              }
              // Template 4: flex-1 min-w-0 collapses to ~0px in html2canvas — skill/lang names vanish; hyphens break words badly
              if (templateId === 4 && input.type === 'text' && input.closest('[data-template4]')) {
                const hyphenSafe = (v) =>
                  String(v || '').replace(/([a-zA-Z0-9])-([a-zA-Z0-9])/g, '$1\u2011$2');
                if (input.hasAttribute('data-template4-skill-name') || input.hasAttribute('data-template4-lang-name')) {
                  const div = clonedDoc.createElement('div');
                  div.textContent = hyphenSafe(input.value);
                  div.className = input.className;
                  div.style.cssText =
                    'display:block;flex:1 1 auto;min-width:0;max-width:100%;font-size:0.875rem;line-height:1.4;color:rgba(255,255,255,0.95);word-break:normal;overflow-wrap:anywhere;white-space:normal;background:transparent;border:none;outline:none;';
                  input.parentNode.replaceChild(div, input);
                  return;
                }
                if (input.hasAttribute('data-template4-contact')) {
                  const div = clonedDoc.createElement('div');
                  div.textContent = hyphenSafe(input.value);
                  div.className = input.className;
                  div.style.cssText =
                    'display:block;width:100%;min-width:0;margin-bottom:0.5rem;font-size:0.875rem;line-height:1.4;color:rgba(255,255,255,0.95);word-break:normal;overflow-wrap:anywhere;white-space:normal;background:transparent;border:none;outline:none;';
                  input.parentNode.replaceChild(div, input);
                  return;
                }
                if (input.hasAttribute('data-template4-header')) {
                  const div = clonedDoc.createElement('div');
                  div.textContent = hyphenSafe(input.value);
                  div.className = input.className;
                  const role = String(input.getAttribute('data-template4-header') || '').toLowerCase();
                  const isName = role === 'name' || (role !== 'title' && input.placeholder === 'NAME');
                  div.setAttribute('data-template4-header-print', isName ? 'name' : 'title');
                  div.style.cssText = isName
                    ? 'display:block;width:100%;text-align:center;font-size:1.5rem;font-weight:700;line-height:1.3;color:#111827;text-transform:uppercase;background:transparent;border:none;outline:none;word-break:normal;overflow-wrap:anywhere;white-space:normal;position:relative;z-index:60;visibility:visible;opacity:1;min-height:1.4em;padding-bottom:2px;'
                    : 'display:block;width:100%;text-align:center;font-size:1rem;line-height:1.35;color:#374151;margin-top:0.35rem;background:transparent;border:none;outline:none;word-break:normal;overflow-wrap:anywhere;white-space:normal;position:relative;z-index:60;visibility:visible;opacity:1;min-height:1.25em;';
                  input.parentNode.replaceChild(div, input);
                  return;
                }
              }
              // Number inputs: Template 10 skill levels show value; others hide (progress bar shows it)
              if (input.type === 'number') {
                const inTemplate10Skills = templateId === 10 && input.closest('[data-template10]');
                if (inTemplate10Skills) {
                  const span = clonedDoc.createElement('span');
                  span.textContent = input.value || '0';
                  span.style.cssText = 'font-size:12px;color:#6b7280;width:2rem;flex-shrink:0;text-align:right;font-variant-numeric:tabular-nums;';
                  input.parentNode.replaceChild(span, input);
                } else {
                  const empty = clonedDoc.createElement('div');
                  empty.style.cssText = 'width:0;min-width:0;overflow:hidden;flex-shrink:0;';
                  input.parentNode.replaceChild(empty, input);
                }
                return;
              }
              // Template 10 skill names: fixed width so bars stay adjacent (replaceWithDiv uses 100% which pushes bars right)
              if (templateId === 10 && input.hasAttribute('data-template10-skillname')) {
                const div = clonedDoc.createElement('div');
                div.textContent = input.value || '';
                div.className = input.className;
                div.style.cssText = 'display:block;width:176px;min-width:176px;flex-shrink:0;overflow:visible;word-wrap:break-word;background:transparent;border:none;outline:none;font-size:0.875rem;';
                input.parentNode.replaceChild(div, input);
                return;
              }
              // Template 11 contact/left column: preserve right-aligned layout, fixed width
              if (templateId === 11 && (input.closest('[data-template11-contact]') || input.closest('[data-template11-left]'))) {
                const div = clonedDoc.createElement('div');
                div.textContent = input.value || '';
                div.className = input.className;
                div.style.cssText = 'display:block;text-align:right;width:100%;max-width:100%;min-width:0;margin-left:auto;background:transparent;border:none;outline:none;font-size:0.875rem;word-break:break-word;';
                input.parentNode.replaceChild(div, input);
                return;
              }
              // Template 12 job title: flex-1 min-w-0 collapses to zero in html2canvas, causing vertical character stacking
              if (templateId === 12 && input.hasAttribute('data-template12-jobtitle')) {
                const div = clonedDoc.createElement('div');
                div.textContent = input.value || '';
                div.className = input.className;
                div.style.cssText = 'display:block;flex:1;min-width:180px;max-width:100%;background:transparent;border:none;outline:none;font-weight:bold;color:#1f2937;word-wrap:break-word;overflow-wrap:break-word;white-space:normal;';
                input.parentNode.replaceChild(div, input);
                return;
              }
              // Template 12 date: preserve right-aligned layout
              if (templateId === 12 && input.hasAttribute('data-template12-date')) {
                const div = clonedDoc.createElement('div');
                div.textContent = input.value || '';
                div.className = input.className;
                div.style.cssText = 'display:block;flex-shrink:0;width:9rem;min-width:9rem;text-align:right;background:transparent;border:none;outline:none;font-size:0.875rem;font-weight:bold;color:#1f2937;';
                input.parentNode.replaceChild(div, input);
                return;
              }
              // Template 13 job title: flex-1 min-w-0 collapses in html2canvas
              if (templateId === 13 && input.hasAttribute('data-template13-jobtitle')) {
                const div = clonedDoc.createElement('div');
                div.textContent = input.value || '';
                div.className = input.className;
                div.style.cssText = 'display:block;flex:1;min-width:180px;max-width:100%;background:transparent;border:none;outline:none;font-weight:bold;color:#1f2937;word-wrap:break-word;overflow-wrap:break-word;white-space:normal;';
                input.parentNode.replaceChild(div, input);
                return;
              }
              // Template 13 date: keep on one line (flex), prevent wrapping
              if (templateId === 13 && input.hasAttribute('data-template13-date')) {
                const div = clonedDoc.createElement('div');
                div.textContent = input.value || '';
                div.className = input.className;
                div.style.cssText = 'display:block;flex-shrink:0;width:140px;min-width:140px;text-align:right;background:transparent;border:none;outline:none;font-size:0.875rem;color:#4b5563;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
                input.parentNode.replaceChild(div, input);
                return;
              }
              // Template 13 location: keep on one line
              if (templateId === 13 && input.hasAttribute('data-template13-loc')) {
                const div = clonedDoc.createElement('div');
                div.textContent = input.value || '';
                div.className = input.className;
                div.style.cssText = 'display:block;flex-shrink:0;width:100px;min-width:100px;text-align:right;background:transparent;border:none;outline:none;font-size:0.875rem;color:#4b5563;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
                input.parentNode.replaceChild(div, input);
                return;
              }
              // Template 13 education degree/university: flex-1 min-w-0 can collapse
              if (templateId === 13 && (input.hasAttribute('data-template13-edu-degree') || input.hasAttribute('data-template13-edu-university'))) {
                const div = clonedDoc.createElement('div');
                div.textContent = input.value || '';
                div.className = input.className;
                div.style.cssText = 'display:block;flex:1;min-width:120px;max-width:100%;background:transparent;border:none;outline:none;word-wrap:break-word;overflow-wrap:break-word;white-space:normal;';
                if (input.hasAttribute('data-template13-edu-degree')) div.style.fontWeight = 'bold';
                else div.style.fontSize = '0.875rem';
                input.parentNode.replaceChild(div, input);
                return;
              }
              // Template 13 education date/loc: preserve right-aligned layout
              if (templateId === 13 && (input.hasAttribute('data-template13-edu-date') || input.hasAttribute('data-template13-edu-loc'))) {
                const div = clonedDoc.createElement('div');
                div.textContent = input.value || '';
                div.className = input.className;
                div.style.cssText = 'display:block;flex-shrink:0;width:7rem;min-width:7rem;text-align:right;background:transparent;border:none;outline:none;font-size:0.875rem;color:#4b5563;white-space:nowrap;';
                input.parentNode.replaceChild(div, input);
                return;
              }
              // Template 13 skill: uniform grid cell, allow wrap to prevent overflow/overlap
              if (templateId === 13 && input.hasAttribute('data-template13-skill')) {
                const div = clonedDoc.createElement('div');
                div.textContent = input.value || '';
                div.className = input.className;
                div.style.cssText = 'display:block;width:100%;min-width:0;max-width:100%;padding:0.25rem 0.5rem;border-radius:0.25rem;font-size:0.875rem;background:rgba(255,255,255,0.1);color:white;white-space:normal;word-wrap:break-word;overflow-wrap:break-word;overflow:hidden;box-sizing:border-box;';
                input.parentNode.replaceChild(div, input);
                return;
              }
              // Template 13 language name/level: prevent word break (Englis-h, Advance-d)
              if (templateId === 13 && (input.hasAttribute('data-template13-lang') || input.hasAttribute('data-template13-lang-level'))) {
                const div = clonedDoc.createElement('div');
                div.textContent = input.value || '';
                div.className = input.className;
                div.style.cssText = 'display:block;min-width:90px;background:transparent;border:none;outline:none;font-size:0.875rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
                if (input.hasAttribute('data-template13-lang')) {
                  div.style.fontWeight = 'bold';
                  div.setAttribute('data-template13-lang', '');
                } else {
                  div.style.minWidth = '70px';
                  div.setAttribute('data-template13-lang-level', '');
                }
                input.parentNode.replaceChild(div, input);
                return;
              }
              // Template 14 job title: flex-1 min-w-0 can collapse in html2canvas
              if (templateId === 14 && input.hasAttribute('data-template14-jobtitle')) {
                const div = clonedDoc.createElement('div');
                div.textContent = input.value || '';
                div.className = input.className;
                div.style.cssText = 'display:block;flex:1;min-width:120px;max-width:100%;background:transparent;border:none;outline:none;font-weight:bold;color:#000;word-wrap:break-word;overflow-wrap:break-word;white-space:normal;';
                input.parentNode.replaceChild(div, input);
                return;
              }
              // Template 15 job title: flex-1 min-w-0 can collapse in html2canvas
              if (templateId === 15 && input.hasAttribute('data-template15-jobtitle')) {
                const div = clonedDoc.createElement('div');
                div.textContent = input.value || '';
                div.className = input.className;
                div.style.cssText = 'display:block;flex:1;min-width:120px;max-width:100%;background:transparent;border:none;outline:none;font-weight:bold;color:#1f2937;word-wrap:break-word;overflow-wrap:break-word;white-space:normal;';
                input.parentNode.replaceChild(div, input);
                return;
              }
              // Template 15 date: keep on one line, right-aligned
              if (templateId === 15 && input.hasAttribute('data-template15-date')) {
                const div = clonedDoc.createElement('div');
                div.textContent = input.value || '';
                div.className = input.className;
                div.style.cssText = 'display:block;flex-shrink:0;width:120px;min-width:120px;text-align:right;background:transparent;border:none;outline:none;font-size:0.875rem;color:#4b5563;white-space:nowrap;';
                input.parentNode.replaceChild(div, input);
                return;
              }
              // Template 15 education: university (flex-1 can collapse)
              if (templateId === 15 && input.hasAttribute('data-template15-edu-university')) {
                const div = clonedDoc.createElement('div');
                div.textContent = input.value || '';
                div.className = input.className;
                div.style.cssText = 'display:block;flex:1;min-width:100px;max-width:100%;background:transparent;border:none;outline:none;font-weight:bold;color:#1f2937;font-size:0.875rem;word-wrap:break-word;overflow-wrap:break-word;white-space:normal;';
                input.parentNode.replaceChild(div, input);
                return;
              }
              // Template 15 education: date
              if (templateId === 15 && input.hasAttribute('data-template15-edu-date')) {
                const div = clonedDoc.createElement('div');
                div.textContent = input.value || '';
                div.className = input.className;
                div.style.cssText = 'display:block;flex-shrink:0;width:80px;min-width:80px;text-align:right;background:transparent;border:none;outline:none;font-size:0.875rem;color:#4b5563;white-space:nowrap;';
                input.parentNode.replaceChild(div, input);
                return;
              }
              // Template 15 education: location, degree, major
              if (templateId === 15 && (input.hasAttribute('data-template15-edu-location') || input.hasAttribute('data-template15-edu-degree') || input.hasAttribute('data-template15-edu-major'))) {
                const div = clonedDoc.createElement('div');
                div.textContent = input.value || '';
                div.className = input.className;
                div.style.cssText = 'display:block;width:100%;background:transparent;border:none;outline:none;font-size:0.875rem;word-wrap:break-word;overflow-wrap:break-word;white-space:normal;';
                if (input.hasAttribute('data-template15-edu-location')) {
                  div.style.fontStyle = 'italic';
                  div.style.color = '#4b5563';
                  div.style.marginBottom = '0.25rem';
                } else if (input.hasAttribute('data-template15-edu-degree')) {
                  div.style.color = '#1f2937';
                } else if (input.hasAttribute('data-template15-edu-major')) {
                  div.style.color = '#374151';
                }
                input.parentNode.replaceChild(div, input);
                return;
              }
              // Template 14 date: keep on one line, right-aligned
              if (templateId === 14 && input.hasAttribute('data-template14-date')) {
                const div = clonedDoc.createElement('div');
                div.textContent = input.value || '';
                div.className = input.className;
                div.style.cssText = 'display:block;flex-shrink:0;width:140px;min-width:140px;text-align:right;background:transparent;border:none;outline:none;font-size:0.875rem;color:#4b5563;white-space:nowrap;';
                input.parentNode.replaceChild(div, input);
                return;
              }
              // Template 14 contact bar: inline-block for Location | Phone | Email
              if (templateId === 14 && input.closest('[data-template14-contact]')) {
                const div = clonedDoc.createElement('div');
                div.textContent = input.value || '';
                div.className = input.className;
                div.style.cssText = 'display:inline-block;background:transparent;border:none;outline:none;color:white;min-width:60px;';
                input.parentNode.replaceChild(div, input);
                return;
              }
              // Template 14 firstname/lastname: preserve layout
              if (templateId === 14 && (input.hasAttribute('data-template14-firstname') || input.hasAttribute('data-template14-lastname'))) {
                const div = clonedDoc.createElement('div');
                div.textContent = input.value || '';
                div.className = input.className;
                div.style.cssText = 'display:inline-block;background:transparent;border:none;outline:none;font-weight:bold;font-size:1.5rem;text-transform:uppercase;';
                if (input.hasAttribute('data-template14-lastname')) div.style.color = '#C00000';
                else div.style.color = '#000';
                input.parentNode.replaceChild(div, input);
                return;
              }
              // Template 14 company: bold, matches edit menu
              if (templateId === 14 && input.hasAttribute('data-template14-company')) {
                const div = clonedDoc.createElement('div');
                div.textContent = input.value || '';
                div.className = input.className;
                div.style.cssText = 'display:block;width:100%;font-weight:bold;font-size:0.875rem;color:#000;background:transparent;border:none;outline:none;margin-bottom:0.5rem;';
                input.parentNode.replaceChild(div, input);
                return;
              }
              // Template 15 work bullet: use • prefix for reliable PDF rendering (list-style can misrender in html2canvas)
              if (templateId === 15 && input.hasAttribute('data-template15-workbullet')) {
                const div = clonedDoc.createElement('div');
                const text = (input.value || '').trim();
                div.textContent = text ? '\u2022 ' + text : '';
                div.className = input.className;
                div.style.cssText = 'display:block;width:100%;font-size:0.875rem;color:#1f2937;background:transparent;border:none;outline:none;word-wrap:break-word;';
                input.parentNode.replaceChild(div, input);
                return;
              }
              // Template 14 work bullet: match edit menu (text-sm, gray-800)
              if (templateId === 14 && input.hasAttribute('data-template14-workbullet')) {
                const div = clonedDoc.createElement('div');
                div.textContent = input.value || '';
                div.className = input.className;
                div.style.cssText = 'display:block;width:100%;font-size:0.875rem;color:#1f2937;background:transparent;border:none;outline:none;word-wrap:break-word;';
                input.parentNode.replaceChild(div, input);
                return;
              }
              // Template 14 skill: preserve grid layout
              if (templateId === 14 && input.hasAttribute('data-template14-skill')) {
                const div = clonedDoc.createElement('div');
                div.textContent = input.value || '';
                div.className = input.className;
                div.style.cssText = 'display:block;width:100%;min-width:0;background:transparent;border:none;outline:none;font-size:0.875rem;word-wrap:break-word;';
                input.parentNode.replaceChild(div, input);
                return;
              }
              // Template 14 education: ensure degree and university render in PDF
              if (templateId === 14 && (input.hasAttribute('data-template14-edu-degree') || input.hasAttribute('data-template14-edu-university'))) {
                const div = clonedDoc.createElement('div');
                div.textContent = input.value || '';
                div.className = input.className;
                div.style.cssText = 'display:block;width:100%;min-width:0;background:transparent;border:none;outline:none;word-wrap:break-word;overflow-wrap:break-word;white-space:normal;';
                if (input.hasAttribute('data-template14-edu-degree')) {
                  div.style.fontWeight = 'bold';
                  div.style.marginBottom = '0.25rem';
                } else {
                  div.style.fontSize = '0.875rem';
                }
                input.parentNode.replaceChild(div, input);
                return;
              }
              // Template 10, 15 & 16 contact: use inline-block so items stay inline in PDF
              const inContactBar = (templateId === 10 && input.closest('[data-template10-contact]')) || (templateId === 15 && input.closest('[data-template15-contact]')) || (templateId === 16 && input.closest('[data-template16-contact]'));
              if (inContactBar) {
                const div = clonedDoc.createElement('div');
                div.textContent = input.value || '';
                div.className = input.className;
                div.style.cssText = input.style?.cssText || '';
                div.style.display = 'inline-block';
                div.style.width = 'auto';
                div.style.minWidth = '60px';
                div.style.background = 'transparent';
                div.style.border = 'none';
                div.style.outline = 'none';
                input.parentNode.replaceChild(div, input);
              } else {
                replaceWithDiv(input, input.value);
              }
            });
            clonedElement.querySelectorAll('textarea').forEach((textarea) => {
              let tv = textarea.value;
              // Keep hyphenated terms on one line in PDF (e.g. anti-virus) — non-breaking hyphen between alphanumerics
              if (templateId === 1 && tv) {
                tv = tv.replace(/([a-zA-Z0-9])-([a-zA-Z0-9])/g, '$1\u2011$2');
              }
              // Template 4 sidebar address: multi-line white text (match contact row styling)
              if (templateId === 4 && textarea.closest('[data-template4]') && textarea.hasAttribute('data-template4-contact')) {
                const div = clonedDoc.createElement('div');
                div.textContent = tv || '';
                div.className = textarea.className;
                div.setAttribute('data-template4-contact-print', '');
                div.style.cssText =
                  'display:block;width:100%;min-width:0;margin-bottom:0.5rem;font-size:0.875rem;line-height:1.45;color:rgba(255,255,255,0.95);word-break:normal;overflow-wrap:anywhere;white-space:pre-wrap;background:transparent;border:none;outline:none;';
                textarea.parentNode.replaceChild(div, textarea);
                return;
              }
              replaceWithDiv(textarea, tv);
            });

            // Template 15: hide empty bullet points so PDF matches edit menu
            if (templateId === 15) {
              const t15Clone = clonedElement.hasAttribute('data-template15') ? clonedElement : clonedElement.querySelector('[data-template15]');
              if (t15Clone) {
                t15Clone.querySelectorAll('[data-template15-workbullets] li').forEach((li) => {
                  const child = li.querySelector('input') || li.firstElementChild;
                  const text = (child?.value ?? child?.textContent ?? '').trim();
                  if (!text) li.style.display = 'none';
                });
              }
            }

            // Template 14: hide empty bullet points so PDF matches edit menu (no blank bullets)
            if (templateId === 14) {
              const t14Clone = clonedElement.hasAttribute('data-template14') ? clonedElement : clonedElement.querySelector('[data-template14]');
              if (t14Clone) {
                t14Clone.querySelectorAll('ul.list-disc li').forEach((li) => {
                  const child = li.querySelector('input') || li.firstElementChild;
                  const text = (child?.value ?? child?.textContent ?? '').trim();
                  if (!text) li.style.display = 'none';
                });
                // Hide empty second education (degree2 + university2) - inputs already replaced with divs
                const eduSection = t14Clone.querySelector('[data-template14-education]');
                if (eduSection) {
                  const kids = Array.from(eduSection.children).filter((c) => c.tagName !== 'H3' && !c.hasAttribute?.('data-template14-divider'));
                  if (kids.length >= 4) {
                    const deg2El = kids[2];
                    const uni2El = kids[3];
                    const deg2Text = (deg2El?.textContent ?? '').trim();
                    const uni2Text = (uni2El?.textContent ?? '').trim();
                    if (!deg2Text && !uni2Text) {
                      deg2El.style.display = 'none';
                      uni2El.style.display = 'none';
                    }
                  }
                }
              }
            }

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
              } else if (templateId === 16 && (el.hasAttribute('data-template16-profile') || el.hasAttribute('data-template16-workdesc'))) {
                el.style.width = '100%';
                el.style.minWidth = '100%';
                el.style.maxWidth = '100%';
                el.style.boxSizing = 'border-box';
              } else if (templateId === 2 && el.hasAttribute('data-template2-summary')) {
                const col = el.closest('[data-template2-right]');
                let inner = 0;
                if (col) {
                  const cs = clonedElement.ownerDocument.defaultView.getComputedStyle(col);
                  const pl = parseFloat(cs.paddingLeft) || 0;
                  const pr = parseFloat(cs.paddingRight) || 0;
                  inner = (col.clientWidth || col.offsetWidth) - pl - pr;
                }
                if (inner < 200) {
                  const t2 = el.closest('[data-template2]');
                  const flexRow = t2?.querySelector(':scope > div.flex');
                  const rightCol = flexRow?.children?.[2];
                  if (rightCol) {
                    const cs2 = clonedElement.ownerDocument.defaultView.getComputedStyle(rightCol);
                    const pl2 = parseFloat(cs2.paddingLeft) || 0;
                    const pr2 = parseFloat(cs2.paddingRight) || 0;
                    inner = (rightCol.clientWidth || rightCol.offsetWidth) - pl2 - pr2;
                  }
                }
                const pw = Math.max(280, inner - 4);
                el.style.width = `${pw}px`;
                el.style.minWidth = `${pw}px`;
                el.style.maxWidth = `${pw}px`;
                el.style.boxSizing = 'border-box';
                el.style.display = 'block';
                el.style.flex = 'none';
              } else if (templateId === 4 && el.closest('[data-template4]')) {
                const mainCol = el.closest('.flex-1') || el.closest('[class*="flex-1"]');
                let inner = 0;
                if (mainCol) {
                  const cs = clonedElement.ownerDocument.defaultView.getComputedStyle(mainCol);
                  const pl = parseFloat(cs.paddingLeft) || 0;
                  const pr = parseFloat(cs.paddingRight) || 0;
                  inner = (mainCol.clientWidth || mainCol.offsetWidth) - pl - pr;
                }
                const pw = Math.max(200, inner - 4);
                el.style.width = `${pw}px`;
                el.style.minWidth = `${pw}px`;
                el.style.maxWidth = `${pw}px`;
                el.style.boxSizing = 'border-box';
                el.style.display = 'block';
                el.style.flex = 'none';
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

            // Template 2: two-column flex + fixed width so export matches editor (Classic Elegant)
            if (templateId === 2) {
              const t2 = clonedElement.hasAttribute('data-template2') ? clonedElement : clonedElement.querySelector('[data-template2]');
              if (t2) {
                t2.style.width = '768px';
                t2.style.minWidth = '768px';
                t2.style.maxWidth = '768px';
                t2.style.height = 'auto';
                t2.style.boxSizing = 'border-box';
                const flexRow = t2.querySelector(':scope > div.flex');
                if (flexRow) {
                  flexRow.style.display = 'flex';
                  flexRow.style.width = '100%';
                  const rowKids = [...flexRow.children];
                  const leftCol = rowKids[0];
                  const rightCol = rowKids[2];
                  if (leftCol) {
                    leftCol.style.width = '256px';
                    leftCol.style.minWidth = '256px';
                    leftCol.style.maxWidth = '256px';
                    leftCol.style.flex = 'none';
                    leftCol.style.flexShrink = '0';
                  }
                  if (rightCol) {
                    // Explicit width so Summary RichTextBlock can resolve full inner width in clone
                    const rightW = 768 - 256 - 1;
                    rightCol.style.flex = 'none';
                    rightCol.style.flexShrink = '0';
                    rightCol.style.minWidth = `${rightW}px`;
                    rightCol.style.width = `${rightW}px`;
                    rightCol.style.maxWidth = `${rightW}px`;
                    rightCol.style.boxSizing = 'border-box';
                  }
                }
              }
            }

            // Template 1: full print width + avoid breaking words at hyphens (e.g. anti-virus)
            if (templateId === 1) {
              const t1Style = clonedDoc.createElement('style');
              t1Style.textContent = `
                [data-template1] textarea,
                [data-template1] ul li > div {
                  word-break: normal !important;
                  overflow-wrap: break-word !important;
                  hyphens: none !important;
                  -webkit-hyphens: none !important;
                }
              `;
              clonedDoc.head.appendChild(t1Style);
              const t1 = clonedElement.hasAttribute('data-template1') ? clonedElement : clonedElement.querySelector('[data-template1]');
              if (t1) {
                const w = 900;
                t1.style.width = w + 'px';
                t1.style.minWidth = w + 'px';
                t1.style.maxWidth = 'none';
                t1.style.boxSizing = 'border-box';
                t1.style.overflow = 'visible';
                t1.style.marginLeft = '0';
                t1.style.marginRight = '0';
                const a4MinPx = Math.ceil(w * (297 / 210));
                const naturalH = Math.max(t1.scrollHeight, t1.offsetHeight);
                const targetMinH = Math.max(naturalH + 32, a4MinPx);
                t1.style.minHeight = `${targetMinH}px`;
                t1.style.height = 'auto';
                const innerFlex = t1.firstElementChild;
                if (innerFlex?.classList?.contains('flex')) {
                  innerFlex.style.minHeight = `${targetMinH}px`;
                  innerFlex.style.height = 'auto';
                  innerFlex.style.width = '100%';
                  innerFlex.style.minWidth = '100%';
                  innerFlex.style.alignItems = 'stretch';
                }
              }
            }

            // Template 16: ensure full layout is preserved in clone (matches max-w-3xl = 768px)
            if (templateId === 16) {
              const t16 = clonedElement.hasAttribute('data-template16') ? clonedElement : clonedElement.querySelector('[data-template16]');
              if (t16) {
                const w = 768;
                t16.style.width = w + 'px';
                t16.style.minWidth = w + 'px';
                t16.style.boxSizing = 'border-box';
                // Contact bar: force full width in clone (extend past padding)
                const contactBar = t16.querySelector('[data-template16-contact]');
                if (contactBar) {
                  contactBar.style.width = 'calc(100% + 4rem)';
                  contactBar.style.marginLeft = '-2rem';
                  contactBar.style.boxSizing = 'border-box';
                  contactBar.style.display = 'flex';
                  contactBar.style.justifyContent = 'center';
                  contactBar.style.alignItems = 'center';
                  contactBar.style.flexWrap = 'wrap';
                  contactBar.style.gap = '0.75rem';
                }
                // Work experience: ensure flex layout and full-width descriptions in clone
                t16.querySelectorAll('[data-template16-workdesc]').forEach((el) => {
                  el.style.width = '100%';
                  el.style.minWidth = '100%';
                  el.style.maxWidth = '100%';
                });
                const workSection = t16.querySelector('[data-template16-work]');
                if (workSection) {
                  workSection.style.display = 'flex';
                  workSection.style.flexDirection = 'column';
                  workSection.style.width = '100%';
                  workSection.style.minWidth = '0';
                  workSection.querySelectorAll('[data-template16-workentry]').forEach((entry) => {
                    entry.style.display = 'flex';
                    entry.style.flexDirection = 'column';
                    entry.style.width = '100%';
                    entry.style.minWidth = '0';
                  });
                }
              }
            }

            // Template 4: Corporate Standard — clone must match locked layout (same as pre-capture) or PDF looks wrong
            if (templateId === 4) {
              const t4 = clonedElement.hasAttribute('data-template4') ? clonedElement : clonedElement.querySelector('[data-template4]');
              if (t4) {
                const w = 896;
                const a4MinPx = Math.ceil(w * (297 / 210));
                t4.style.width = `${w}px`;
                t4.style.minWidth = `${w}px`;
                t4.style.maxWidth = `${w}px`;
                t4.style.boxSizing = 'border-box';
                t4.style.overflow = 'visible';
                t4.style.marginLeft = 'auto';
                t4.style.marginRight = 'auto';
                t4.style.height = 'auto';
                t4.style.display = 'flex';
                t4.style.flexDirection = 'column';
                const bodyRow = t4.querySelector('[data-template4-body]') || t4.querySelector(':scope > div.grid') || t4.querySelector(':scope > div.flex');
                if (bodyRow) {
                  const leftW = Math.round(w / 3);
                  const rightW = Math.max(400, w - leftW);
                  bodyRow.style.display = 'flex';
                  bodyRow.style.flexDirection = 'row';
                  bodyRow.style.gridTemplateColumns = '';
                  bodyRow.style.width = '100%';
                  bodyRow.style.flex = '1 1 auto';
                  bodyRow.style.minHeight = '0';
                  bodyRow.style.alignItems = 'stretch';
                  const kids = [...bodyRow.children];
                  const leftCol = kids[0];
                  const rightCol = kids[1];
                  [leftCol, rightCol].forEach((col, i) => {
                    if (!col) return;
                    const cw = i === 0 ? leftW : rightW;
                    col.style.minHeight = '100%';
                    col.style.height = '100%';
                    col.style.alignSelf = 'stretch';
                    col.style.boxSizing = 'border-box';
                    col.style.overflow = 'visible';
                    if (i === 0) {
                      col.style.flex = `0 0 ${cw}px`;
                      col.style.width = `${cw}px`;
                      col.style.minWidth = `${cw}px`;
                      col.style.maxWidth = `${cw}px`;
                      col.style.backgroundColor = '#333333';
                    } else {
                      col.style.flex = '1 1 auto';
                      col.style.minWidth = '0';
                      col.style.width = `${cw}px`;
                      col.style.maxWidth = 'none';
                    }
                  });
                }
                const headerRow = t4.querySelector('[data-template4-header-row]') || t4.querySelector(':scope > div.relative');
                if (headerRow) {
                  headerRow.style.width = '100%';
                  headerRow.style.overflow = 'visible';
                  headerRow.style.flexShrink = '0';
                  headerRow.style.minHeight = '132px';
                  headerRow.style.height = 'auto';
                  headerRow.style.position = 'relative';
                  headerRow.style.display = 'flex';
                  headerRow.style.alignItems = 'flex-end';
                  // Keep clip-path so PDF colors/shapes match the editor (stripping it made full gray/blue blocks)
                  headerRow.querySelectorAll('[data-template4-header-bg]').forEach((layer) => {
                    layer.style.pointerEvents = 'none';
                    layer.style.zIndex = '0';
                    const side = layer.getAttribute('data-template4-header-bg');
                    if (side === 'left') layer.style.backgroundColor = '#e5e7eb';
                    if (side === 'right') layer.style.backgroundColor = '#2563eb';
                  });
                  const headerContent = headerRow.querySelector('[data-template4-header-content]');
                  if (headerContent) {
                    headerContent.style.position = 'relative';
                    headerContent.style.zIndex = '50';
                    headerContent.style.isolation = 'isolate';
                  }
                  headerRow.querySelectorAll('[data-template4-header-print]').forEach((el) => {
                    el.style.position = 'relative';
                    el.style.zIndex = '60';
                    el.style.visibility = 'visible';
                    el.style.opacity = '1';
                  });
                }
                // Must NOT use minHeight: 0 on t4 — it collapses the layout so the sidebar stops mid-page in the PDF
                t4.style.minHeight = `${Math.max((t4.scrollHeight || 0) + 24, a4MinPx)}px`;
              }
            }

            // Template 11: ensure two-column layout preserved in clone
            if (templateId === 11) {
              const t11 = clonedElement.hasAttribute('data-template11') ? clonedElement : clonedElement.querySelector('[data-template11]');
              if (t11) {
                const w = 768;
                t11.style.width = w + 'px';
                t11.style.minWidth = w + 'px';
                t11.style.boxSizing = 'border-box';
                t11.style.display = 'block';
                t11.style.fontFamily = 'Georgia, "Times New Roman", serif';
                const leftCol = t11.querySelector('[data-template11-left]');
                const cols = leftCol?.parentElement;
                if (cols) {
                  cols.style.display = 'flex';
                  cols.style.gap = '0';
                  cols.style.width = '100%';
                }
                if (leftCol) {
                  leftCol.style.width = '256px';
                  leftCol.style.minWidth = '256px';
                  leftCol.style.flex = 'none';
                  leftCol.style.borderRight = '2px solid #8B7355';
                  leftCol.style.paddingRight = '1.5rem';
                  leftCol.style.textAlign = 'right';
                }
                const rightCol = t11.querySelector('[data-template11-right]') || leftCol?.nextElementSibling;
                if (rightCol) {
                  rightCol.style.flex = '1';
                  rightCol.style.minWidth = '400px';
                  rightCol.style.paddingLeft = '2rem';
                }
                // Name border
                const nameBorder = t11.querySelector('.inline-block');
                if (nameBorder) {
                  nameBorder.style.border = '2px solid #8B7355';
                }
              }
            }

            // Template 12: ensure two-column layout preserved in clone + work experience fully visible
            if (templateId === 12) {
              const t12 = clonedElement.hasAttribute('data-template12') ? clonedElement : clonedElement.querySelector('[data-template12]');
              if (t12) {
                const w = 768;
                t12.style.width = w + 'px';
                t12.style.minWidth = w + 'px';
                t12.style.boxSizing = 'border-box';
                t12.style.overflow = 'visible';
                const leftCol = t12.querySelector('[data-template12-left]');
                const rightCol = t12.querySelector('[data-template12-right]');
                const cols = leftCol?.parentElement;
                if (cols) {
                  cols.style.display = 'flex';
                  cols.style.width = '100%';
                  cols.style.overflow = 'visible';
                }
                if (leftCol) {
                  leftCol.style.flex = '1';
                  leftCol.style.minWidth = '400px';
                  leftCol.style.overflow = 'visible';
                }
                if (rightCol) {
                  rightCol.style.flex = 'none';
                  rightCol.style.minWidth = '220px';
                }
                // Work experience: ensure full content visible, no clipping; job title rows stay horizontal
                const workSection = t12.querySelector('[data-template12-work]');
                if (workSection) {
                  workSection.style.overflow = 'visible';
                  workSection.style.minHeight = '0';
                  workSection.querySelectorAll('.flex.justify-between').forEach((row) => {
                    row.style.display = 'flex';
                    row.style.justifyContent = 'space-between';
                    row.style.alignItems = 'flex-start';
                    row.style.gap = '0.5rem';
                    row.style.width = '100%';
                  });
                  workSection.querySelectorAll('ul li div').forEach((div) => {
                    div.style.overflow = 'visible';
                    div.style.whiteSpace = 'pre-wrap';
                    div.style.wordBreak = 'break-word';
                    div.style.overflowWrap = 'break-word';
                  });
                }
              }
            }

            // Template 13: ensure two-column layout preserved in clone + experience/language flex rows
            if (templateId === 13) {
              const t13 = clonedElement.hasAttribute('data-template13') ? clonedElement : clonedElement.querySelector('[data-template13]');
              if (t13) {
                const w = 768;
                t13.style.width = w + 'px';
                t13.style.minWidth = w + 'px';
                t13.style.boxSizing = 'border-box';
                t13.style.overflow = 'visible';
                const cols = t13.querySelector('.flex');
                if (cols) {
                  cols.style.display = 'flex';
                  cols.style.width = '100%';
                  const leftCol = cols.children[0];
                  const rightCol = cols.children[1];
                  if (leftCol) {
                    leftCol.style.flex = '1';
                    leftCol.style.minWidth = '400px';
                    leftCol.style.overflow = 'visible';
                  }
                  if (rightCol) {
                    rightCol.style.flex = 'none';
                    rightCol.style.width = '268px';
                    rightCol.style.minWidth = '200px';
                  }
                }
                // Experience: ensure flex rows keep title + date on same line
                t13.querySelectorAll('.flex.justify-between').forEach((row) => {
                  row.style.display = 'flex';
                  row.style.justifyContent = 'space-between';
                  row.style.alignItems = 'center';
                  row.style.gap = '0.75rem';
                  row.style.flexWrap = 'nowrap';
                });
                // Languages: ensure each language item stays on one line (divs from input replacement)
                t13.querySelectorAll('[data-template13-lang], [data-template13-lang-level]').forEach((el) => {
                  el.style.whiteSpace = 'nowrap';
                  if (el.hasAttribute('data-template13-lang')) el.style.minWidth = '90px';
                  else el.style.minWidth = '70px';
                });
                // Skills: ensure 2-column grid layout in clone, prevent overflow
                const skillsGrid = t13.querySelector('[data-template13-skills]');
                if (skillsGrid) {
                  skillsGrid.style.display = 'grid';
                  skillsGrid.style.gridTemplateColumns = '1fr 1fr';
                  skillsGrid.style.gap = '0.5rem 0.75rem';
                  skillsGrid.style.width = '100%';
                  skillsGrid.style.minWidth = '0';
                  skillsGrid.style.overflow = 'hidden';
                  Array.from(skillsGrid.children).forEach((el) => {
                    el.style.width = '100%';
                    el.style.minWidth = '0';
                    el.style.maxWidth = '100%';
                    el.style.overflow = 'hidden';
                    el.style.wordWrap = 'break-word';
                    el.style.overflowWrap = 'break-word';
                    el.style.whiteSpace = 'normal';
                    el.style.boxSizing = 'border-box';
                  });
                }
              }
            }

            // Template 14: ensure layout preserved in clone - match edit menu exactly
            if (templateId === 14) {
              const t14 = clonedElement.hasAttribute('data-template14') ? clonedElement : clonedElement.querySelector('[data-template14]');
              if (t14) {
                t14.style.width = '768px';
                t14.style.minWidth = '768px';
                t14.style.height = 'auto';
                t14.style.minHeight = '0';
                t14.style.maxHeight = 'none';
                t14.style.overflow = 'visible';
                t14.style.backgroundColor = '#ffffff';
                t14.style.fontFamily = 'Helvetica, Arial, sans-serif';
                // Red dividers - extra space below heading, a little down for cleaner PDF look
                t14.querySelectorAll('[data-template14-divider]').forEach((div) => {
                  div.style.height = '2px';
                  div.style.backgroundColor = '#C00000';
                  div.style.width = '100%';
                  div.style.marginTop = '0.5rem';
                  div.style.marginBottom = '1rem';
                });
                // Work history: job title + date on same line
                t14.querySelectorAll('.flex.justify-between').forEach((row) => {
                  row.style.display = 'flex';
                  row.style.justifyContent = 'space-between';
                  row.style.alignItems = 'baseline';
                  row.style.gap = '0.5rem';
                  row.style.flexWrap = 'nowrap';
                });
                const contactBar = t14.querySelector('[data-template14-contact]');
                if (contactBar) {
                  contactBar.style.display = 'flex';
                  contactBar.style.flexWrap = 'wrap';
                  contactBar.style.justifyContent = 'center';
                  contactBar.style.gap = '0.5rem 1rem';
                  contactBar.style.backgroundColor = '#000000';
                  contactBar.style.color = '#ffffff';
                  contactBar.style.padding = '0.625rem 2rem';
                }
                const skillsGrid = t14.querySelector('[data-template14-skills]');
                if (skillsGrid) {
                  skillsGrid.style.display = 'grid';
                  skillsGrid.style.gridTemplateColumns = '1fr 1fr';
                  skillsGrid.style.gap = '0.25rem 2rem';
                }
                // Section padding to match edit menu (px-8 pt-6)
                t14.querySelectorAll('[data-template14-section]').forEach((h) => {
                  h.style.fontSize = '1.1rem';
                  h.style.fontWeight = '400';
                  h.style.color = '#000';
                });
                const eduSection = t14.querySelector('[data-template14-education]');
                if (eduSection) {
                  eduSection.style.overflow = 'visible';
                  eduSection.style.display = 'block';
                  eduSection.style.visibility = 'visible';
                }
              }
            }

            // Template 15: ensure layout preserved in clone - match edit menu
            if (templateId === 15) {
              const t15 = clonedElement.hasAttribute('data-template15') ? clonedElement : clonedElement.querySelector('[data-template15]');
              if (t15) {
                t15.style.width = '672px';
                t15.style.minWidth = '672px';
                t15.style.height = 'auto';
                t15.style.minHeight = '0';
                t15.style.maxHeight = 'none';
                t15.style.overflow = 'visible';
                t15.style.backgroundColor = '#ffffff';
                // Work history: job title + date on same line
                t15.querySelectorAll('.flex.justify-between').forEach((row) => {
                  row.style.display = 'flex';
                  row.style.justifyContent = 'space-between';
                  row.style.alignItems = 'baseline';
                  row.style.gap = '0.5rem';
                  row.style.flexWrap = 'nowrap';
                });
                // Light blue section bars
                t15.querySelectorAll('[data-template15-sectionbar]').forEach((bar) => {
                  bar.style.backgroundColor = '#B8D4E8';
                  bar.style.padding = '0.5rem 1rem';
                  bar.style.width = '100%';
                });
                // Work bullets: list-style none (we use • in content for reliable PDF), indent to align with company name
                t15.querySelectorAll('[data-template15-workbullets]').forEach((ul) => {
                  ul.style.paddingLeft = '0';
                  ul.style.marginLeft = '0.75rem';
                  ul.style.listStyleType = 'none';
                  ul.style.listStyle = 'none';
                });
                // Contact bar: flex row so Phone | Email | Location | LinkedIn stay on one line
                const contactBar15 = t15.querySelector('[data-template15-contact]');
                if (contactBar15) {
                  contactBar15.style.display = 'flex';
                  contactBar15.style.flexDirection = 'row';
                  contactBar15.style.flexWrap = 'nowrap';
                  contactBar15.style.justifyContent = 'center';
                  contactBar15.style.alignItems = 'center';
                  contactBar15.style.gap = '0.75rem';
                }
              }
            }

            // Template 10: ensure layout preserved in clone
            if (templateId === 10) {
              const t10 = clonedElement.hasAttribute('data-template10') ? clonedElement : clonedElement.querySelector('[data-template10]');
              if (t10) {
                const w = 768;
                t10.style.width = w + 'px';
                t10.style.minWidth = w + 'px';
                t10.style.boxSizing = 'border-box';
                const contactBar = t10.querySelector('[data-template10-contact]');
                if (contactBar) {
                  contactBar.style.display = 'flex';
                  contactBar.style.flexWrap = 'wrap';
                  contactBar.style.gap = '0.5rem 3rem';
                }
                // Skills section: keep skill names and bars adjacent, constrain bar container
                t10.querySelectorAll('[data-template10-skillrow]').forEach((row) => {
                  row.style.justifyContent = 'flex-start';
                  row.style.gap = '1rem';
                });
                t10.querySelectorAll('[data-template10-skillwrap]').forEach((wrap) => {
                  wrap.style.flex = 'none';
                  wrap.style.maxWidth = '280px';
                });
                // Force skill bars to render in PDF - explicit pixel dimensions, flex:none so they stay next to skill names
                t10.querySelectorAll('[data-template10-skillbar]').forEach((track) => {
                  track.style.display = 'block';
                  track.style.width = '200px';
                  track.style.minWidth = '200px';
                  track.style.flex = 'none';
                  track.style.height = '10px';
                  track.style.minHeight = '10px';
                  track.style.backgroundColor = '#e5e7eb';
                  track.style.overflow = 'hidden';
                  const fill = track.firstElementChild;
                  if (fill) {
                    const wStr = fill.style.width || '';
                    const pct = parseFloat(String(wStr)) || 0;
                    const px = wStr.includes('px') ? parseFloat(wStr) : Math.round(200 * pct / 100);
                    fill.style.width = px + 'px';
                    fill.style.minHeight = '10px';
                    fill.style.height = '10px';
                    fill.style.backgroundColor = '#374151';
                    fill.style.display = 'block';
                  }
                });
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
          
          // Natural height (mm) if the raster is placed at full page width
          const totalHeight = (canvas.height * imgWidth) / canvas.width;

          // Visual / layout PDFs: one A4 page, edge-to-edge — stretch raster to full 210×297mm so there is
          // no letterboxing (uniform "fit" scaling left white bars when content was taller than one page).
          if (VISUAL_PDF_TEMPLATE_IDS.includes(templateId)) {
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, pageHeight, undefined, 'SLOW');
          } else {
            let pageCount = Math.ceil(totalHeight / pageHeight) || 1;
            const remainder = totalHeight % pageHeight;
            const useShrinkLastPage =
              templateId !== 1 &&
              pageCount > 1 &&
              remainder > 0 &&
              remainder < 50;
            if (useShrinkLastPage) {
              const scale = ((pageCount - 1) * pageHeight) / totalHeight;
              const scaledWidth = imgWidth * scale;
              const scaledHeight = (pageCount - 1) * pageHeight;
              pdf.addImage(imgData, 'PNG', (imgWidth - scaledWidth) / 2, 0, scaledWidth, scaledHeight, undefined, 'SLOW');
            } else {
              for (let page = 0; page < pageCount; page++) {
                if (page > 0) pdf.addPage();
                const yOffset = -page * pageHeight;
                pdf.addImage(imgData, 'PNG', 0, yOffset, imgWidth, totalHeight, undefined, 'SLOW');
                if (templateId === 1) {
                  const imgBottom = yOffset + totalHeight;
                  const contentBottomOnPage = Math.min(pageHeight, Math.max(0, imgBottom));
                  if (contentBottomOnPage < pageHeight) {
                    pdf.setFillColor(0, 0, 0);
                    pdf.rect(0, contentBottomOnPage, imgWidth, pageHeight - contentBottomOnPage, 'F');
                  }
                }
              }
            }
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
        template1Backups.forEach(({ el, props, vals }) => {
          if (el?.isConnected) props.forEach((p, i) => { el.style[p] = vals[i] || ''; });
        });
        template10Backups.forEach(({ el, props, vals }) => {
          if (el?.isConnected) props.forEach((p, i) => { el.style[p] = vals[i] || ''; });
        });
        template11Backups.forEach(({ el, props, vals }) => {
          if (el?.isConnected) props.forEach((p, i) => { el.style[p] = vals[i] || ''; });
        });
        template2Backups.forEach(({ el, props, vals }) => {
          if (el?.isConnected) props.forEach((p, i) => { el.style[p] = vals[i] || ''; });
        });
        template4Backups.forEach(({ el, props, vals }) => {
          if (el?.isConnected) props.forEach((p, i) => { el.style[p] = vals[i] || ''; });
        });
        template12Backups.forEach(({ el, props, vals }) => {
          if (el?.isConnected) props.forEach((p, i) => { el.style[p] = vals[i] || ''; });
        });
        template13Backups.forEach(({ el, props, vals }) => {
          if (el?.isConnected) props.forEach((p, i) => { el.style[p] = vals[i] || ''; });
        });
        template14AncestorBackups.forEach(({ el, overflow, overflowY, maxHeight }) => {
          if (el?.isConnected) {
            el.style.overflow = overflow || '';
            el.style.overflowY = overflowY || '';
            el.style.maxHeight = maxHeight || '';
          }
        });
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

  const resetTemplate1 = () => {
    if (!window.confirm('Reset template to default? All your edits will be cleared.')) return;
    setName('YOUR NAME');
    setProfession('Freelance Software Developer');
    setBrief('Dedicated software professional with expertise in building scalable applications. Passionate about clean code and user experience.');
    setSkills(['Creativity', 'Communication', 'Typography', 'Adobe Creative Apps', 'Interactive Media']);
    setTitle1('Job Title 1');
    setCompany1('Company Name');
    setResponsibilities1(['Key responsibility or achievement.', 'Another responsibility or achievement.', 'Third responsibility or achievement.']);
    setTitle2('Job Title 2');
    setCompany2('Company Name');
    setResponsibilities2(['Key responsibility or achievement.', 'Another responsibility or achievement.']);
    setDegree1('B.S. Computer Science');
    setSchool('University Name');
    setDegree2('High School Diploma');
    setCollege('School Name');
    setRef1('Reference Name 1');
    setRef2('Reference Name 2');
    setInterests(['Movies', 'Coding', 'Music', 'Fitness', 'Writing', 'Karaoke']);
    setLanguages(['English', 'French', 'German']);
    setPhone('(555) 555-0123');
    setEmail('your.email@example.com');
    setWebsite('www.yourwebsite.com');
    setAddress('Your Address');
    setSelectedImage1(null);
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

  const [educationtemp2, setEducationtemp2] = useState("JURIS DOCTOR - JUNE 20XX");
  const [universitytemp2, setUniversitytemp2] = useState("Jasper University, Manhattan, NYC, New York");
  const [educationdetailtemp2, setEducationdetailtemp2] = useState("Real Estate Clinic, 1st place in Moot Court.");
  const [edu2temp2, setEdu2temp2] = useState("BA IN POLITICAL SCIENCE - JUNE 20XX");
  const [university2temp2, setUniversity2temp2] = useState("Mount Flores College, Small Town, Massachusetts");

  const [intereststemp2, setIntereststemp2] = useState(["Literature", "Environmental conservation", "Art", "Yoga", "Skiing", "Travel"]);
  const handleIntereststemp2Change = (i, v) => { const x = [...intereststemp2]; x[i] = v; setIntereststemp2(x); };

  const [profileinfotemp2, setProfileinfoTemp2] = useState(
    "Detail-oriented and dynamic attorney with experience in business and real estate law. Recognized for analytical abilities and commitment to client success."
  );

  const [post1temp2, setPost1temp2] = useState("IN-HOUSE COUNSEL - MARCH 20XX—PRESENT");
  const [company1temp2, setCompany1temp2] = useState("Bandter Real Estate - NYC, New York");
  const [workdone1temp2, setWorkdone1temp2] = useState([
    "Drafting commercial leases and negotiating contracts.",
    "Overseeing due diligence for real estate transactions.",
  ]);
  const handleWorkdone1Change = (index, value) => {
    const newworkdone1 = [...workdone1temp2];
    newworkdone1[index] = value;
    setWorkdone1temp2(newworkdone1);
  };

  const [post2temp2, setPost2temp2] = useState("ASSOCIATE ATTORNEY - FEB 20XX—NOV 20XX");
  const [company2temp2, setCompany2temp2] = useState("Luca Udinesi Law firm - NYC, New York");
  const [workdone2temp2, setWorkdone2temp2] = useState([
    "Representing parties in small business and real estate matters.",
    "Won $25,000 receivership case.",
  ]);

  const handleWorkdone2Change = (index, value) => {
    const newworkdone2 = [...workdone2temp2];
    newworkdone2[index] = value;
    setWorkdone2temp2(newworkdone2);
  };

  const [post3temp2, setPost3temp2] = useState("JUNIOR ASSOCIATE ATTORNEY - SEPT 20XX—JAN 20XX");
  const [company3temp2, setCompany3temp2] = useState("Law Offices of Keita Aoki - NYC, New York");
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

  const resetTemplate3 = () => {
    if (!window.confirm('Reset template to default? All your edits will be cleared.')) return;
    setNametemp3("Linda Brown");
    setProfessiontemp3("Copywriter");
    setProfilePhotoTemp3("");
    setPhone1temp3("(555) 555-0100");
    setPhone2temp3("(311) 555-2368");
    setAddresstemp3("2701 Willow Oaks Lane, Lake Charles, LA");
    setSkillstemp3("Communication, Teamwork, Responsibility, Creativity, Problem-solving, Leadership, Adaptive");
    setSocialHandleTemp3("@lindabrown");
    setWebsitetemp3("www.lindabrown.site.com");
    setEmailtemp3("l.brown@email.site.com");
    setAbouttemp3("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\nUt enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.");
    setAwardstemp3(["Award 01 placeholder", "Award 02 placeholder", "Award 03 placeholder", "Award 04 placeholder"]);
    setPosttemp3("Project Manager (2017 - Present)");
    setWorkdonetemp3("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.");
    setPost2temp3("Editor (2014 - 2017)");
    setWorkdone2temp3("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.");
    setEdu1temp3("Bachelor of Literature (2009 - 2014)");
    setEdu1desctemp3("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.");
    setEdu2temp3("High School Diploma (2006 - 2009)");
    setEdu2desctemp3("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.");
    setEdu3temp3("Junior School Diploma (2003 - 2006)");
    setEdu3desctemp3("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.");
  };

  //end of template 3

  //state for the template 4
  //state for the template 4 (Oracle DBA / Corporate Standard layout)
  const [nametemp4, setNametemp4] = useState("");
  const [profession4, setProfessiontemp4] = useState("");
  const [addresstemp4, setAddresstemp4] = useState("");
  const [phonetemp4, setPhonetemp4] = useState("");
  const [emailtemp4, setEmailtemp4] = useState("");
  const [linkedintemp4, setLinkedintemp4] = useState("");
  const [skillstemp4, setSkillstemp4] = useState([
    { name: "", level: 0 },
    { name: "", level: 0 },
    { name: "", level: 0 },
    { name: "", level: 0 },
    { name: "", level: 0 },
  ]);
  const handleskillstemp4Change = (index, field, value) => {
    const arr = [...skillstemp4];
    const v =
      field === 'level'
        ? parseInt(value, 10) || 0
        : field === 'name'
          ? protectHyphensForT4(value)
          : value;
    arr[index] = { ...arr[index], [field]: v };
    setSkillstemp4(arr);
  };
  const [languagesTemp4, setLanguagesTemp4] = useState([
    { name: "", level: 0 },
    { name: "", level: 0 },
    { name: "", level: 0 },
  ]);
  const handleLanguageTemp4Change = (index, field, value) => {
    const arr = [...languagesTemp4];
    const v =
      field === 'level'
        ? parseInt(value, 10) || 0
        : field === 'name'
          ? protectHyphensForT4(value)
          : value;
    arr[index] = { ...(arr[index] || { name: "", level: 0 }), [field]: v };
    setLanguagesTemp4(arr);
  };
  const [summarytemp4, setSummarytemp4] = useState("");
  const [posttemp4, setPosttemp4] = useState("");
  const [companytemp4, setCompanytemp4] = useState("");
  const [workdonetemp4, setWorkdonetemp4] = useState([
    "",
    "",
    "",
  ]);
  const handleworkdoneChange = (index, value) => {
    const arr = [...workdonetemp4];
    arr[index] = value;
    setWorkdonetemp4(arr);
  };
  const [post2temp4, setPost2temp4] = useState("");
  const [company2temp4, setCompany2temp4] = useState("");
  const [workdone2temp4, setWorkdone2temp4] = useState([
    "",
    "",
    "",
  ]);
  const handleworkdone2Change = (index, value) => {
    const arr = [...workdone2temp4];
    arr[index] = value;
    setWorkdone2temp4(arr);
  };
  const [facultytemp4, setFacultytemp4] = useState("");
  const [collegetemp4, setCollegetemp4] = useState("");
  const [certstemp4, setCertstemp4] = useState([
    "",
    "",
  ]);
  const handleCertTemp4Change = (i, v) => { const arr = [...certstemp4]; arr[i] = v; setCertstemp4(arr); };

  const resetTemplate4 = () => {
    if (!window.confirm('Reset template to default? All your edits will be cleared.')) return;
    setNametemp4("");
    setProfessiontemp4("");
    setAddresstemp4("");
    setPhonetemp4("");
    setEmailtemp4("");
    setLinkedintemp4("");
    setSkillstemp4([
      { name: "", level: 0 },
      { name: "", level: 0 },
      { name: "", level: 0 },
      { name: "", level: 0 },
      { name: "", level: 0 },
    ]);
    setLanguagesTemp4([
      { name: "", level: 0 },
      { name: "", level: 0 },
      { name: "", level: 0 },
    ]);
    setSummarytemp4("");
    setPosttemp4("");
    setCompanytemp4("");
    setWorkdonetemp4([
      "",
      "",
      "",
    ]);
    setPost2temp4("");
    setCompany2temp4("");
    setWorkdone2temp4([
      "",
      "",
      "",
    ]);
    setFacultytemp4("");
    setCollegetemp4("");
    setCertstemp4([
      "",
      "",
    ]);
  };

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

  // Template 10 - Alina Rudimenko style (grayscale, icons, two-column dates/content, skill progress bars)
  const [nametemp10, setNametemp10] = useState("Alina Rudimenko");
  const [professiontemp10, setProfessiontemp10] = useState("IT Consultant - 4+ Years Experience");
  const [addresstemp10, setAddresstemp10] = useState("350 5th Ave, New York, NY 10118");
  const [phonetemp10, setPhonetemp10] = useState("718-708-1622");
  const [emailtemp10, setEmailtemp10] = useState("alina.rudimenko@gmail.com");
  const [linkedintemp10, setLinkedintemp10] = useState("linkedin.com/in/alinarudimenko");
  const [aboutmeinfotemp10, setAboutmeinfotemp10] = useState(
    "Experienced IT consultant with a strong background in network administration and cloud solutions. Proven track record of delivering high-impact projects across diverse industries."
  );
  const [experiencetemp10, setExperiencetemp10] = useState("Experience");
  const [date1temp10, setDate1temp10] = useState("2015-01 - 2017-12");
  const [post1temp10, setPost1temp10] = useState("IT Consultant");
  const [company1temp10, setCompany1temp10] = useState("TechCorp Solutions, New York");
  const [workdone1temp10, setWorkdone1temp10] = useState([
    "Key IT Qualifications & Responsibilities",
    "Key IT Achievements",
  ]);
  const handleworkdone1temp10Chnage = (index, value) => {
    const arr = [...workdone1temp10];
    arr[index] = value;
    setWorkdone1temp10(arr);
  };
  const [date2temp10, setDate2temp10] = useState("2013-06 - 2014-12");
  const [post2temp10, setPost2temp10] = useState("Junior IT Specialist");
  const [company2temp10, setCompany2temp10] = useState("StartupXYZ, Brooklyn");
  const [workdone2temp10, setWorkdone2temp10] = useState([
    "Developed and maintained internal systems.",
    "Provided technical support to end users.",
  ]);
  const handleworkdone2temp10Change = (index, value) => {
    const arr = [...workdone2temp10];
    arr[index] = value;
    setWorkdone2temp10(arr);
  };
  const [educationlabeltemp10, setEducationlabeltemp10] = useState("Education");
  const [eduDate1temp10, setEduDate1temp10] = useState("2007-09 - 2012-05");
  const [facultytemp10, setFacultytemp10] = useState("BA in Network Administration");
  const [universitytemp10, setUniversitytemp10] = useState("State University, New York");
  const [gpatemp10, setGpatemp10] = useState("GPA: 3.8");
  const [skillslabeltemp10, setSkillslabeltemp10] = useState("Skills");
  const [skillstemp10, setSkillstemp10] = useState([
    "Agile Development",
    "Cloud Management",
    "Network Security",
    "Database Administration",
  ]);
  const [skillLeveltemp10, setSkillLeveltemp10] = useState([85, 75, 90, 70]);
  const handleskillstemp10Chnage = (index, value) => {
    const arr = [...skillstemp10];
    arr[index] = value;
    setSkillstemp10(arr);
  };
  const handleSkillLeveltemp10Change = (index, value) => {
    const arr = [...skillLeveltemp10];
    arr[index] = Math.min(100, Math.max(0, parseInt(value) || 0));
    setSkillLeveltemp10(arr);
  };

  /** Avoid duplicate runs (e.g. React Strict Mode); allow same resume on a different template to fill again */
  const lastAutoPopulateKeyRef = useRef(null);
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

  // Template 4: address field is a textarea — reflow height when content changes (paste / apply from enhanced CV)
  useEffect(() => {
    if (templateId !== 4) return;
    const el = addressTemp4Ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, 44) + 'px';
  }, [templateId, addresstemp4]);

  // Template 3 top-row textareas (Address/Skills) can grow a lot on long text.
  // When content is replaced programmatically (Copy to template), shrink back to fit.
  useEffect(() => {
    const resize = (el, minH) => {
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = Math.max(el.scrollHeight, minH) + 'px';
    };
    resize(addressTemp3Ref.current, 28);
    resize(skillsTemp3Ref.current, 32);
  }, [addresstemp3, skillstemp3]);

  // Auto-populate template fields from enhanced CV when available
  useEffect(() => {
    if (!enhancedResume || !templateId) return;
    const autoKey = `${templateId}\0${enhancedResume}`;
    if (lastAutoPopulateKeyRef.current === autoKey) return;
    const data = parseEnhancedResumeToStructuredData(enhancedResume);
    if (!data) return;
    lastAutoPopulateKeyRef.current = autoKey;

    if (templateId === 10) {
      if (data.name) setNametemp10(data.name);
      if (data.profession) setProfessiontemp10(data.profession);
      if (data.contact?.address) setAddresstemp10(data.contact.address);
      if (data.contact?.phone) setPhonetemp10(data.contact.phone);
      if (data.contact?.email) setEmailtemp10(data.contact.email);
      if (data.contact?.linkedin) setLinkedintemp10(data.contact.linkedin);
      if (data.summary) setAboutmeinfotemp10(data.summary);
      if (data.skills.length > 0) {
        const skills = data.skills.slice(0, 4);
        setSkillstemp10(skills);
        setSkillLeveltemp10(skills.map((_, i) => 85 - i * 5));
      }
      if (data.experiences.length > 0) {
        const ex0 = data.experiences[0];
        if (ex0.dateRange) setDate1temp10(ex0.dateRange);
        if (ex0.role) setPost1temp10(ex0.role);
        if (ex0.company) setCompany1temp10(ex0.company);
        if (ex0.responsibilities.length > 0) setWorkdone1temp10(ex0.responsibilities.slice(0, 5));
      }
      if (data.experiences.length > 1) {
        const ex1 = data.experiences[1];
        if (ex1.dateRange) setDate2temp10(ex1.dateRange);
        if (ex1.role) setPost2temp10(ex1.role);
        if (ex1.company) setCompany2temp10(ex1.company);
        if (ex1.responsibilities.length > 0) setWorkdone2temp10(ex1.responsibilities.slice(0, 5));
      }
      if (data.education.degree) setFacultytemp10(data.education.degree);
      if (data.education.school) setUniversitytemp10(data.education.school);
      if (data.education.date) setEduDate1temp10(data.education.date);
      if (data.education.gpa) setGpatemp10(data.education.gpa);
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
        const datePart = ex.dateRange ? ` - ${ex.dateRange}` : '';
        if (ex.role) setPost1temp2(ex.role.toUpperCase() + datePart);
        if (ex.company) setCompany1temp2(ex.company);
        if (ex.responsibilities.length > 0) setWorkdone1temp2(ex.responsibilities.slice(0, 3));
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        const datePart = ex.dateRange ? ` - ${ex.dateRange}` : '';
        if (ex.role) setPost2temp2(ex.role.toUpperCase() + datePart);
        if (ex.company) setCompany2temp2(ex.company);
        if (ex.responsibilities.length > 0) setWorkdone2temp2(ex.responsibilities.slice(0, 3));
      }
      if (data.experiences.length > 2) {
        const ex = data.experiences[2];
        const datePart = ex.dateRange ? ` - ${ex.dateRange}` : '';
        if (ex.role) setPost3temp2(ex.role.toUpperCase() + datePart);
        if (ex.company) setCompany3temp2(ex.company);
        if (ex.responsibilities.length > 0) setWorkdone3temp2(ex.responsibilities.slice(0, 3));
      }
      if (data.education.degree) setEducationtemp2(data.education.date ? `${data.education.degree} - ${data.education.date}` : data.education.degree);
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
      const sourceText = typeof text === 'string' ? text : (enhancedResume || editableRefContent || '');
      const t3 = extractTemplate3Content(sourceText);

      // Clear placeholders so only provided content appears.
      setPosttemp3('');
      setPost2temp3('');
      setWorkdonetemp3('');
      setWorkdone2temp3('');
      setSkillstemp3('');
      setAwardstemp3(['', '', '', '']);

      if (data.contact?.phone) setPhone1temp3(data.contact.phone);
      if (data.contact?.email) setEmailtemp3(data.contact.email);
      if (data.contact?.address) setAddresstemp3(data.contact.address);
      if (data.contact?.linkedin) setWebsitetemp3(data.contact.linkedin);

      if (t3.name) setNametemp3(t3.name);
      else if (data.name) setNametemp3(data.name);
      if (t3.profession) setProfessiontemp3(t3.profession);
      else if (data.profession) setProfessiontemp3(data.profession);
      if (t3.skills) setSkillstemp3(t3.skills);
      if (t3.summaryHtml) setAbouttemp3(t3.summaryHtml);

      const awards = [...(t3.awards || [])];
      while (awards.length < 4) awards.push('');
      setAwardstemp3(awards.slice(0, 4));

      setPosttemp3(t3.post1 || '');
      setWorkdonetemp3(t3.work1Html || '');
      setPost2temp3(t3.post2 || '');
      setWorkdone2temp3(t3.work2Html || '');
      setEdu1temp3('');
      setEdu1desctemp3('');
      setEdu2temp3('');
      setEdu2desctemp3('');
      setEdu3temp3('');
      setEdu3desctemp3('');
      if (t3.edu1Title) setEdu1temp3(t3.edu1Title);
      if (t3.edu1Desc) setEdu1desctemp3(t3.edu1Desc);
      if (t3.edu2Title) setEdu2temp3(t3.edu2Title);
      if (t3.edu2Desc) setEdu2desctemp3(t3.edu2Desc);
      if (t3.edu3Title) setEdu3temp3(t3.edu3Title);
      if (t3.edu3Desc) setEdu3desctemp3(t3.edu3Desc);
      if (!t3.edu1Title && data.education.degree) {
        setEdu1temp3(data.education.date ? `${data.education.degree} (${data.education.date})` : data.education.degree);
      }
      if (!t3.edu1Desc && data.education.school) setEdu1desctemp3(data.education.school);
    } else if (templateId === 4) {
      const sourceTextT4 = enhancedResume || editableRefContent || '';
      setSummarytemp4('');
      setCertstemp4(['', '']);
      setSkillstemp4([
        { name: "", level: 0 },
        { name: "", level: 0 },
        { name: "", level: 0 },
        { name: "", level: 0 },
        { name: "", level: 0 },
      ]);
      setLanguagesTemp4([
        { name: "", level: 0 },
        { name: "", level: 0 },
        { name: "", level: 0 },
      ]);
      if (data.profession) setProfessiontemp4(data.profession);
      if (data.summary) setSummarytemp4(plainToRichHtml(toReadableParagraph(data.summary)));
      let skillsT4b = (data.skills || []).filter(Boolean);
      if (skillsT4b.length === 1 && (String(skillsT4b[0]).match(/[,;]/g) || []).length >= 2) {
        skillsT4b = String(skillsT4b[0])
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (skillsT4b.length > 0) {
        setSkillstemp4(
          skillsT4b.slice(0, 5).map((name, i) => ({ name: protectHyphensForT4(name), level: 90 - i * 5 }))
        );
      }
      const langsFromDataB = (data.languages || []).filter(Boolean);
      if (langsFromDataB.length > 0) {
        setLanguagesTemp4(langsFromDataB.slice(0, 3).map((name, i) => ({ name, level: 100 - i * 10 })));
      } else {
        const detectedLangs = extractLanguagesFromText(sourceTextT4, 3);
        if (detectedLangs.length > 0) {
          setLanguagesTemp4(detectedLangs.map((name, i) => ({ name, level: 100 - i * 10 })));
        }
      }
      if (data.contact?.phone) setPhonetemp4(data.contact.phone);
      if (data.contact?.email) setEmailtemp4(data.contact.email);
      if (data.contact?.address) setAddresstemp4(data.contact.address);
      else if (data.contact?.location) setAddresstemp4(data.contact.location);
      if (data.contact?.linkedin) setLinkedintemp4(data.contact.linkedin);
      const certItems = normalizeCertificationItems(data.certifications || [], 4);
      if (certItems.length > 0) {
        setCertstemp4(certItems);
      }
      const summaryBullets = splitParagraphToBullets(data.summary, 4);
      setPosttemp4('');
      setCompanytemp4('');
      setWorkdonetemp4([]);
      setPost2temp4('');
      setCompany2temp4('');
      setWorkdone2temp4([]);
      let hasMeaningfulEmployment = false;
      if (data.experiences.length > 0) {
        const ex = normalizeTemplate4Experience(
          data.experiences[0],
          data.profession || "Professional Experience",
          summaryBullets,
          data.summary || ''
        );
        if (ex.post) setPosttemp4(ex.post);
        if (ex.company) setCompanytemp4(ex.company);
        const w1 = template4BulletsToRichHtml(ex.bullets);
        if (w1.length > 0) {
          setWorkdonetemp4(w1);
          hasMeaningfulEmployment = true;
        }
        if (ex.post?.trim() || ex.company?.trim()) hasMeaningfulEmployment = true;
      }
      if (data.experiences.length > 1) {
        const ex = normalizeTemplate4Experience(
          data.experiences[1],
          "Professional Experience",
          summaryBullets,
          data.summary || ''
        );
        if (ex.post) setPost2temp4(ex.post);
        if (ex.company) setCompany2temp4(ex.company);
        const w2 = template4BulletsToRichHtml(ex.bullets);
        if (w2.length > 0) {
          setWorkdone2temp4(w2);
          hasMeaningfulEmployment = true;
        }
        if (ex.post?.trim() || ex.company?.trim()) hasMeaningfulEmployment = true;
      }
      if (!hasMeaningfulEmployment) {
        setPosttemp4("Please add your data");
        setCompanytemp4("");
        setWorkdonetemp4([plainToRichHtml("Please add your employment history details.")]);
        setPost2temp4("");
        setCompany2temp4("");
        setWorkdone2temp4([]);
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
    } else if (templateId === 6) {
      if (data.name) setNametemp6((data.name.toUpperCase?.() || data.name).trim());
      if (data.profession) setProfessiontemp6(data.profession);
      if (data.contact?.phone) setPhonetemp6(data.contact.phone);
      if (data.contact?.email) setEmailtemp6(data.contact.email);
      if (data.contact?.location) setLocationtemp6(data.contact.location);
      if (data.contact?.linkedin) setLinkedintemp6(data.contact.linkedin);
      if (data.summary) setProfileinfotemp6(data.summary);
      if (data.skills.length > 0) {
        const s = [...data.skills];
        while (s.length < 6) s.push('');
        setSkillstemp6(s.slice(0, 6));
      }
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        if (ex.role) setPost1temp6(ex.role);
        if (ex.company) setComapny1temp6(ex.company);
        if (ex.dateRange) setDate1temp6(ex.dateRange);
        if (ex.location) setCompany1locationtemp6(ex.location);
        const bullets = ex.responsibilities || [];
        const w1 = [...bullets.slice(0, 3)];
        while (w1.length < 3) w1.push('');
        setWorkdone1temp6(w1);
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        if (ex.role) setPost2temp6(ex.role);
        if (ex.company) setCompany2temp6(ex.company);
        if (ex.dateRange) setDate2temp6(ex.dateRange);
        if (ex.location) setCompany2locationtemp6(ex.location);
        const bullets = ex.responsibilities || [];
        const w2 = [...bullets.slice(0, 3)];
        while (w2.length < 3) w2.push('');
        setWorkdone2temp6(w2);
      }
      if (data.education.degree) setFacultytemp6(data.education.degree);
      if (data.education.school) setUniversitytemp6(data.education.school);
      if (data.education.date) setDatetemp6(data.education.date);
    } else if (templateId === 11) {
      if (data.name) setNametemp11(data.name.toUpperCase?.() || data.name);
      if (data.profession) setProfessiontemp11(data.profession);
      if (data.contact?.email) setEmailtemp11(data.contact.email);
      if (data.contact?.phone) setPhonetemp11(data.contact.phone);
      if (data.contact?.location) setLocationtemp11(data.contact.location);
      if (data.contact?.linkedin) setLinkedintemp11(data.contact.linkedin);
      if (data.summary) setSummaryinfotemp11(data.summary);
      if (data.skills.length > 0) setSkillstemp11(data.skills.slice(0, 8));
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        if (ex.dateRange) setDate1temp11(ex.dateRange);
        if (ex.role) setPost1temp11(ex.role);
        if (ex.company) setCompany1temp11(ex.company);
        if (ex.responsibilities.length > 0) setWorkdone1temp11(ex.responsibilities.slice(0, 4));
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        if (ex.dateRange) setDate2temp11(ex.dateRange);
        if (ex.role) setPost2temp11(ex.role);
        if (ex.company) setCompany2temp11(ex.company);
        if (ex.responsibilities.length > 0) setworkdone2temp11(ex.responsibilities.slice(0, 4));
      }
      if (data.experiences.length > 2) {
        const ex = data.experiences[2];
        if (ex.dateRange) setDate3temp11(ex.dateRange);
        if (ex.role) setPost3temp11(ex.role);
        if (ex.company) setCompany3temp11(ex.company);
        if (ex.responsibilities.length > 0) setWorkdone3temp11(ex.responsibilities.slice(0, 4));
      }
      if (data.education.degree) setFacultytemp11(data.education.degree);
      if (data.education.school) setUniversitytemp11(data.education.school);
      if (data.education.date) setDatetemp11(data.education.date);
    } else if (templateId === 12) {
      if (data.name) setNametemp12(data.name);
      if (data.profession) setProfessiontemp12(data.profession);
      if (data.summary) setSummaryinfotemp12(data.summary);
      if (data.contact?.location) setLocationtemp12(data.contact.location);
      if (data.contact?.phone) setPhonetemp12(data.contact.phone);
      if (data.contact?.email) setEmailtemp12(data.contact.email);
      if (data.contact?.linkedin) setLinkedintemp12(data.contact.linkedin);
      if (data.skills.length > 0) {
        const s = [...data.skills];
        while (s.length < 6) s.push('');
        setSkillstemp12(s.slice(0, 8));
      }
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        if (ex.dateRange) setDate1temp12(ex.dateRange);
        if (ex.role) setPost1temp12(ex.role);
        if (ex.company) setCompany1temp12(ex.company);
        if (ex.responsibilities.length > 0) setWorkdone1temp12(ex.responsibilities.slice(0, 5));
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        if (ex.dateRange) setDate2temp12(ex.dateRange);
        if (ex.role) setPost2temp12(ex.role);
        if (ex.company) setCompany2temp12(ex.company);
        if (ex.responsibilities.length > 0) setWorkdone2temp12(ex.responsibilities.slice(0, 5));
      }
      if (data.education.degree) setFacultytemp12(data.education.degree);
      if (data.education.school) setUniversitytemp12(data.education.school);
      if (data.education.gpa) setAwardstemp12(data.education.gpa);
      if (data.certifications?.length) setCertificationstemp12(data.certifications.slice(0, 4));
    } else if (templateId === 13) {
      if (data.name) setNametemp13(data.name);
      if (data.profession) setProfessiontemp13(data.profession);
      if (data.contact?.email) setEmailtemp13(data.contact.email);
      if (data.contact?.linkedin) setLinkedintemp13(data.contact.linkedin);
      if (data.contact?.location) setLocationtemp13(data.contact.location);
      if (data.summary) setSummarytemp13(data.summary);
      if (data.skills.length > 0) setSkillstemp13(data.skills.slice(0, 8));
      if (data.experiences.length > 0) { const ex = data.experiences[0]; if (ex.role) setPost1temp13(ex.role); if (ex.dateRange) setDate1temp13(ex.dateRange); if (ex.company) setCompany1temp13(ex.company); if (ex.location) setLocation1temp13(ex.location); if (ex.responsibilities.length > 0) setWorkdone1temp13(ex.responsibilities.slice(0, 5)); }
      if (data.experiences.length > 1) { const ex = data.experiences[1]; if (ex.role) setPost2temp13(ex.role); if (ex.dateRange) setDate2temp13(ex.dateRange); if (ex.company) setCompany2temp13(ex.company); if (ex.location) setLocation2temp13(ex.location); if (ex.responsibilities.length > 0) setWorkdone2temp13(ex.responsibilities.slice(0, 4)); }
      if (data.education.degree) setFacultytemp13(data.education.degree);
      if (data.education.date) setDateedutemp13(data.education.date);
      if (data.education.school) setUniversitytemp13(data.education.school);
      if (data.certifications?.length) setCertificationstemp13(data.certifications.slice(0, 3).map(c => typeof c === 'string' ? { title: c, issuer: '' } : { title: c.name || c.title || c, issuer: c.issuer || c.provider || '' }));
    } else if (templateId === 14) {
      if (data.name) {
        const parts = data.name.trim().split(/\s+/);
        if (parts.length >= 2) {
          setFirstnametemp14(parts[0].toUpperCase());
          setLastnametemp14(parts.slice(1).join(' ').toUpperCase());
        } else if (parts.length === 1) {
          setFirstnametemp14(parts[0].toUpperCase());
        }
      }
      if (data.contact?.location) setLocationtemp14(data.contact.location);
      if (data.contact?.phone) setPhonetemp14(data.contact.phone);
      if (data.contact?.email) setEmailtemp14(data.contact.email);
      if (data.summary) setSummarytemp14(data.summary);
      if (data.skills.length > 0) setSkillstemp14(data.skills.slice(0, 8));
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        if (ex.role) setPost1temp14(ex.role);
        if (ex.dateRange) setDate1temp14(ex.dateRange);
        if (ex.company) setCompany1temp14(ex.company);
        const w1 = [...(ex.responsibilities || []).slice(0, 5)];
        while (w1.length < 5) w1.push('');
        setWorkdone1temp14(w1);
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        if (ex.role) setPost2temp14(ex.role);
        if (ex.dateRange) setDate2temp14(ex.dateRange);
        if (ex.company) setCompany2temp14(ex.company);
        const w2 = [...(ex.responsibilities || []).slice(0, 5)];
        while (w2.length < 5) w2.push('');
        setWorkdone2temp14(w2);
      }
      if (data.education.degree) setFacultytemp14(data.education.degree);
      if (data.education.school) setUniversitytemp14(data.education.school + (data.education.location ? ` - ${data.education.location}` : ''));
      if (data.experiences.length > 2) {
        const ex = data.experiences[2];
        if (ex.role) setPost3temp14(ex.role);
        if (ex.dateRange) setDate3temp14(ex.dateRange);
        if (ex.company) setCompany3temp14(ex.company);
        const w3 = [...(ex.responsibilities || []).slice(0, 5)];
        while (w3.length < 3) w3.push('');
        setWorkdone3temp14(w3);
      }
    } else if (templateId === 15) {
      if (data.name) setNametemp15(data.name.toUpperCase());
      if (data.contact?.phone) setPhonetemp15(data.contact.phone);
      if (data.contact?.email) setEmailtemp15(data.contact.email);
      if (data.contact?.location) setLocationtemp15(data.contact.location);
      if (data.contact?.linkedin) setLinkedintemp15(data.contact.linkedin);
      if (data.summary) setSummarytemp15(data.summary);
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        if (ex.role) setPost1temp15(ex.role);
        if (ex.dateRange) setDate1temp15(ex.dateRange);
        if (ex.company) setCompany1temp15(ex.company);
        if (ex.location) setLocation1temp15(ex.location);
        if (ex.responsibilities.length > 0) setWorkdone1temp15(ex.responsibilities.slice(0, 5));
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        if (ex.role) setPost2temp15(ex.role);
        if (ex.dateRange) setDate2temp15(ex.dateRange);
        if (ex.company) setCompany2temp15(ex.company);
        if (ex.location) setLocation2temp15(ex.location);
        if (ex.responsibilities.length > 0) setWorkdone2temp15(ex.responsibilities.slice(0, 5));
      }
      if (data.education.school) setUniversitytemp15(data.education.school);
      if (data.education.location) setLocationedutemp15(data.education.location);
      if (data.education.date) setDateedutemp15(data.education.date);
      if (data.education.degree) setDegreetemp15(data.education.degree);
      if (data.skills.length > 0) setTechnicalSkillstemp15(data.skills.slice(0, 8).join(', '));
    } else if (templateId === 16) {
      if (data.name) setNametemp16(data.name.toUpperCase());
      if (data.summary) setProfiletemp16(data.summary);
      if (data.skills.length > 0) {
        const s = [...data.skills];
        while (s.length < 9) s.push('');
        setSkillstemp16(s.slice(0, 9));
      }
      if (data.experiences.length > 0) {
        const ex = data.experiences[0];
        if (ex.company) setCompany1temp16(ex.company);
        if (ex.role) setPost1temp16(ex.role);
        if (ex.dateRange) setDate1temp16(ex.dateRange);
        if (ex.responsibilities.length > 0) {
          setWorkdesc1temp16(ex.responsibilities[0]);
          setWorkdone1temp16(ex.responsibilities.slice(1, 4));
        }
      }
      if (data.experiences.length > 1) {
        const ex = data.experiences[1];
        if (ex.company) setCompany2temp16(ex.company);
        if (ex.role) setPost2temp16(ex.role);
        if (ex.dateRange) setDate2temp16(ex.dateRange);
        if (ex.responsibilities.length > 0) {
          setWorkdesc2temp16(ex.responsibilities[0]);
          setWorkdone2temp16(ex.responsibilities.slice(1, 3));
        }
      }
      if (data.education.school) setUniversitytemp16(data.education.school);
      if (data.education.degree) setFacultytemp16(data.education.degree);
      if (data.education.date) setYear16temp16(data.education.date);
    }
  }, [enhancedResume, templateId]);

  // Generate text-based PDF (editable, properly laid-out - no html2canvas)
  const handleDownloadTextPdf = (useEditableFilename = true) => {
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxYBody = pageHeight - margin;
    const maxYLine = maxYBody - 5;
    const maxYSection = maxYBody - 20;
    const maxWidth = pageWidth - margin * 2;
    const lineHeight = 6;
    let y = 20;

    // Only use Enhanced Reference when no valid template id (e.g. missing URL param gives 0, not falsy-check safe)
    const hasValidCvTemplate = Number.isFinite(templateId) && templateId >= 1 && templateId <= 16;
    const useReferenceContent =
      Boolean(editableRefContent?.trim() && editableRefContent.length > 50 && !hasValidCvTemplate);
    if (useReferenceContent) {
      const data = parseEnhancedResumeToStructuredData(editableRefContent);
      const addSection = (title, content) => {
        if (y > maxYSection) {
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
          if (y > maxYLine) {
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
            const bullets = (ex.responsibilities || []).filter(Boolean).map((r) => r).join('\n');
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
          if (y > maxYLine) {
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
      if (y > maxYSection) {
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
        if (y > maxYLine) {
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
      doc.setTextColor(30, 30, 30);
      doc.text(nametemp10 || 'Your Name', margin, y);
      y += lineHeight;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(professiontemp10 || 'Professional Title', margin, y);
      y += lineHeight;
      const contactLine = [addresstemp10, phonetemp10, emailtemp10, linkedintemp10].filter(Boolean).join(' | ');
      if (contactLine) {
        doc.setFontSize(10);
        doc.text(contactLine, margin, y);
        y += lineHeight;
      }
      y += 4;

      addSection('Summary', aboutmeinfotemp10);
      addSection(experiencetemp10, [
        `${date1temp10 || ''} ${post1temp10} at ${company1temp10}`,
        ...(workdone1temp10.filter(Boolean).map((r) => r)),
        '',
        `${date2temp10 || ''} ${post2temp10} at ${company2temp10}`,
        ...(workdone2temp10.filter(Boolean).map((r) => r)),
      ].join('\n'));
      addSection(educationlabeltemp10, `${facultytemp10}\n${universitytemp10}\n${eduDate1temp10 || ''}\n${gpatemp10 || ''}`);
      const skillsText = skillstemp10.filter(s => s && String(s).trim()).map((s, i) => `${s} (${skillLeveltemp10[i] ?? 0}%)`).join(', ');
      addSection(skillslabeltemp10, skillsText);
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
        ...(responsibilities1.filter(Boolean).map((r) => r)),
        '',
        `${title2} at ${company2}`,
        ...(responsibilities2.filter(Boolean).map((r) => r)),
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
        if (yLeft > maxYSection) return;
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
          if (yLeft > maxYLine) return;
          doc.text(line, leftPad + 2, yLeft);
          yLeft += lineHeight - 0.5;
        });
        yLeft += 6;
      };

      const addRightSection = (title, content) => {
        if (yRight > maxYSection) {
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
          if (yRight > maxYLine) {
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
      addLeftSection(skillslabeltemp7, skillstemp7.filter(s => s && String(s).trim()).map(s => s).join('\n'));
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
      if (summaryinfotemp11) addSection(summarytemp11, summaryinfotemp11);
      addSection(skilllabelstemp11, skillstemp11.filter(s => s && String(s).trim()).join(', '));
      addSection(experiencetemp11, [
        `${date1temp11 || ''} ${post1temp11} at ${company1temp11}`,
        ...(workdone1temp11.filter(Boolean).map((r) => r)),
        '',
        `${date2temp11 || ''} ${post2temp11} at ${company2temp11}`,
        ...(workdone2temp11.filter(Boolean).map((r) => r)),
        '',
        `${date3temp11 || ''} ${post3temp11} at ${company3temp11}`,
        ...(workdone3temp11.filter(Boolean).map((r) => r)),
      ].join('\n'));
      addSection(educationtemp11, `${facultytemp11}\n${universitytemp11}\n${datetemp11 || ''}`);
    } else if (templateId === 3) {
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(nametemp3 || 'Your Name', margin, y);
      y += lineHeight;
      doc.setFontSize(12);
      doc.text(professiontemp3 || 'Professional Title', margin, y);
      y += lineHeight * 2;
      const t3SkillsForPdf = (skillstemp3 || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 10)
        .join(', ');
      addSection('Phone', `${phone1temp3}\n${phone2temp3}`);
      addSection('Address', addresstemp3);
      addSection('Skills', t3SkillsForPdf);
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
        ...(workdone1temp5.filter(Boolean).map((r) => stripHtml(r))),
        '',
        `${company2temp5}\n${company2locationtemp5}\n${post2temp5}\n${date2temp5}`,
        ...(workdone2temp5.filter(Boolean).map((r) => stripHtml(r))),
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
        ...(workdone1temp6.filter(Boolean).map((r) => stripHtml(r))),
        '',
        `${post2temp6} at ${company2temp6} | ${date2temp6}`,
        ...(workdone2temp6.filter(Boolean).map((r) => stripHtml(r))),
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
        if (y > maxYSection) { doc.addPage(); y = 20; }
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
          if (y > maxYLine) { doc.addPage(); y = 20; }
          doc.text(line, centerX, y, { align: 'center' });
          y += lineHeight;
        });
        y += 6;
      };

      const addLeftSection9 = (title, content) => {
        if (yLeft > maxYSection) { doc.addPage(); yLeft = 20; yRight = 20; }
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
          if (yLeft > maxYLine) return;
          doc.text(line, margin, yLeft);
          yLeft += lineHeight - 0.3;
        });
        yLeft += 8;
      };

      const addRightSection9WithTimeline = (title, entries) => {
        if (yRight > maxYSection) { doc.addPage(); yRight = 20; yLeft = 20; }
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
          if (yRight > maxYLine) return;
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
            if (yRight > maxYLine) return;
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
          content: [company1temp9, stripHtml(workdesc1temp9), ...(wrokdone1temp9.filter(Boolean).map((r) => stripHtml(r)))].filter(Boolean).join('\n'),
        },
        {
          title: post2temp9,
          content: [company2temp9, stripHtml(workdesc2temp9), ...(workdone2temp9.filter(Boolean).map((r) => stripHtml(r)))].filter(Boolean).join('\n'),
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
      if (summaryinfotemp12?.trim()) addSection('Professional Summary', summaryinfotemp12);
      addSection(experiencetemp12, [
        `${post1temp12} (${date1temp12 || ''}) at ${company1temp12}`,
        ...(workdone1temp12.filter(Boolean).map((r) => r)),
        '',
        `${post2temp12} (${date2temp12 || ''}) at ${company2temp12}`,
        ...(workdone2temp12.filter(Boolean).map((r) => r)),
      ].join('\n'));
      const contactStr = [locationtemp12, phonetemp12, emailtemp12, linkedintemp12, githublinktemp12].filter(Boolean).join(' | ');
      if (contactStr) addSection('Contact', contactStr);
      if (skillstemp12?.length) addSection('Skills', skillstemp12.filter(Boolean).join(', '));
      addSection(educationtemp12, `${facultytemp12}\n${universitytemp12}\n${awardstemp12 || ''}`);
      if (certificationstemp12?.length) addSection(othertemp12, certificationstemp12.filter(Boolean).join('\n'));
    } else if (templateId === 13) {
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(nametemp13 || 'Your Name', margin, y);
      y += lineHeight;
      doc.setFontSize(12);
      doc.text(professiontemp13 || 'Professional Title', margin, y);
      y += lineHeight * 2;
      addSection('Professional Summary', summarytemp13);
      addSection('Experience', [`${post1temp13} (${date1temp13 || ''}) at ${company1temp13}`, ...(workdone1temp13.filter(Boolean).map((r) => r)), '', `${post2temp13} (${date2temp13 || ''}) at ${company2temp13}`, ...(workdone2temp13.filter(Boolean).map((r) => r))].join('\n'));
      addSection('Education', `${facultytemp13}${dateedutemp13 ? ` (${dateedutemp13})` : ''}\n${universitytemp13}${locationedutemp13 ? `, ${locationedutemp13}` : ''}`);
      addSection('Skills', skillstemp13.filter(s => s && String(s).trim()).join(', '));
      if (achievementstemp13?.length) addSection('Achievements', achievementstemp13.map(a => `${a.title}: ${a.desc || ''}`).filter(Boolean).join('\n'));
      if (projectstemp13?.length) addSection('Projects', projectstemp13.map(p => `${p.title}\n${p.desc || ''}\n${p.link || ''}`).filter(Boolean).join('\n\n'));
      if (certificationstemp13?.length) addSection('Certification', certificationstemp13.map(c => `${c.title} - ${c.issuer || ''}`).filter(Boolean).join('\n'));
      if (passionstemp13?.length) addSection('Passions', passionstemp13.map(p => `${p.title}: ${p.desc || ''}`).filter(Boolean).join('\n'));
      if (languagestemp13?.length) addSection('Languages', languagestemp13.map(l => `${l.name} (${l.level || ''}) ${l.dots || 0}/5`).join(', '));
    } else if (templateId === 14) {
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text((firstnametemp14 || 'FIRST') + ' ', margin, y);
      doc.setTextColor(192, 0, 0);
      doc.text(lastnametemp14 || 'LAST', margin + doc.getTextWidth((firstnametemp14 || 'FIRST') + ' '), y);
      doc.setTextColor(0, 0, 0);
      y += lineHeight + 4;
      doc.setFillColor(0, 0, 0);
      doc.rect(0, y - 3, pageWidth, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const contactStr14 = [locationtemp14, phonetemp14, emailtemp14].filter(Boolean).join(' | ');
      doc.text(contactStr14, margin, y + 6, { align: 'left' });
      doc.setTextColor(0, 0, 0);
      y += 14;
      addSection('Professional Summary', summarytemp14);
      const workHist14 = [
        `${post1temp14} (${date1temp14 || ''})`, company1temp14, ...(workdone1temp14.filter(Boolean).map((r) => '• ' + r)),
        '', `${post2temp14} (${date2temp14 || ''})`, company2temp14, ...(workdone2temp14.filter(Boolean).map((r) => '• ' + r))
      ];
      if (post3temp14 || company3temp14) {
        workHist14.push('', `${post3temp14} (${date3temp14 || ''})`, company3temp14, ...(workdone3temp14.filter(Boolean).map((r) => '• ' + r)));
      }
      addSection('Work History', workHist14.join('\n'));
      addSection('Skills', skillstemp14.filter(s => s && String(s).trim()).map(s => '• ' + s).join('\n'));
      const edu14 = [facultytemp14, universitytemp14];
      if (faculty2temp14 || university2temp14) edu14.push('', faculty2temp14, university2temp14);
      addSection('Education', edu14.filter(Boolean).join('\n'));
    } else if (templateId === 15) {
      doc.setFontSize(20);
      doc.setFont('times', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text((nametemp15 || 'YOUR NAME').toUpperCase(), pageWidth / 2, y, { align: 'center' });
      y += lineHeight + 2;
      doc.setDrawColor(180, 180, 180);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const contact15 = [phonetemp15, emailtemp15, locationtemp15, linkedintemp15].filter(Boolean).join(' | ');
      doc.text(contact15, pageWidth / 2, y, { align: 'center' });
      y += lineHeight * 2;
      addSection('SUMMARY', summarytemp15);
      const work15 = [`${post1temp15} (${date1temp15 || ''})`, `${company1temp15}${location1temp15 ? ' | ' + location1temp15 : ''}`, ...(workdone1temp15.filter(Boolean).map((r) => '• ' + r)), '', `${post2temp15} (${date2temp15 || ''})`, `${company2temp15}${location2temp15 ? ' | ' + location2temp15 : ''}`, ...(workdone2temp15.filter(Boolean).map((r) => '• ' + r))];
      addSection('PROFESSIONAL EXPERIENCE', work15.join('\n'));
      addSection('EDUCATION', `${universitytemp15}${locationedutemp15 ? ' - ' + locationedutemp15 : ''} (${dateedutemp15 || ''})\n${degreetemp15}${majortemp15 ? ', ' + majortemp15 : ''}`);
      addSection('SKILLS', `Technical Skills: ${technicalSkillstemp15}\nSoft Skills: ${softSkillstemp15}\nLanguages: ${languagesTemp15}`);
    } else if (templateId === 16) {
      const centerX = pageWidth / 2;
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text((nametemp16 || 'YOUR NAME').toUpperCase(), centerX, y, { align: 'center' });
      y += lineHeight + 4;
      doc.setFillColor(232, 232, 232);
      doc.rect(0, y - 3, pageWidth, 10, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      const contactStr = [locationtemp16, phonetemp16, emailtemp16, linkedintemp16].filter(Boolean).join(' | ');
      doc.text(contactStr, centerX, y + 4, { align: 'center' });
      y += 14;
      const addSection16 = (title, content) => {
        if (y > maxYSection) { doc.addPage(); y = 20; }
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.2);
        doc.line(margin, y, pageWidth - margin, y);
        y += 4;
        if (title) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          const spaced = (title || '').split('').join(' ');
          doc.text(spaced.toUpperCase(), centerX, y, { align: 'center' });
          y += 4;
        }
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        const lines = doc.splitTextToSize(content || '', maxWidth);
        lines.forEach((line) => {
          if (y > maxYLine) { doc.addPage(); y = 20; }
          doc.text(line, margin, y);
          y += lineHeight;
        });
        y += 6;
      };
      addSection16('PROFESSIONAL PROFILE', stripHtml(profiletemp16));
      addSection16(skillslabeltemp16, skillstemp16.filter(Boolean).join('\n'));
      if (y > maxYSection) { doc.addPage(); y = 20; }
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.2);
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      const workSpaced = (worklabeltemp16 || 'WORK EXPERIENCE').split('').join(' ');
      doc.text(workSpaced.toUpperCase(), centerX, y, { align: 'center' });
      y += 4;
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;
      const addWorkEntry16 = (company, title, date, loc, desc, bullets) => {
        if (y > maxYSection) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(company || '', margin, y);
        doc.text((date || '') + (loc ? '  ' + loc : ''), pageWidth - margin, y, { align: 'right' });
        y += lineHeight - 1;
        doc.setFont('helvetica', 'normal');
        doc.text(title || '', margin, y);
        y += lineHeight + 2;
        doc.setFontSize(9);
        doc.setTextColor(55, 55, 55);
        const descLines = doc.splitTextToSize(stripHtml(desc || ''), maxWidth);
        descLines.forEach((l) => { if (y > maxYLine) return; doc.text(l, margin, y); y += lineHeight - 0.5; });
        (bullets || []).filter(Boolean).forEach((b) => {
          if (y > maxYLine) return;
          doc.text(stripHtml(b), margin + 4, y);
          y += lineHeight - 0.5;
        });
        y += 4;
      };
      addWorkEntry16(company1temp16, post1temp16, date1temp16, location1temp16, workdesc1temp16, workdone1temp16);
      addWorkEntry16(company2temp16, post2temp16, date2temp16, location2temp16, workdesc2temp16, workdone2temp16);
      if (y > maxYSection) { doc.addPage(); y = 20; }
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.2);
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      const eduSpaced = (educationlabeltemp16 || 'EDUCATION').split('').join(' ');
      doc.text(eduSpaced.toUpperCase(), centerX, y, { align: 'center' });
      y += 4;
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(universitytemp16 || '', margin, y);
      doc.text((year16temp16 || '') + (location16temp16 ? '  ' + location16temp16 : ''), pageWidth - margin, y, { align: 'right' });
      y += lineHeight;
      doc.setFont('helvetica', 'normal');
      doc.text(facultytemp16 || '', margin, y);
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

  // Template 11 - Ryland Mayfield style: two-column, gold border, serif
  const [nametemp11, setNametemp11] = useState("RYLAND MAYFIELD");
  const [professiontemp11, setProfessiontemp11] = useState("IT Manager");
  const [emailtemp11, setEmailtemp11] = useState("ryland.mayfield@email.com");
  const [phonetemp11, setPhonetemp11] = useState("(555) 123-4567");
  const [locationtemp11, setLocationtemp11] = useState("Miami, FL");
  const [linkedintemp11, setLinkedintemp11] = useState("linkedin.com/in/rylandmayfield");
  const [summarytemp11, setSummarytemp11] = useState("Summary"); // label, kept for PDF fallback
  const [summaryinfotemp11, setSummaryinfotemp11] = useState(""); // kept for auto-populate
  const [experiencetemp11, setExperiencetemp11] = useState("WORK EXPERIENCE");
  const [date1temp11, setDate1temp11] = useState("August 2025 - Current");
  const [post1temp11, setPost1temp11] = useState("IT Manager");
  const [company1temp11, setCompany1temp11] = useState("Halcyon Financial Technology");
  const [workdone1temp11, setWorkdone1temp11] = useState([
    "Led IT infrastructure and team management.",
    "Implemented security best practices across the organization.",
  ]);
  const handleworkdone1temp11Change = (index, value) => {
    const arr = [...workdone1temp11];
    arr[index] = value;
    setWorkdone1temp11(arr);
  };
  const [date2temp11, setDate2temp11] = useState("March 2023 - July 2025");
  const [post2temp11, setPost2temp11] = useState("Systems Administrator");
  const [company2temp11, setCompany2temp11] = useState("Acordis International");
  const [workdone2temp11, setworkdone2temp11] = useState([
    "Managed enterprise systems and endpoints.",
    "Improved system reliability and performance.",
  ]);
  const handleworkdone2temp11Change = (index, value) => {
    const arr = [...workdone2temp11];
    arr[index] = value;
    setworkdone2temp11(arr);
  };
  const [date3temp11, setDate3temp11] = useState("July 2022 - February 2023");
  const [post3temp11, setPost3temp11] = useState("IT Support Specialist");
  const [company3temp11, setCompany3temp11] = useState("Virtuworks");
  const [workdone3temp11, setWorkdone3temp11] = useState([
    "Provided technical support to end users.",
    "Resolved hardware and software issues.",
  ]);
  const handleworkdone3temp11Change = (index, value) => {
    const arr = [...workdone3temp11];
    arr[index] = value;
    setWorkdone3temp11(arr);
  };
  const [educationtemp11, seteducationtemp11] = useState("EDUCATION");
  const [facultytemp11, setFacultytemp11] = useState("Bachelor of Science Information Technology");
  const [universitytemp11, setUniversitytemp11] = useState("Florida State University (2017 - 2021), Tallahassee, FL");
  const [datetemp11, setDatetemp11] = useState("");
  const [skilllabelstemp11, setSkillslabeltemp11] = useState("SKILLS");
  const [skillstemp11, setSkillstemp11] = useState([
    "Jamf Pro",
    "Power BI",
    "ManageEngine Endpoint Central",
    "SentinelOne",
    "NinjaOne",
    "Rubrik",
    "Vendor negotiation",
    "Escalation ownership",
  ]);
  const handleskillstemp11Change = (index, value) => {
    const newskillstemp11 = [...skillstemp11];
    newskillstemp11[index] = value;
    setSkillstemp11(newskillstemp11);
  };

  // Template 11 no longer has summary textarea - ref kept for compatibility

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
  

  // Template 12 - Two-column: main left (name, summary, experience) + sidebar right (contact, skills, education, other)
  const [nametemp12, setNametemp12] = useState("First Last");
  const [professiontemp12, setProfessiontemp12] = useState("Technology VP Sales Professional");
  const [summaryinfotemp12, setSummaryinfotemp12] = useState(
    "Results-driven technology sales leader with 15+ years of experience driving revenue growth and building high-performance teams. Expert in enterprise software solutions and strategic partnerships."
  );
  const [experiencetemp12, setExperiencetemp12] = useState("WORK EXPERIENCE");
  const [date1temp12, setDate1temp12] = useState("November 2015 – Present");
  const [post1temp12, setPost1temp12] = useState("VP of Sales");
  const [company1temp12, setCompany1temp12] = useState("Resume Worded, New York, NY");
  const [workdone1temp12, setWorkdone1temp12] = useState([
    "Led sales strategy and team of 25 across North America.",
    "Exceeded annual targets by 40% for three consecutive years.",
    "Built strategic partnerships with Fortune 500 clients.",
  ]);
  const handleworkdone1temp12Change = (index, value) => {
    const arr = [...workdone1temp12];
    arr[index] = value;
    setWorkdone1temp12(arr);
  };
  const [date2temp12, setDate2temp12] = useState("March 2012 – October 2015");
  const [post2temp12, setPost2temp12] = useState("Director of Sales");
  const [company2temp12, setCompany2temp12] = useState("Tech Solutions Inc, San Francisco, CA");
  const [workdone2temp12, setWorkdone2temp12] = useState([
    "Grew regional revenue from $2M to $8M annually.",
    "Developed and implemented new sales methodologies.",
  ]);
  const handleworkdone2temp12Change = (index, value) => {
    const arr = [...workdone2temp12];
    arr[index] = value;
    setWorkdone2temp12(arr);
  };
  const [locationtemp12, setLocationtemp12] = useState("New York, NY");
  const [phonetemp12, setPhonetemp12] = useState("(555) 123-4567");
  const [emailtemp12, setEmailtemp12] = useState("first.last@email.com");
  const [linkedintemp12, setLinkedintemp12] = useState("linkedin.com/in/firstlast");
  const [githublinktemp12, setGithublinktemp12] = useState("github.com/firstlast");
  const [skillstemp12, setSkillstemp12] = useState([
    "Enterprise Sales",
    "Team Leadership",
    "Strategic Planning",
    "CRM",
    "Salesforce",
    "Negotiation",
  ]);
  const handleSkillstemp12Change = (i, v) => { const s = [...skillstemp12]; s[i] = v; setSkillstemp12(s); };
  const [educationtemp12, setEducationtemp12] = useState("EDUCATION");
  const [facultytemp12, setFacultytemp12] = useState("MBA, Business Administration");
  const [universitytemp12, setUniversitytemp12] = useState("Stanford University, Stanford, CA (2010 – 2012)");
  const [awardstemp12, setAwardstemp12] = useState("Dean's List, Beta Gamma Sigma");
  const [othertemp12, setOthertemp12] = useState("OTHER");
  const [certificationstemp12, setCertificationstemp12] = useState([
    "Certified Sales Professional (CSP)",
    "AWS Certified Solutions Architect",
  ]);
  const handleCertificationstemp12Change = (i, v) => { const c = [...certificationstemp12]; c[i] = v; setCertificationstemp12(c); };

  // Template 13 - Chloe Martinez two-column (left white, right blue sidebar)
  const [nametemp13, setNametemp13] = useState("Chloe Martinez");
  const [professiontemp13, setProfessiontemp13] = useState("Senior Full Stack Developer | Cloud Solutions Expert");
  const [emailtemp13, setEmailtemp13] = useState("help@enhancv.com");
  const [linkedintemp13, setLinkedintemp13] = useState("linkedin.com/in/chloemartinez");
  const [locationtemp13, setLocationtemp13] = useState("Seattle, Washington");
  const [summarytemp13, setSummarytemp13] = useState("Results-driven full stack developer with 8+ years of experience building scalable cloud solutions. Expert in AWS, Angular, and Node.js.");
  const [post1temp13, setPost1temp13] = useState("Senior Full Stack Developer");
  const [date1temp13, setDate1temp13] = useState("01/2019 - Present");
  const [company1temp13, setCompany1temp13] = useState("Tech Solutions Inc");
  const [location1temp13, setLocation1temp13] = useState("Seattle, WA");
  const [workdone1temp13, setWorkdone1temp13] = useState([
    "Led migration of legacy systems to AWS, reducing costs by 40%.",
    "Built microservices architecture serving 2M+ daily users.",
    "Mentored team of 5 junior developers.",
  ]);
  const handleWorkdone1temp13Change = (i, v) => { const w = [...workdone1temp13]; w[i] = v; setWorkdone1temp13(w); };
  const [post2temp13, setPost2temp13] = useState("Full Stack Developer");
  const [date2temp13, setDate2temp13] = useState("06/2016 - 12/2018");
  const [company2temp13, setCompany2temp13] = useState("StartupXYZ");
  const [location2temp13, setLocation2temp13] = useState("Remote");
  const [workdone2temp13, setWorkdone2temp13] = useState([
    "Developed REST APIs and React frontends.",
    "Collaborated with product team on feature delivery.",
  ]);
  const handleWorkdone2temp13Change = (i, v) => { const w = [...workdone2temp13]; w[i] = v; setWorkdone2temp13(w); };
  const [facultytemp13, setFacultytemp13] = useState("B.S. Computer Science");
  const [dateedutemp13, setDateedutemp13] = useState("2012 - 2016");
  const [universitytemp13, setUniversitytemp13] = useState("University of Washington");
  const [locationedutemp13, setLocationedutemp13] = useState("Seattle, WA");
  const [languagestemp13, setLanguagestemp13] = useState([
    { name: "English", level: "Native", dots: 5 },
    { name: "Spanish", level: "Advanced", dots: 4 },
  ]);
  const handleLanguagetemp13Change = (i, field, v) => { const l = [...languagestemp13]; l[i] = { ...l[i], [field]: field === 'dots' ? parseInt(v, 10) || 0 : v }; setLanguagestemp13(l); };
  const [achievementstemp13, setAchievementstemp13] = useState([
    { title: "AWS Certified Solutions Architect", desc: "Professional certification" },
    { title: "Tech Lead of the Year", desc: "Internal award 2022" },
  ]);
  const handleAchievementtemp13Change = (i, field, v) => { const a = [...achievementstemp13]; a[i] = { ...a[i], [field]: v }; setAchievementstemp13(a); };
  const [skillstemp13, setSkillstemp13] = useState(["AWS Cloud Services", "Angular & Node.js", "React", "Python", "Docker", "Kubernetes"]);
  const handleSkillstemp13Change = (i, v) => { const s = [...skillstemp13]; s[i] = v; setSkillstemp13(s); };
  const [projectstemp13, setProjectstemp13] = useState([
    { title: "Cloud Migration Tool", desc: "Automated migration scripts for AWS.", link: "github.com/chloe/cloud-migrate" },
    { title: "Real-time Dashboard", desc: "Angular app with WebSocket updates.", link: "github.com/chloe/dashboard" },
  ]);
  const handleProjecttemp13Change = (i, field, v) => { const p = [...projectstemp13]; p[i] = { ...p[i], [field]: v }; setProjectstemp13(p); };
  const [certificationstemp13, setCertificationstemp13] = useState([
    { title: "AWS Solutions Architect", issuer: "Amazon Web Services" },
  ]);
  const handleCertificationtemp13Change = (i, field, v) => { const c = [...certificationstemp13]; c[i] = { ...c[i], [field]: v }; setCertificationstemp13(c); };
  const [passionstemp13, setPassionstemp13] = useState([
    { title: "Open Source", desc: "Contributor to Node.js and Angular" },
    { title: "Mentorship", desc: "Tech community workshops" },
  ]);
  const handlePassiontemp13Change = (i, field, v) => { const p = [...passionstemp13]; p[i] = { ...p[i], [field]: v }; setPassionstemp13(p); };
  const [datetemp13, setDatetemp13] = useState(""); // legacy, use dateedutemp13

  // Template 14 - Solomon Farley (single-column, black/white, red accent)
  const [firstnametemp14, setFirstnametemp14] = useState("SOLOMON");
  const [lastnametemp14, setLastnametemp14] = useState("FARLEY");
  const [locationtemp14, setLocationtemp14] = useState("Washington, DC 20005");
  const [phonetemp14, setPhonetemp14] = useState("555-555-5555");
  const [emailtemp14, setEmailtemp14] = useState("example@example.com");
  const [summarytemp14, setSummarytemp14] = useState("Experienced professional with a strong background in litigation and dispute resolution. Skilled in arbitration, oral debate, and legal research.");
  const [post1temp14, setPost1temp14] = useState("Senior Associate");
  const [date1temp14, setDate1temp14] = useState("01/2019 to Current");
  const [company1temp14, setCompany1temp14] = useState("Law Firm Name");
  const [workdone1temp14, setWorkdone1temp14] = useState(["Led arbitration proceedings", "Conducted legal research", "Prepared litigation documents", "", ""]);
  const handleWorkdone1temp14Change = (i, v) => { const w = [...workdone1temp14]; w[i] = v; setWorkdone1temp14(w); };
  const [post2temp14, setPost2temp14] = useState("Associate Attorney");
  const [date2temp14, setDate2temp14] = useState("06/2016 to 12/2018");
  const [company2temp14, setCompany2temp14] = useState("Previous Law Firm");
  const [workdone2temp14, setWorkdone2temp14] = useState(["Supported senior attorneys", "Drafted motions and briefs", "", "", ""]);
  const handleWorkdone2temp14Change = (i, v) => { const w = [...workdone2temp14]; w[i] = v; setWorkdone2temp14(w); };
  const [skillstemp14, setSkillstemp14] = useState(["Arbitration and litigation", "Oral debate", "Legal research", "Contract negotiation", "Client relations", "Case management", "Case interpretation", "Legal documentation"]);
  const handleSkillstemp14Change = (i, v) => { const s = [...skillstemp14]; s[i] = v; setSkillstemp14(s); };
  const [post3temp14, setPost3temp14] = useState("");
  const [date3temp14, setDate3temp14] = useState("");
  const [company3temp14, setCompany3temp14] = useState("");
  const [workdone3temp14, setWorkdone3temp14] = useState(["", "", ""]);
  const handleWorkdone3temp14Change = (i, v) => { const w = [...workdone3temp14]; w[i] = v; setWorkdone3temp14(w); };
  const [facultytemp14, setFacultytemp14] = useState("J.D.");
  const [universitytemp14, setUniversitytemp14] = useState("Georgetown University - Washington, DC");
  const [faculty2temp14, setFaculty2temp14] = useState("");
  const [university2temp14, setUniversity2temp14] = useState("");

  // Template 15 - Roy J. Weatherspoon (clean single-column, light blue section headers)
  const [nametemp15, setNametemp15] = useState("ROY J. WEATHERSPOON");
  const [phonetemp15, setPhonetemp15] = useState("(555) 555-0123");
  const [emailtemp15, setEmailtemp15] = useState("roy.weatherspoon@email.com");
  const [locationtemp15, setLocationtemp15] = useState("City, State");
  const [linkedintemp15, setLinkedintemp15] = useState("linkedin.com/in/royweatherspoon");
  const [summarytemp15, setSummarytemp15] = useState("Experienced professional with a strong background in leadership and strategic planning. Proven track record of delivering results across diverse industries.");
  const [post1temp15, setPost1temp15] = useState("Professional Title");
  const [date1temp15, setDate1temp15] = useState("9/2023 – Present");
  const [company1temp15, setCompany1temp15] = useState("Company Name");
  const [location1temp15, setLocation1temp15] = useState("City, State");
  const [workdone1temp15, setWorkdone1temp15] = useState(["Key responsibility or achievement", "Another accomplishment", "Third bullet point"]);
  const handleWorkdone1temp15Change = (i, v) => { const w = [...workdone1temp15]; w[i] = v; setWorkdone1temp15(w); };
  const [post2temp15, setPost2temp15] = useState("Previous Role");
  const [date2temp15, setDate2temp15] = useState("6/2020 – 8/2023");
  const [company2temp15, setCompany2temp15] = useState("Previous Company");
  const [location2temp15, setLocation2temp15] = useState("City, State");
  const [workdone2temp15, setWorkdone2temp15] = useState(["Responsibility or achievement", "Another point"]);
  const handleWorkdone2temp15Change = (i, v) => { const w = [...workdone2temp15]; w[i] = v; setWorkdone2temp15(w); };
  const [universitytemp15, setUniversitytemp15] = useState("University Name");
  const [locationedutemp15, setLocationedutemp15] = useState("City, State");
  const [dateedutemp15, setDateedutemp15] = useState("5/2022");
  const [degreetemp15, setDegreetemp15] = useState("Bachelor of Science");
  const [majortemp15, setMajortemp15] = useState("Major");
  const [technicalSkillstemp15, setTechnicalSkillstemp15] = useState("Skill 1, Skill 2, Skill 3");
  const [softSkillstemp15, setSoftSkillstemp15] = useState("Leadership, Communication, Problem-solving");
  const [languagesTemp15, setLanguagesTemp15] = useState("English, Spanish");

  // Template 16 - Professional Clean (Ronnie Romero style: single-column, centered name, contact bar, full-width profile)
  const [nametemp16, setNametemp16] = useState("RONNIE ROMERO");
  const [locationtemp16, setLocationtemp16] = useState("Sydney");
  const [phonetemp16, setPhonetemp16] = useState("(555) 123-4567");
  const [emailtemp16, setEmailtemp16] = useState("ronnie.romero@email.com");
  const [linkedintemp16, setLinkedintemp16] = useState("linkedin.com/in/ronnieromero");
  const [profilelabeltemp16, setProfilelabeltemp16] = useState("PROFESSIONAL PROFILE");
  const [profiletemp16, setProfiletemp16] = useState("Experienced professional with a strong background in project management and team leadership. Proven track record of delivering high-impact results across diverse industries. Skilled in strategic planning, stakeholder engagement, and driving operational excellence.");
  const [skillslabeltemp16, setSkillslabeltemp16] = useState("SKILLS");
  const [skillstemp16, setSkillstemp16] = useState([
    "Engineering Assistance & Support", "Project Budget / Cost Planning", "Key Relationships Building",
    "Project Planning and Scheduling", "Technical Documentation", "Quality Assurance",
    "Process Improvement", "Cross-functional Collaboration", "Risk Management"
  ]);
  const handelskillstemp16 = (i, v) => { const s = [...skillstemp16]; s[i] = v; setSkillstemp16(s); };
  const [worklabeltemp16, setWorklabeltemp16] = useState("WORK EXPERIENCE");
  const [company1temp16, setCompany1temp16] = useState("Georgiou Group");
  const [post1temp16, setPost1temp16] = useState("Senior Project Manager");
  const [date1temp16, setDate1temp16] = useState("2019 – Present");
  const [location1temp16, setLocation1temp16] = useState("Sydney");
  const [workdesc1temp16, setWorkdesc1temp16] = useState("Lead cross-functional teams to deliver complex engineering projects on time and within budget.");
  const [workdone1temp16, setWorkdone1temp16] = useState([
    "Managed projects valued at $2M+ annually.",
    "Improved process efficiency by 25% through lean methodologies.",
    "Mentored junior project managers and analysts."
  ]);
  const handleworkdone1temp16 = (i, v) => { const w = [...workdone1temp16]; w[i] = v; setWorkdone1temp16(w); };
  const [company2temp16, setCompany2temp16] = useState("Ventia Boral Amey Joint Venture");
  const [post2temp16, setPost2temp16] = useState("Project Coordinator");
  const [date2temp16, setDate2temp16] = useState("2016 – 2019");
  const [location2temp16, setLocation2temp16] = useState("Sydney");
  const [workdesc2temp16, setWorkdesc2temp16] = useState("Supported project delivery and client communications.");
  const [workdone2temp16, setWorkdone2temp16] = useState([
    "Coordinated schedules across 5 concurrent projects.",
    "Prepared status reports and presentations for stakeholders."
  ]);
  const handleworkdone2temp16 = (i, v) => { const w = [...workdone2temp16]; w[i] = v; setWorkdone2temp16(w); };
  const [educationlabeltemp16, setEducationlabeltemp16] = useState("EDUCATION");
  const [universitytemp16, setUniversitytemp16] = useState("University of Sydney");
  const [facultytemp16, setFacultytemp16] = useState("B.S. Industrial Engineering");
  const [year16temp16, setYear16temp16] = useState("2016");
  const [location16temp16, setLocation16temp16] = useState("Sydney");

  //end of the states

  const renderTemplate = () => {
    switch (templateId) {
      case 1: {
        // Gray sidebar bars: left-aligned text, vertically centered in the bar
        const t1BarGray =
          'px-3 py-2 text-xs font-bold italic uppercase tracking-wider flex items-center justify-start text-left min-h-[2.5rem] leading-normal';
        // White section bars: text vertically in the middle of the white strip (not horizontal “page” centre)
        const t1BarWhiteCls =
          'w-full px-3 py-2.5 text-xs font-bold italic uppercase tracking-wider flex items-center justify-start text-left min-h-[3rem] leading-normal';
        const T1Bar = ({ children, className = '' }) => (
          <div className={`bg-gray-600 text-white ${t1BarGray} ${className}`.trim()}>{children}</div>
        );
        const T1BarWhite = ({ children, className = '' }) => (
          <div className={`bg-white text-black ${t1BarWhiteCls} ${className}`.trim()}>{children}</div>
        );
        return (
          <div data-template1 className="w-full max-w-[900px] mx-auto font-sans bg-black min-h-[1273px] overflow-auto max-[520px]:min-h-[1100px]">
            <div className="flex min-h-[1273px] w-full min-w-0 max-[520px]:min-h-[1100px] items-stretch">
              {/* Left Column - Black */}
              <div className="w-[35%] bg-black p-6 text-white flex-shrink-0 overflow-visible self-stretch">
                <div className="flex justify-center mb-6">
                  <div className="w-28 h-28 rounded border-2 border-gray-500 overflow-hidden cursor-pointer" onClick={() => document.getElementById("imgInput1").click()}>
                    <img src={selectedImage1 || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='112' height='112' viewBox='0 0 112 112'%3E%3Crect fill='%23374151' width='112' height='112'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='12'%3EPhoto%3C/text%3E%3C/svg%3E"} alt="Profile" className="w-full h-full object-cover" />
                  </div>
                  <input id="imgInput1" type="file" accept="image/*" onChange={handleImageChange1} className="hidden" />
                </div>
                <T1Bar>About Me</T1Bar>
                <div className="mt-2 mb-4">
                  <textarea value={brief} onChange={(e) => setBrief(e.target.value)} onInput={(e) => resizeTextareaOnInput(e, 60)} className="w-full bg-transparent text-white text-xs resize-y italic min-h-[120px] max-h-[450px] overflow-y-auto block py-1 leading-relaxed hyphens-none" rows={12} placeholder="Brief about yourself..." style={{ wordBreak: 'normal', overflowWrap: 'break-word' }} />
                </div>
                <T1Bar className="mt-4">Skills</T1Bar>
                <ul className="mt-2 space-y-2 mb-4">
                  {skills.map((s, i) => (
                    <li key={i} className="flex gap-2 text-xs w-full items-start">
                      <span className="text-white flex-shrink-0 pt-1">-</span>
                      <textarea value={s} onChange={(e) => handleSkillChange(i, e.target.value)} onInput={(e) => resizeTextareaOnInput(e, 24)} rows={2} className="bg-transparent flex-1 min-w-0 text-white placeholder-white/50 py-0.5 resize-none overflow-y-auto min-h-[36px] max-h-[72px] w-full hyphens-none" style={{ wordBreak: 'normal', overflowWrap: 'break-word' }} />
                    </li>
                  ))}
                </ul>
                <T1Bar className="mt-4">Contact</T1Bar>
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
              <div className="w-[65%] relative overflow-visible flex-shrink-0 self-stretch min-h-0">
                <div className="absolute inset-0" style={{ backgroundColor: "#374151", clipPath: "circle(85% at 100% 50%)" }} />
                <div className="relative z-10 p-8 overflow-visible">
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="text-3xl font-bold italic bg-transparent text-white uppercase tracking-wider w-full placeholder-white/70" placeholder="YOUR NAME" />
                  <input type="text" value={profession} onChange={(e) => setProfession(e.target.value)} className="text-base italic bg-transparent text-white/90 mt-1 w-full placeholder-white/70" placeholder="Freelance Software Developer" />
                  <div className="mt-8 space-y-6 overflow-visible">
                    <div>
                      <T1BarWhite>Experience</T1BarWhite>
                      <div className="mt-2 text-white text-sm space-y-3">
                        <div>
                          <input type="text" value={title1} onChange={(e) => setTitle1(e.target.value)} className="font-semibold bg-transparent w-full text-white placeholder-white/70" placeholder="Job Title" />
                          <input type="text" value={company1} onChange={(e) => setCompany1(e.target.value)} className="bg-transparent w-full text-white/90 text-xs placeholder-white/60" placeholder="Company (Year-Year)" />
                          <ul className="list-none pl-4 mt-1 space-y-1">
                            {responsibilities1.map((r, i) => (
                              <li key={i}><textarea value={r} onChange={(e) => handleResponsibilitiesChange1(i, e.target.value)} onInput={(e) => resizeTextareaOnInput(e, 24)} rows={2} className="bg-transparent w-full text-white/90 text-xs resize-none min-h-[24px] overflow-y-auto py-0 hyphens-none" style={{ wordBreak: 'normal', overflowWrap: 'break-word' }} /></li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <input type="text" value={title2} onChange={(e) => setTitle2(e.target.value)} className="font-semibold bg-transparent w-full text-white placeholder-white/70" placeholder="Job Title 2" />
                          <input type="text" value={company2} onChange={(e) => setCompany2(e.target.value)} className="bg-transparent w-full text-white/90 text-xs placeholder-white/60" placeholder="Company (Year-Year)" />
                          <ul className="list-none pl-4 mt-1 space-y-1">
                            {responsibilities2.map((r, i) => (
                              <li key={i}><textarea value={r} onChange={(e) => handleResponsibilitiesChange2(i, e.target.value)} onInput={(e) => resizeTextareaOnInput(e, 24)} rows={2} className="bg-transparent w-full text-white/90 text-xs resize-none min-h-[24px] overflow-y-auto py-0 hyphens-none" style={{ wordBreak: 'normal', overflowWrap: 'break-word' }} /></li>
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
      }

      case 2:
        const T2Gold = "text-amber-800";
        const T2Divider = <div className="w-px bg-amber-700/60 self-stretch" />;
        return (
          <div data-template2 className="w-full max-w-3xl mx-auto bg-white overflow-hidden font-serif" style={{ height: "1100px" }}>
            {/* Sage green header */}
            <div className="px-8 py-6" style={{ backgroundColor: "#d4e4d4" }}>
              <input type="text" value={nametemp2} onChange={(e) => setNametemp2(e.target.value)} className="text-3xl font-bold bg-transparent w-full uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" style={{ color: "#2d5a3d" }} placeholder="JOHN DOE" />
              <input type="text" value={titletemp2} onChange={(e) => setTitletemp2(e.target.value)} className="text-sm font-medium bg-transparent w-full uppercase tracking-[0.2em] mt-1 focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" style={{ color: "#3d6b4d" }} placeholder="ATTORNEY" />
            </div>
            {/* Two columns with orange divider */}
            <div className="flex">
              <div className="w-1/3 p-6 space-y-6">
                <div>
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${T2Gold} mb-2 ${CV_SEC_H3}`}>CONTACT</h3>
                  <input type="text" value={addresstemp2} onChange={(e) => setAddresstemp2(e.target.value)} className="text-sm bg-transparent w-full text-gray-800 mb-1 focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" />
                  <input type="text" value={phonetemp2} onChange={(e) => setPhonetemp2(e.target.value)} className="text-sm bg-transparent w-full text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" />
                  <input type="text" value={emailtemp2} onChange={(e) => setEmailtemp2(e.target.value)} className="text-sm bg-transparent w-full text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" />
                  <input type="text" value={websitetemp2} onChange={(e) => setWebsitetemp2(e.target.value)} className="text-sm bg-transparent w-full text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" />
                </div>
                <div>
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${T2Gold} mb-2 ${CV_SEC_H3}`}>EDUCATION</h3>
                  <input type="text" value={educationtemp2} onChange={(e) => setEducationtemp2(e.target.value)} className="text-sm font-semibold bg-transparent w-full text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" />
                  <input type="text" value={universitytemp2} onChange={(e) => setUniversitytemp2(e.target.value)} className="text-sm italic bg-transparent w-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" />
                  <input type="text" value={educationdetailtemp2} onChange={(e) => setEducationdetailtemp2(e.target.value)} className="text-sm bg-transparent w-full text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" />
                  <input type="text" value={edu2temp2} onChange={(e) => setEdu2temp2(e.target.value)} className="text-sm font-semibold bg-transparent w-full text-gray-800 mt-2 focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" />
                  <input type="text" value={university2temp2} onChange={(e) => setUniversity2temp2(e.target.value)} className="text-sm italic bg-transparent w-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" />
                </div>
                <div>
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${T2Gold} mb-2 ${CV_SEC_H3}`}>KEY SKILLS</h3>
                  <ul className="space-y-1">
                    {skillstemp2.map((s, i) => (
                      <li key={i}><input type="text" value={s} onChange={(e) => handleskillstemp2Change(i, e.target.value)} className="text-sm bg-transparent w-full text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" /></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${T2Gold} mb-2 ${CV_SEC_H3}`}>INTERESTS</h3>
                  <ul className="space-y-1">
                    {intereststemp2.map((x, i) => (
                      <li key={i}><input type="text" value={x} onChange={(e) => handleIntereststemp2Change(i, e.target.value)} className="text-sm bg-transparent w-full text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded px-2 py-1" /></li>
                    ))}
                  </ul>
                </div>
              </div>
              {T2Divider}
              <div data-template2-right className="flex-1 min-w-0 p-6 space-y-6">
                <div className="w-full min-w-0">
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${T2Gold} mb-2 ${CV_SEC_H3}`}>SUMMARY</h3>
                  <RichTextBlock
                    data-template2-summary
                    value={profileinfotemp2}
                    onChange={setProfileinfoTemp2}
                    className="text-sm bg-transparent w-full min-w-0 block text-gray-800 leading-relaxed focus:ring-2 focus:ring-amber-200/70 focus:ring-inset rounded-md px-2 py-1.5"
                    minHeight="80px"
                    placeholder="Professional summary..."
                  />
                </div>
                <div>
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${T2Gold} mb-3 ${CV_SEC_H3}`}>WORK EXPERIENCE</h3>
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
              <div className="min-w-0">
                <p className="font-bold text-black mb-1">Phone</p>
                <input type="text" value={phone1temp3} onChange={(e) => setPhone1temp3(e.target.value)} className="bg-transparent w-full min-w-0 text-gray-800" />
                <input type="text" value={phone2temp3} onChange={(e) => setPhone2temp3(e.target.value)} className="bg-transparent w-full min-w-0 text-gray-800" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-black mb-1">Address</p>
                <textarea
                  ref={addressTemp3Ref}
                  value={addresstemp3}
                  onChange={(e) => setAddresstemp3(e.target.value)}
                  onInput={(e) => resizeTextareaOnInput(e, 28)}
                  style={{ fieldSizing: 'content' }}
                  rows={2}
                  className="bg-transparent w-full min-w-0 text-gray-800 resize-none break-words [overflow-wrap:anywhere] leading-relaxed"
                  placeholder="Address"
                />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-black mb-1">Skills</p>
                <textarea
                  ref={skillsTemp3Ref}
                  value={skillstemp3}
                  onChange={(e) => setSkillstemp3(e.target.value)}
                  onInput={(e) => resizeTextareaOnInput(e, 32)}
                  style={{ fieldSizing: 'content' }}
                  rows={3}
                  className="bg-transparent w-full min-w-0 min-h-[3.5rem] text-gray-800 resize-none break-words [overflow-wrap:anywhere] leading-relaxed"
                  placeholder="Comma-separated skills (wraps to multiple lines)"
                />
              </div>
            </div>
            <div className="border-t-2 border-black mx-6" />
            {/* Two columns */}
            <div className="flex">
              <div className="w-1/3 p-6 space-y-6 min-w-0">
                <div>
                  <h3 className={`text-sm font-bold text-black border-b border-black mb-2 ${CV_SEC_H3}`}>Social Media</h3>
                  <input type="text" value={socialHandleTemp3} onChange={(e) => setSocialHandleTemp3(e.target.value)} className="text-sm bg-transparent w-full text-gray-800 mb-1" />
                  <input type="text" value={websitetemp3} onChange={(e) => setWebsitetemp3(e.target.value)} className="text-sm bg-transparent w-full text-gray-800 mb-1" />
                  <input type="text" value={emailtemp3} onChange={(e) => setEmailtemp3(e.target.value)} className="text-sm bg-transparent w-full text-gray-800" />
                </div>
                <div className="border-t border-gray-400 pt-4 min-w-0">
                  <h3 className={`text-sm font-bold text-black border-b border-black mb-2 ${CV_SEC_H3}`}>About</h3>
                  <RichTextBlock value={abouttemp3} onChange={setAbouttemp3} className="text-sm bg-transparent w-full min-w-0 text-gray-800 leading-relaxed break-words [overflow-wrap:anywhere]" minHeight="60px" placeholder="About you..." />
                </div>
                <div className="border-t border-gray-400 pt-4">
                  <h3 className={`text-sm font-bold text-black border-b border-black mb-2 ${CV_SEC_H3}`}>Awards</h3>
                  <div className="space-y-3">
                    {awardstemp3.map((a, i) => (
                      <div key={i} className="flex gap-3 min-w-0">
                        <span className="text-2xl font-bold text-gray-900 flex-shrink-0" style={{ fontFamily: "Georgia, serif" }}>{String(i + 1).padStart(2, "0")}</span>
                        <input type="text" value={a} onChange={(e) => handleAwardstemp3Change(i, e.target.value)} className="text-sm bg-transparent flex-1 min-w-0 text-gray-800 break-words [overflow-wrap:anywhere]" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex-1 p-6 space-y-6 border-l border-gray-300 min-w-0">
                <div>
                  <h3 className={`text-sm font-bold text-black border-b border-black mb-3 ${CV_SEC_H3}`}>Work Experience</h3>
                  <div className="flex flex-col gap-4 min-w-0">
                    <div className="flex flex-col gap-2 min-w-0 flex-1">
                      <input type="text" value={posttemp3} onChange={(e) => setPosttemp3(e.target.value)} className="shrink-0 text-sm font-bold bg-transparent w-full min-w-0 text-gray-900" placeholder="Job title" />
                      <div className="flex flex-1 min-h-0 min-w-0 flex-col">
                        <RichTextBlock value={workdonetemp3} onChange={setWorkdonetemp3} className="text-sm bg-transparent w-full min-w-0 flex-1 min-h-[3rem] text-gray-800 leading-relaxed break-words [overflow-wrap:anywhere]" minHeight="48px" />
                      </div>
                    </div>
                    <div className="border-t border-gray-400 pt-4 flex flex-col gap-2 min-w-0 flex-1">
                      <input type="text" value={post2temp3} onChange={(e) => setPost2temp3(e.target.value)} className="shrink-0 text-sm font-bold bg-transparent w-full min-w-0 text-gray-900" placeholder="Job title" />
                      <div className="flex flex-1 min-h-0 min-w-0 flex-col">
                        <RichTextBlock value={workdone2temp3} onChange={setWorkdone2temp3} className="text-sm bg-transparent w-full min-w-0 flex-1 min-h-[3rem] text-gray-800 leading-relaxed break-words [overflow-wrap:anywhere]" minHeight="48px" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-t-2 border-black pt-4">
                  <h3 className={`text-sm font-bold text-black border-b border-black mb-3 ${CV_SEC_H3}`}>Educational History</h3>
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
          <div
            data-template4
            className="w-full max-w-4xl mx-auto overflow-visible font-sans antialiased flex flex-col"
            style={{ minHeight: "1268px" }}
          >
            {/* Header: explicit hex + clip-path — same colors in browser & PDF (do not strip clip-path in clone) */}
            <div data-template4-header-row className="relative min-h-[7.5rem] flex-shrink-0 flex items-end overflow-visible pb-3">
              <div
                data-template4-header-bg="left"
                className="absolute inset-0 z-0"
                style={{ backgroundColor: "#e5e7eb", clipPath: "polygon(0 0, 30% 0, 15% 100%, 0 100%)" }}
              />
              <div
                data-template4-header-bg="right"
                className="absolute right-0 top-0 bottom-0 z-0 w-1/2"
                style={{ backgroundColor: accentBlue4, clipPath: "polygon(70% 0, 100% 0, 100% 100%, 85% 100%)" }}
              />
              <div data-template4-header-content className="relative z-20 w-full max-w-full px-4 sm:px-8 flex justify-center items-end">
                <div className="text-center w-full min-w-0 max-w-full">
                  <input data-template4-header="name" type="text" value={nametemp4} onChange={(e) => setNametemp4(e.target.value)} className="text-2xl font-bold bg-transparent text-gray-900 uppercase text-center w-full min-w-0 max-w-full [overflow-wrap:anywhere] leading-tight" placeholder="NAME" />
                  <input data-template4-header="title" type="text" value={profession4} onChange={(e) => setProfessiontemp4(e.target.value)} className="text-base bg-transparent w-full min-w-0 text-gray-700 mt-1 text-center [overflow-wrap:anywhere]" placeholder="Job Title" />
                </div>
              </div>
            </div>
            {/* Flex row: equal-height columns (more reliable than grid for full-height sidebar in editor + html2canvas) */}
            <div
              data-template4-body
              className="flex w-full flex-1 min-h-0 flex-col md:flex-row md:items-stretch md:min-h-[calc(1268px-7.5rem)]"
            >
              <div
                className="flex min-h-0 min-w-0 w-full shrink-0 flex-col p-6 text-white md:w-[33.333%] md:min-w-[260px] md:max-w-[33.333%]"
                style={{ backgroundColor: sidebarBg4 }}
              >
                <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 text-white ${CV_SEC_H3}`}>Personal Info</h3>
                <textarea
                  ref={addressTemp4Ref}
                  data-template4-contact
                  data-template4-contact-address
                  value={addresstemp4}
                  onChange={(e) => setAddresstemp4(e.target.value)}
                  onInput={(e) => resizeTextareaOnInput(e, 44)}
                  rows={2}
                  placeholder="Address"
                  className="text-sm bg-transparent w-full min-w-0 mb-2 placeholder-white/60 break-words [overflow-wrap:anywhere] [word-break:normal] resize-none overflow-hidden leading-snug rounded-none"
                  style={{ minHeight: '44px', fieldSizing: 'content' }}
                />
                <input data-template4-contact type="text" value={phonetemp4} onChange={(e) => setPhonetemp4(e.target.value)} className="text-sm bg-transparent w-full min-w-0 mb-2 placeholder-white/60 break-words [overflow-wrap:anywhere] [word-break:normal]" placeholder="Phone" />
                <input data-template4-contact type="text" value={emailtemp4} onChange={(e) => setEmailtemp4(e.target.value)} className="text-sm bg-transparent w-full min-w-0 mb-2 placeholder-white/60 break-words [overflow-wrap:anywhere] [word-break:normal]" placeholder="Email" />
                <input data-template4-contact type="text" value={linkedintemp4} onChange={(e) => setLinkedintemp4(e.target.value)} className="text-sm bg-transparent w-full min-w-0 underline placeholder-white/60 break-words [overflow-wrap:anywhere] [word-break:normal]" placeholder="LinkedIn" />
                <div className="mt-6">
                  <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 text-white ${CV_SEC_H3}`}>Skills</h3>
                  <div className="space-y-2">
                    {skillstemp4.map((s, i) => (
                      <div key={i}>
                        <div className="flex gap-2 items-start mb-1 w-full min-w-0">
                          <input
                            data-template4-skill-name
                            type="text"
                            value={s.name}
                            onChange={(e) => handleskillstemp4Change(i, 'name', e.target.value)}
                            className="text-sm bg-transparent flex-1 min-w-0 basis-0 placeholder-white/60 leading-snug break-words [overflow-wrap:anywhere] [word-break:normal]"
                          />
                          <input type="number" min={0} max={100} value={s.level} onChange={(e) => handleskillstemp4Change(i, 'level', e.target.value)} className="mt-0.5 w-12 shrink-0 text-xs bg-white/20 text-white rounded px-1" />
                        </div>
                        <div className="h-1 bg-white/30 rounded overflow-hidden">
                          <div className="h-full bg-white rounded" style={{ width: `${Math.min(100, Math.max(0, s.level))}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-6">
                  <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 text-white ${CV_SEC_H3}`}>Languages</h3>
                  <div className="space-y-2">
                    {languagesTemp4.map((lang, i) => (
                      <div key={i}>
                        <div className="flex gap-2 items-start mb-1 w-full min-w-0">
                          <input
                            data-template4-lang-name
                            type="text"
                            value={lang.name}
                            onChange={(e) => handleLanguageTemp4Change(i, 'name', e.target.value)}
                            className="text-sm bg-transparent flex-1 min-w-0 basis-0 placeholder-white/60 leading-snug break-words [overflow-wrap:anywhere] [word-break:normal]"
                          />
                          <input type="number" min={0} max={100} value={lang.level} onChange={(e) => handleLanguageTemp4Change(i, 'level', e.target.value)} className="mt-0.5 w-12 shrink-0 text-xs bg-white/20 text-white rounded px-1" />
                        </div>
                        <div className="h-1 bg-white/30 rounded overflow-hidden">
                          <div className="h-full bg-white rounded" style={{ width: `${Math.min(100, Math.max(0, lang.level))}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Fills remaining sidebar height so the grey column matches the main column (editor + PDF) */}
                <div className="min-h-0 flex-1" aria-hidden="true" />
              </div>
              {/* Right - White main content */}
              <div className="min-w-0 w-full flex-1 bg-white p-8">
                <RichTextBlock
                  value={summarytemp4}
                  onChange={setSummarytemp4}
                  className="text-sm bg-transparent w-full min-w-0 text-gray-800 leading-relaxed mb-6 block break-words [overflow-wrap:anywhere]"
                  minHeight="50px"
                  placeholder="Professional summary..."
                />
                <div className="border-b-2 mb-4" style={{ borderColor: accentBlue4 }}>
                  <h3 className={`text-sm font-bold uppercase text-gray-900 ${CV_SEC_H3}`}>Employment History</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <input type="text" value={posttemp4} onChange={(e) => setPosttemp4(e.target.value)} className="text-sm font-bold bg-transparent w-full text-gray-900" placeholder="Role | Date Range" />
                    <input type="text" value={companytemp4} onChange={(e) => setCompanytemp4(e.target.value)} className="text-sm font-semibold bg-transparent w-full text-gray-700 italic" placeholder="Company, Location" />
                    <ul className="list-none pl-0 mt-2 space-y-1">
                      {workdonetemp4.map((w, i) => (
                        <li key={i}>
                          <RichTextBlock value={w} onChange={(v) => handleworkdoneChange(i, v)} className="text-sm bg-transparent w-full min-w-0 text-gray-700 break-words [overflow-wrap:anywhere]" minHeight="24px" />
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
                          <RichTextBlock value={w} onChange={(v) => handleworkdone2Change(i, v)} className="text-sm bg-transparent w-full min-w-0 text-gray-700 break-words [overflow-wrap:anywhere]" minHeight="24px" />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="mt-8 border-b-2" style={{ borderColor: accentBlue4 }}>
                  <h3 className={`text-sm font-bold uppercase text-gray-900 ${CV_SEC_H3}`}>Education</h3>
                </div>
                <div className="mt-4">
                  <input type="text" value={facultytemp4} onChange={(e) => setFacultytemp4(e.target.value)} className="text-sm font-bold bg-transparent w-full text-gray-900" placeholder="Degree | Year" />
                  <input type="text" value={collegetemp4} onChange={(e) => setCollegetemp4(e.target.value)} className="text-sm bg-transparent w-full text-gray-700" placeholder="School" />
                </div>
                <div className="mt-8 border-b-2" style={{ borderColor: accentBlue4 }}>
                  <h3 className={`text-sm font-bold uppercase text-gray-900 ${CV_SEC_H3}`}>Certifications</h3>
                </div>
                <ul className="list-none pl-0 mt-4 space-y-1">
                  {certstemp4.map((c, i) => (
                    <li key={i}>
                      <input type="text" value={c} onChange={(e) => handleCertTemp4Change(i, e.target.value)} className="text-sm bg-transparent w-full min-w-0 text-gray-700 break-words [overflow-wrap:anywhere]" />
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
                    className={`text-xs font-normal uppercase tracking-wider bg-transparent text-gray-500 mb-3 w-full ${CV_SEC_IN}`}
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
                    className={`text-xs font-normal uppercase tracking-wider bg-transparent text-gray-500 mb-3 w-full ${CV_SEC_IN}`}
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
                    className={`text-xs font-normal uppercase tracking-wider bg-transparent text-gray-500 mb-3 w-full ${CV_SEC_IN}`}
                  />
                  <ul className="space-y-2">
                    {skillsdetailtemp5.map((item, index) => (
                      <li key={index} className="flex gap-2">
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
                  <input type="text" value={summarylabeltemp6} onChange={(e) => setSummarylabeltemp6(e.target.value)} className={`text-xs font-bold uppercase tracking-wider bg-transparent border-b-2 border-black mb-3 w-full ${CV_SEC_IN}`} />
                  <RichTextBlock value={profileinfotemp6} onChange={setProfileinfotemp6} className="text-sm bg-transparent w-full text-gray-800 leading-relaxed" minHeight="60px" placeholder="Professional summary..." />
                </div>

                <div className="mb-6">
                  <input type="text" value={experiencetemp6} onChange={(e) => setExpriencetemp6(e.target.value)} className={`text-xs font-bold uppercase tracking-wider bg-transparent border-b-2 border-black mb-3 w-full ${CV_SEC_IN}`} />
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
                          <RichTextBlock value={item} onChange={(v) => handleworkdone2temp6Change(index, v)} className="text-sm bg-transparent flex-1 min-w-0 text-gray-800 leading-snug" minHeight="24px" />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <input type="text" value={educationlabeltemp6} onChange={(e) => setEducationlabeltemp6(e.target.value)} className={`text-xs font-bold uppercase tracking-wider bg-transparent border-b-2 border-black mb-3 w-full ${CV_SEC_IN}`} />
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
                  <input type="text" value={achievementslabeltemp6} onChange={(e) => setAchievementslabeltemp6(e.target.value)} className={`text-xs font-bold uppercase tracking-wider bg-transparent border-b-2 border-black mb-3 w-full ${CV_SEC_IN}`} />
                  {achievementstemp6.map((a, i) => (
                    <div key={i} className="mb-3">
                      <input type="text" value={a.title} onChange={(e) => handleAchievementtemp6Change(i, "title", e.target.value)} className="text-sm font-bold bg-transparent w-full" />
                      <RichTextBlock value={a.desc} onChange={(v) => handleAchievementtemp6Change(i, "desc", v)} className="text-sm bg-transparent w-full text-gray-700 leading-snug" minHeight="24px" />
                    </div>
                  ))}
                </div>

                <div className="mb-6">
                  <input type="text" value={skillslabeltemp6} onChange={(e) => setSkillslabeltemp6(e.target.value)} className={`text-xs font-bold uppercase tracking-wider bg-transparent border-b-2 border-black mb-3 w-full ${CV_SEC_IN}`} />
                  <div className="flex flex-wrap gap-2">
                    {skillstemp6.map((s, i) => (
                      <input key={i} type="text" value={s} onChange={(e) => handleSkillstemp6Change(i, e.target.value)} className="px-2 py-1 text-xs bg-gray-100 rounded" />
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <input type="text" value={courseslabeltemp6} onChange={(e) => setCourseslabeltemp6(e.target.value)} className={`text-xs font-bold uppercase tracking-wider bg-transparent border-b-2 border-black mb-3 w-full ${CV_SEC_IN}`} />
                  {coursestemp6.map((c, i) => (
                    <div key={i} className="mb-3">
                      <input type="text" value={c.title} onChange={(e) => handleCoursestemp6Change(i, "title", e.target.value)} className="text-sm font-bold bg-transparent w-full" style={{ color: accentBlue6 }} />
                      <RichTextBlock value={c.desc} onChange={(v) => handleCoursestemp6Change(i, "desc", v)} className="text-sm bg-transparent w-full text-gray-700 leading-snug" minHeight="24px" />
                    </div>
                  ))}
                </div>

                <div>
                  <input type="text" value={passionslabeltemp6} onChange={(e) => setPassionslabeltemp6(e.target.value)} className={`text-xs font-bold uppercase tracking-wider bg-transparent border-b-2 border-black mb-3 w-full ${CV_SEC_IN}`} />
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
                <div className={`bg-gray-600 rounded-lg px-3 ${CV_SEC_H3_C} text-black`}>
                  <input type="text" value={contactlabeltemp7} onChange={(e) => setContactlabeltemp7(e.target.value)} className="text-xs font-bold uppercase bg-transparent w-full text-center text-black min-h-0 py-0" />
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

                <div className={`bg-gray-600 rounded-lg px-3 ${CV_SEC_H3_C} text-black`}>
                  <input type="text" value={skillslabeltemp7} onChange={(e) => setSkillslabeltemp7(e.target.value)} className="text-xs font-bold uppercase bg-transparent w-full text-center text-black min-h-0 py-0" />
                </div>
                <ul className="space-y-1.5 text-sm text-left pl-2">
                  {skillstemp7.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <input type="text" value={s} onChange={(e) => handleSkillstemp7Change(i, e.target.value)} className="bg-transparent flex-1 text-white placeholder-white/50 text-sm" />
                    </li>
                  ))}
                </ul>

                <div className={`bg-gray-600 rounded-lg px-3 ${CV_SEC_H3_C} text-black`}>
                  <input type="text" value={educationlabeltemp7} onChange={(e) => setEducationlabeltemp7(e.target.value)} className="text-xs font-bold uppercase bg-transparent w-full text-center text-black min-h-0 py-0" />
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
              <input type="text" value={profilelabeltemp7} onChange={(e) => setProfilelabeltemp7(e.target.value)} className={`text-sm font-bold uppercase tracking-wide bg-transparent border-b-2 border-black mb-4 w-full text-gray-900 ${CV_SEC_IN}`} />
              <RichTextBlock value={profiletemp7} onChange={setProfiletemp7} className="text-sm bg-transparent w-full text-gray-800 leading-relaxed mb-8" minHeight="120px" placeholder="Profile..." />

              <input type="text" value={worklabeltemp7} onChange={(e) => setWorklabeltemp7(e.target.value)} className={`text-sm font-bold uppercase tracking-wide bg-transparent border-b-2 border-black mb-4 w-full text-gray-900 ${CV_SEC_IN}`} />
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
                <input type="text" value={aboutlabeltemp8} onChange={(e) => setAboutlabeltemp8(e.target.value)} className={`text-sm font-bold uppercase tracking-wide bg-transparent border-b border-gray-800 mb-3 w-full text-gray-800 ${CV_SEC_IN}`} />
                <RichTextBlock value={abouttemp8} onChange={setAbouttemp8} className="text-sm bg-transparent w-full text-gray-700 leading-relaxed" minHeight="80px" placeholder="About you..." />
              </div>

              {/* Education - 3 columns */}
              <div>
                <input type="text" value={educationlabeltemp8} onChange={(e) => setEducationlabeltemp8(e.target.value)} className={`text-sm font-bold uppercase tracking-wide bg-transparent border-b border-gray-800 mb-4 w-full text-gray-800 ${CV_SEC_IN}`} />
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
                <input type="text" value={worklabeltemp8} onChange={(e) => setWorklabeltemp8(e.target.value)} className={`text-sm font-bold uppercase tracking-wide bg-transparent border-b border-gray-800 mb-4 w-full text-gray-800 ${CV_SEC_IN}`} />
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
                className={`text-xs font-medium tracking-[0.35em] uppercase bg-transparent mb-3 block w-full text-center ${CV_SEC_IN}`}
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
                    className={`text-xs font-medium tracking-[0.35em] uppercase bg-transparent mb-4 block w-full text-[#333333] ${CV_SEC_IN}`}
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
                    className={`text-xs font-medium tracking-[0.35em] uppercase bg-transparent text-[#333333] mb-4 block w-full ${CV_SEC_IN}`}
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
                    className={`text-xs font-medium tracking-[0.35em] uppercase bg-transparent text-[#333333] mb-4 block w-full ${CV_SEC_IN}`}
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
                  className={`text-xs font-medium tracking-[0.35em] uppercase bg-transparent text-[#333333] mb-6 block w-full min-w-0 ${CV_SEC_IN}`}
                />

                {/* Job 1 */}
                <div className="relative pl-6 mb-10">
                  <div className="absolute left-0 top-2 w-3 h-3 rounded-full border-2 -ml-[7px]" style={{ borderColor: accent9, backgroundColor: "transparent" }} />
                  <input type="text" value={post1temp9} onChange={(e) => setPost1temp9(e.target.value)} className="text-sm font-bold uppercase bg-transparent w-full text-[#333333]" placeholder="Job Position" />
                  <input type="text" value={company1temp9} onChange={(e) => setCompany1temp9(e.target.value)} className="text-sm bg-transparent w-full text-[#555555] mt-0.5" placeholder="Company/Location/Years" />
                  <RichTextBlock value={workdesc1temp9} onChange={setWorkdesc1temp9} className="text-sm bg-transparent w-full text-[#333333] mt-2 leading-relaxed" minHeight="40px" />
                  <ul className="mt-2 space-y-1 pl-4 list-none text-sm text-[#333333]">
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
                  <ul className="mt-2 space-y-1 pl-4 list-none text-sm text-[#333333]">
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
            data-template10
            className="w-full max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-lg overflow-visible text-gray-800"
            style={{ minHeight: "1100px" }}
          >
            <div className="min-h-full overflow-visible">
              {/* Header - name top-left, title below */}
              <div className="mb-4">
                <input type="text"
                  value={nametemp10}
                  onChange={(e) => setNametemp10(e.target.value)}
                  placeholder="Your Name"
                  className="font-bold text-3xl bg-transparent w-full text-black break-words"
                />
                <input type="text"
                  value={professiontemp10}
                  onChange={(e) => setProfessiontemp10(e.target.value)}
                  placeholder="Professional Title"
                  className="text-base font-semibold mt-1 bg-transparent w-full text-gray-600 break-words"
                />
              </div>

              {/* Contact - two columns */}
              <div data-template10-contact className="flex flex-wrap gap-x-12 gap-y-1 mb-6 text-sm">
                <div className="space-y-1">
                  <div><span className="font-bold text-gray-700">Address</span> <input type="text" value={addresstemp10} onChange={(e) => setAddresstemp10(e.target.value)} className="bg-transparent inline w-64" placeholder="Street, City, State" /></div>
                  <div><span className="font-bold text-gray-700">Phone</span> <input type="text" value={phonetemp10} onChange={(e) => setPhonetemp10(e.target.value)} className="bg-transparent inline w-40" placeholder="Phone" /></div>
                  <div><span className="font-bold text-gray-700">E-mail</span> <input type="text" value={emailtemp10} onChange={(e) => setEmailtemp10(e.target.value)} className="bg-transparent inline w-48" placeholder="Email" /></div>
                </div>
                <div>
                  <div><span className="font-bold text-gray-700">LinkedIn</span> <input type="text" value={linkedintemp10} onChange={(e) => setLinkedintemp10(e.target.value)} className="bg-transparent inline w-56" placeholder="linkedin.com/in/username" /></div>
                </div>
              </div>

              {/* Summary */}
              <textarea
                ref={aboutMeTemp10Ref}
                value={aboutmeinfotemp10}
                onChange={(e) => setAboutmeinfotemp10(e.target.value)}
                onInput={(e) => resizeTextareaOnInput(e, 60)}
                className="text-sm bg-transparent resize-none w-full min-h-[60px] break-words overflow-y-auto text-gray-700 leading-relaxed mb-8"
                placeholder="Professional summary..."
              />

              {/* Section: Experience - pixel-art computer icon + title + line */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-2 min-h-[3.25rem]">
                  <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center self-center" style={{ backgroundColor: '#4A90D9' }} title="Experience">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="white"><rect x="1" y="2" width="12" height="8" rx="1"/><rect x="2" y="3" width="10" height="5"/><rect x="4" y="9" width="2" height="2"/><rect x="8" y="9" width="2" height="2"/><rect x="5" y="11" width="4" height="1"/></svg>
                  </div>
                  <input type="text" value={experiencetemp10} onChange={(e) => setExperiencetemp10(e.target.value)} className={`font-bold text-base bg-transparent flex-1 border-b-2 border-gray-600 ${CV_SEC_IN}`} />
                </div>
                <div className="flex gap-6 mt-4">
                  <div className="flex-shrink-0 text-sm text-gray-600 text-right" style={{ width: '22%', minWidth: '100px' }}>
                    <input type="text" value={date1temp10} onChange={(e) => setDate1temp10(e.target.value)} className="bg-transparent w-full text-right" placeholder="YYYY-MM - YYYY-MM" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <input type="text" value={post1temp10} onChange={(e) => setPost1temp10(e.target.value)} className="font-bold text-sm w-full bg-transparent" placeholder="Job Title" />
                    <input type="text" value={company1temp10} onChange={(e) => setCompany1temp10(e.target.value)} className="text-sm text-gray-600 w-full bg-transparent block mt-0.5" placeholder="Company, Location" />
                    <ul className="mt-2 space-y-1 list-none pl-0 text-sm">
                      {workdone1temp10.map((item, i) => (
                        <li key={i} className="flex gap-2">
                          <textarea value={item} onChange={(e) => handleworkdone1temp10Chnage(i, e.target.value)} onInput={(e) => resizeTextareaOnInput(e, 24)} className="bg-transparent flex-1 text-sm resize-none min-h-[24px]" rows={1} placeholder="Responsibility" />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="flex gap-6 mt-5">
                  <div className="flex-shrink-0 text-sm text-gray-600 text-right" style={{ width: '22%', minWidth: '100px' }}>
                    <input type="text" value={date2temp10} onChange={(e) => setDate2temp10(e.target.value)} className="bg-transparent w-full text-right" placeholder="YYYY-MM - YYYY-MM" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <input type="text" value={post2temp10} onChange={(e) => setPost2temp10(e.target.value)} className="font-bold text-sm w-full bg-transparent" placeholder="Job Title" />
                    <input type="text" value={company2temp10} onChange={(e) => setCompany2temp10(e.target.value)} className="text-sm text-gray-600 w-full bg-transparent block mt-0.5" placeholder="Company, Location" />
                    <ul className="mt-2 space-y-1 list-none pl-0 text-sm">
                      {workdone2temp10.map((item, i) => (
                        <li key={i} className="flex gap-2">
                          <textarea value={item} onChange={(e) => handleworkdone2temp10Change(i, e.target.value)} onInput={(e) => resizeTextareaOnInput(e, 24)} className="bg-transparent flex-1 text-sm resize-none min-h-[24px]" rows={1} placeholder="Responsibility" />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Section: Education - pixel-art graduation cap icon */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-2 min-h-[3.25rem]">
                  <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center self-center" style={{ backgroundColor: '#6B5B95' }} title="Education">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="white"><path d="M7 2L1 5h12L7 2zm0 2l4 2.5v4H3v-4L7 4zM4 9h6v3H4V9z"/></svg>
                  </div>
                  <input type="text" value={educationlabeltemp10} onChange={(e) => setEducationlabeltemp10(e.target.value)} className={`font-bold text-base bg-transparent flex-1 border-b-2 border-gray-600 ${CV_SEC_IN}`} />
                </div>
                <div className="flex gap-6 mt-4">
                  <div className="flex-shrink-0 text-sm text-gray-600 text-right" style={{ width: '22%', minWidth: '100px' }}>
                    <input type="text" value={eduDate1temp10} onChange={(e) => setEduDate1temp10(e.target.value)} className="bg-transparent w-full text-right" placeholder="YYYY-MM - YYYY-MM" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <input type="text" value={facultytemp10} onChange={(e) => setFacultytemp10(e.target.value)} className="font-bold text-sm w-full bg-transparent" placeholder="Degree" />
                    <input type="text" value={universitytemp10} onChange={(e) => setUniversitytemp10(e.target.value)} className="text-sm text-gray-600 w-full bg-transparent block mt-0.5" placeholder="Institution, Location" />
                    <input type="text" value={gpatemp10} onChange={(e) => setGpatemp10(e.target.value)} className="text-sm w-full bg-transparent mt-0.5" placeholder="GPA (optional)" />
                  </div>
                </div>
              </div>

              {/* Section: Skills - pixel-art gear icon, progress bars with dark grey fill */}
              <div data-template10-skills>
                <div className="flex items-center gap-2 mb-2 min-h-[3.25rem]">
                  <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center self-center" style={{ backgroundColor: '#2E7D32' }} title="Skills">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="white"><circle cx="7" cy="7" r="2.5"/><rect x="6.5" y="1" width="1" height="2.5"/><rect x="6.5" y="10.5" width="1" height="2.5"/><rect x="1" y="6.5" width="2.5" height="1"/><rect x="10.5" y="6.5" width="2.5" height="1"/><rect x="2.8" y="2.8" width="1.2" height="1.2" transform="rotate(-45 3.4 3.4)"/><rect x="10" y="10" width="1.2" height="1.2" transform="rotate(-45 10.6 10.6)"/><rect x="10" y="2.8" width="1.2" height="1.2" transform="rotate(45 10.6 3.4)"/><rect x="2.8" y="10" width="1.2" height="1.2" transform="rotate(45 3.4 10.6)"/></svg>
                  </div>
                  <input type="text" value={skillslabeltemp10} onChange={(e) => setSkillslabeltemp10(e.target.value)} className={`font-bold text-base bg-transparent flex-1 border-b-2 border-gray-600 ${CV_SEC_IN}`} />
                </div>
                <div className="mt-4 space-y-3">
                  {skillstemp10.map((skill, i) => (
                    <div key={i} data-template10-skillrow className="flex items-center gap-4">
                      <input data-template10-skillname type="text" value={skill} onChange={(e) => handleskillstemp10Chnage(i, e.target.value)} className="w-44 flex-shrink-0 text-sm bg-transparent" placeholder="Skill" />
                      <div data-template10-skillwrap className="flex-1 flex items-center gap-3 min-w-[120px]">
                        <div data-template10-skillbar className="flex-1 h-2.5 bg-gray-200 overflow-hidden rounded-sm min-w-[80px]" style={{ minHeight: "10px" }}>
                          <div className="h-full rounded-sm transition-all" style={{ width: `${skillLeveltemp10[i] || 0}%`, backgroundColor: '#374151', minHeight: "10px" }} />
                        </div>
                        <input type="number" min={0} max={100} value={skillLeveltemp10[i] ?? 0} onChange={(e) => handleSkillLeveltemp10Change(i, e.target.value)} className="w-12 text-xs bg-transparent border border-gray-300 rounded px-1.5 py-0.5 text-right tabular-nums" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 11:
        return (
          <div
            data-template11
            className="w-full max-w-3xl mx-auto p-8 bg-white rounded-lg shadow-lg overflow-visible font-serif"
            style={{ minHeight: "1100px" }}
          >
            <div className="min-h-full overflow-visible">
              {/* Header - name in gold border, profession below */}
              <div className="text-center mb-10">
                <div className="inline-block py-2 px-6 border-2 mb-2" style={{ borderColor: '#8B7355' }}>
                  <input
                    type="text"
                    value={nametemp11}
                    onChange={(e) => setNametemp11(e.target.value)}
                    className="text-2xl font-bold text-black bg-transparent w-full text-center uppercase tracking-wide placeholder-gray-400"
                    placeholder="YOUR NAME"
                  />
                </div>
                <input
                  type="text"
                  value={professiontemp11}
                  onChange={(e) => setProfessiontemp11(e.target.value)}
                  className="text-base font-medium text-black bg-transparent w-full text-center block mt-1 placeholder-gray-500"
                  placeholder="Professional Title"
                />
              </div>

              {/* Two columns with vertical divider */}
              <div data-template11-cols className="flex gap-0 min-h-[600px]">
                {/* Left column */}
                <div data-template11-left className="w-1/3 min-w-[220px] pr-6 text-right flex flex-col gap-6 overflow-visible" style={{ borderRight: '2px solid #8B7355' }}>
                  <div data-template11-contact>
                    <input type="text" defaultValue="CONTACT" className={`text-xs font-bold uppercase tracking-wider text-black bg-transparent mb-2 w-full text-right ${CV_SEC_IN}`} readOnly />
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center justify-end gap-2 min-w-0">
                        <input type="text" value={emailtemp11} onChange={(e) => setEmailtemp11(e.target.value)} className="bg-transparent text-right min-w-0 flex-1" placeholder="Email" />
                        <span className="text-gray-500 flex-shrink-0">✉</span>
                      </div>
                      <div className="flex items-center justify-end gap-2 min-w-0">
                        <input type="text" value={phonetemp11} onChange={(e) => setPhonetemp11(e.target.value)} className="bg-transparent text-right min-w-0 flex-1" placeholder="Phone" />
                        <span className="text-gray-500 flex-shrink-0">📞</span>
                      </div>
                      <div className="flex items-center justify-end gap-2 min-w-0">
                        <input type="text" value={locationtemp11} onChange={(e) => setLocationtemp11(e.target.value)} className="bg-transparent text-right min-w-0 flex-1" placeholder="Location" />
                        <span className="text-gray-500 flex-shrink-0">📍</span>
                      </div>
                      <div className="flex items-center justify-end gap-2 min-w-0">
                        <input type="text" value={linkedintemp11} onChange={(e) => setLinkedintemp11(e.target.value)} className="bg-transparent text-right min-w-0 flex-1" placeholder="LinkedIn" />
                        <span className="text-gray-500 flex-shrink-0">in</span>
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <input type="text" value={educationtemp11} onChange={(e) => seteducationtemp11(e.target.value)} className={`text-xs font-bold uppercase tracking-wider text-black bg-transparent mb-2 w-full text-right ${CV_SEC_IN}`} />
                    <div className="text-sm text-right space-y-1 min-w-0">
                      <input type="text" value={facultytemp11} onChange={(e) => setFacultytemp11(e.target.value)} className="bg-transparent w-full min-w-0 text-right font-medium break-words" placeholder="Degree" />
                      <input type="text" value={universitytemp11} onChange={(e) => setUniversitytemp11(e.target.value)} className="bg-transparent w-full min-w-0 text-right italic break-words" placeholder="University, dates, location" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <input type="text" value={skilllabelstemp11} onChange={(e) => setSkillslabeltemp11(e.target.value)} className={`text-xs font-bold uppercase tracking-wider text-black bg-transparent mb-2 w-full text-right ${CV_SEC_IN}`} />
                    <ul className="space-y-1 text-sm text-right min-w-0">
                      {skillstemp11.map((s, i) => (
                        <li key={i}>
                          <input type="text" value={s} onChange={(e) => handleskillstemp11Change(i, e.target.value)} className="bg-transparent w-full min-w-0 text-right break-words" />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Right column */}
                <div data-template11-right className="flex-1 pl-8">
                  <input type="text" value={experiencetemp11} onChange={(e) => setExperiencetemp11(e.target.value)} className={`text-xs font-bold uppercase tracking-wider text-black bg-transparent mb-4 w-full ${CV_SEC_IN}`} />
                  <div className="space-y-6">
                    <div>
                      <input type="text" value={post1temp11} onChange={(e) => setPost1temp11(e.target.value)} className="text-base font-bold bg-transparent w-full" placeholder="Job Title" />
                      <input type="text" value={company1temp11} onChange={(e) => setCompany1temp11(e.target.value)} className="text-sm italic bg-transparent w-full block mt-0.5" placeholder="Company" />
                      <input type="text" value={date1temp11} onChange={(e) => setDate1temp11(e.target.value)} className="text-xs text-gray-600 bg-transparent w-full mt-0.5" placeholder="Dates" />
                      <ul className="mt-2 space-y-1 list-none pl-5 text-sm">
                        {workdone1temp11.map((item, i) => (
                          <li key={i}><textarea value={item} onChange={(e) => handleworkdone1temp11Change(i, e.target.value)} onInput={(e) => resizeTextareaOnInput(e, 24)} className="bg-transparent w-full text-sm resize-none min-h-[24px]" rows={1} /></li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <input type="text" value={post2temp11} onChange={(e) => setPost2temp11(e.target.value)} className="text-base font-bold bg-transparent w-full" placeholder="Job Title" />
                      <input type="text" value={company2temp11} onChange={(e) => setCompany2temp11(e.target.value)} className="text-sm italic bg-transparent w-full block mt-0.5" placeholder="Company" />
                      <input type="text" value={date2temp11} onChange={(e) => setDate2temp11(e.target.value)} className="text-xs text-gray-600 bg-transparent w-full mt-0.5" placeholder="Dates" />
                      <ul className="mt-2 space-y-1 list-none pl-5 text-sm">
                        {workdone2temp11.map((item, i) => (
                          <li key={i}><textarea value={item} onChange={(e) => handleworkdone2temp11Change(i, e.target.value)} onInput={(e) => resizeTextareaOnInput(e, 24)} className="bg-transparent w-full text-sm resize-none min-h-[24px]" rows={1} /></li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <input type="text" value={post3temp11} onChange={(e) => setPost3temp11(e.target.value)} className="text-base font-bold bg-transparent w-full" placeholder="Job Title" />
                      <input type="text" value={company3temp11} onChange={(e) => setCompany3temp11(e.target.value)} className="text-sm italic bg-transparent w-full block mt-0.5" placeholder="Company" />
                      <input type="text" value={date3temp11} onChange={(e) => setDate3temp11(e.target.value)} className="text-xs text-gray-600 bg-transparent w-full mt-0.5" placeholder="Dates" />
                      <ul className="mt-2 space-y-1 list-none pl-5 text-sm">
                        {workdone3temp11.map((item, i) => (
                          <li key={i}><textarea value={item} onChange={(e) => handleworkdone3temp11Change(i, e.target.value)} onInput={(e) => resizeTextareaOnInput(e, 24)} className="bg-transparent w-full text-sm resize-none min-h-[24px]" rows={1} /></li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 12:
        return (
          <div
            data-template12
            className="w-full max-w-3xl mx-auto p-8 bg-white rounded-lg shadow-lg overflow-visible"
            style={{ minHeight: "1100px" }}
          >
            <div className="h-full flex flex-col overflow-visible">
              {/* Two-column layout: main left (~2/3) + sidebar right (~1/3) */}
              <div className="flex-grow flex flex-col md:flex-row">
                {/* Left column - main content */}
                <div data-template12-left className="md:w-2/3 bg-white p-6 min-w-0">
                  <input
                    type="text"
                    value={nametemp12}
                    onChange={(e) => setNametemp12(e.target.value)}
                    className="text-3xl font-bold bg-transparent w-full text-blue-600"
                    placeholder="Name"
                  />
                  <input
                    type="text"
                    value={professiontemp12}
                    onChange={(e) => setProfessiontemp12(e.target.value)}
                    className="text-lg font-normal text-gray-600 bg-transparent w-full mt-1"
                    placeholder="Professional Title"
                  />
                  <textarea
                    value={summaryinfotemp12}
                    onChange={(e) => setSummaryinfotemp12(e.target.value)}
                    onInput={(e) => resizeTextareaOnInput(e, 80)}
                    className="resize-none w-full min-h-[80px] bg-transparent text-gray-600 text-sm mt-4"
                    placeholder="Professional Summary"
                  />
                  <div data-template12-work className="border-t border-gray-300 mt-6 pt-4 overflow-visible">
                    <input
                      type="text"
                      value={experiencetemp12}
                      onChange={(e) => setExperiencetemp12(e.target.value)}
                      className={`bg-transparent text-sm font-bold uppercase text-gray-800 w-full ${CV_SEC_IN}`}
                      placeholder="WORK EXPERIENCE"
                    />
                    <div className="mt-4 overflow-visible">
                      <div className="flex justify-between items-start gap-2">
                        <input
                          data-template12-jobtitle
                          type="text"
                          value={post1temp12}
                          onChange={(e) => setPost1temp12(e.target.value)}
                          className="bg-transparent font-bold text-gray-800 flex-1 min-w-0"
                          placeholder="Job Title"
                        />
                        <input
                          data-template12-date
                          type="text"
                          value={date1temp12}
                          onChange={(e) => setDate1temp12(e.target.value)}
                          className="bg-transparent text-sm font-bold text-gray-800 shrink-0 w-36 text-right"
                          placeholder="Dates"
                        />
                      </div>
                      <input
                        type="text"
                        value={company1temp12}
                        onChange={(e) => setCompany1temp12(e.target.value)}
                        className="text-sm text-gray-600 italic bg-transparent w-full mt-0.5"
                        placeholder="Company, Location"
                      />
                      <ul className="list-none mt-2 space-y-1">
                        {workdone1temp12.map((item, i) => (
                          <li key={i}>
                            <textarea
                              value={item}
                              onChange={(e) => handleworkdone1temp12Change(i, e.target.value)}
                              onInput={(e) => resizeTextareaOnInput(e, 24)}
                              className="bg-transparent w-full text-sm resize-none min-h-[24px]"
                              rows={1}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-6 overflow-visible">
                      <div className="flex justify-between items-start gap-2">
                        <input
                          data-template12-jobtitle
                          type="text"
                          value={post2temp12}
                          onChange={(e) => setPost2temp12(e.target.value)}
                          className="bg-transparent font-bold text-gray-800 flex-1 min-w-0"
                          placeholder="Job Title"
                        />
                        <input
                          data-template12-date
                          type="text"
                          value={date2temp12}
                          onChange={(e) => setDate2temp12(e.target.value)}
                          className="bg-transparent text-sm font-bold text-gray-800 shrink-0 w-36 text-right"
                          placeholder="Dates"
                        />
                      </div>
                      <input
                        type="text"
                        value={company2temp12}
                        onChange={(e) => setCompany2temp12(e.target.value)}
                        className="text-sm text-gray-600 italic bg-transparent w-full mt-0.5"
                        placeholder="Company, Location"
                      />
                      <ul className="list-none mt-2 space-y-1">
                        {workdone2temp12.map((item, i) => (
                          <li key={i}>
                            <textarea
                              value={item}
                              onChange={(e) => handleworkdone2temp12Change(i, e.target.value)}
                              onInput={(e) => resizeTextareaOnInput(e, 24)}
                              className="bg-transparent w-full text-sm resize-none min-h-[24px]"
                              rows={1}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Right sidebar - contact, skills, education, other */}
                <div data-template12-right className="md:w-1/3 bg-gray-100 p-6 min-w-[220px]">
                  <div className="mb-6">
                    <input
                      type="text"
                      value="CONTACT"
                      readOnly
                      className={`bg-transparent text-xs font-bold uppercase text-blue-600 w-full border-b border-blue-600 ${CV_SEC_IN}`}
                    />
                    <div className="mt-3 space-y-2 text-sm">
                      <input type="text" value={locationtemp12} onChange={(e) => setLocationtemp12(e.target.value)} className="bg-transparent w-full text-gray-600" placeholder="Location" />
                      <input type="text" value={phonetemp12} onChange={(e) => setPhonetemp12(e.target.value)} className="bg-transparent w-full text-gray-600" placeholder="Phone" />
                      <input type="text" value={emailtemp12} onChange={(e) => setEmailtemp12(e.target.value)} className="bg-transparent w-full text-gray-600" placeholder="Email" />
                      <input type="text" value={linkedintemp12} onChange={(e) => setLinkedintemp12(e.target.value)} className="bg-transparent w-full text-gray-600" placeholder="LinkedIn" />
                      <input type="text" value={githublinktemp12} onChange={(e) => setGithublinktemp12(e.target.value)} className="bg-transparent w-full text-gray-600" placeholder="GitHub" />
                    </div>
                  </div>
                  <div className="mb-6">
                    <input
                      type="text"
                      value="SKILLS"
                      readOnly
                      className={`bg-transparent text-xs font-bold uppercase text-blue-600 w-full border-b border-blue-600 ${CV_SEC_IN}`}
                    />
                    <div className="mt-3 space-y-2">
                      {skillstemp12.map((s, i) => (
                        <input key={i} type="text" value={s} onChange={(e) => handleSkillstemp12Change(i, e.target.value)} className="bg-transparent w-full text-sm text-gray-600" placeholder="Skill" />
                      ))}
                    </div>
                  </div>
                  <div className="mb-6">
                    <input
                      type="text"
                      value={educationtemp12}
                      onChange={(e) => setEducationtemp12(e.target.value)}
                      className={`bg-transparent text-xs font-bold uppercase text-blue-600 w-full border-b border-blue-600 ${CV_SEC_IN}`}
                    />
                    <div className="mt-3">
                      <input type="text" value={facultytemp12} onChange={(e) => setFacultytemp12(e.target.value)} className="bg-transparent w-full font-semibold text-gray-800" placeholder="Degree" />
                      <input type="text" value={universitytemp12} onChange={(e) => setUniversitytemp12(e.target.value)} className="bg-transparent w-full text-sm text-gray-600 mt-1" placeholder="University, Location, Dates" />
                      <input type="text" value={awardstemp12} onChange={(e) => setAwardstemp12(e.target.value)} className="bg-transparent w-full text-sm text-gray-600 mt-1" placeholder="Awards" />
                    </div>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={othertemp12}
                      onChange={(e) => setOthertemp12(e.target.value)}
                      className={`bg-transparent text-xs font-bold uppercase text-blue-600 w-full border-b border-blue-600 ${CV_SEC_IN}`}
                    />
                    <div className="mt-3 space-y-2">
                      {certificationstemp12.map((c, i) => (
                        <input key={i} type="text" value={c} onChange={(e) => handleCertificationstemp12Change(i, e.target.value)} className="bg-transparent w-full text-sm text-gray-600" placeholder="Certification" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 13:
        const sidebarBlue13 = '#3B82F6';
        return (
          <div data-template13 className="w-full max-w-3xl mx-auto rounded-lg shadow-lg overflow-visible" style={{ minHeight: "1100px" }}>
            <div className="flex">
              {/* Left column - main content */}
              <div className="flex-1 min-w-0 bg-white p-6">
                <input type="text" value={nametemp13} onChange={(e) => setNametemp13(e.target.value)} className="text-2xl font-bold bg-transparent w-full text-gray-900" placeholder="Name" />
                <input type="text" value={professiontemp13} onChange={(e) => setProfessiontemp13(e.target.value)} className="text-base font-bold text-gray-800 bg-transparent w-full mt-1" placeholder="Professional Title" />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <input type="text" value={emailtemp13} onChange={(e) => setEmailtemp13(e.target.value)} className="bg-transparent w-48" placeholder="Email" />
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    <input type="text" value={linkedintemp13} onChange={(e) => setLinkedintemp13(e.target.value)} className="bg-transparent w-40" placeholder="LinkedIn" />
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <input type="text" value={locationtemp13} onChange={(e) => setLocationtemp13(e.target.value)} className="bg-transparent w-40" placeholder="Location" />
                  </span>
                </div>
                <div className="mt-6">
                  <input type="text" value="SUMMARY" readOnly className={`text-xs font-bold uppercase text-gray-800 bg-transparent w-full border-b border-gray-300 ${CV_SEC_IN}`} />
                  <textarea value={summarytemp13} onChange={(e) => setSummarytemp13(e.target.value)} onInput={(e) => resizeTextareaOnInput(e, 60)} className="w-full bg-transparent resize-none text-sm min-h-[60px] mt-2 text-gray-700" rows={3} placeholder="Professional summary" />
                </div>
                <div className="mt-6">
                  <input type="text" value="EXPERIENCE" readOnly className={`text-xs font-bold uppercase text-gray-800 bg-transparent w-full border-b border-gray-300 ${CV_SEC_IN}`} />
                  <div className="mt-4">
                    <div className="flex justify-between items-center gap-3">
                      <input data-template13-jobtitle type="text" value={post1temp13} onChange={(e) => setPost1temp13(e.target.value)} className="font-bold bg-transparent flex-1 min-w-0" placeholder="Job Title" />
                      <input data-template13-date type="text" value={date1temp13} onChange={(e) => setDate1temp13(e.target.value)} className="text-sm bg-transparent shrink-0 min-w-[140px] w-[140px] text-right text-gray-600 whitespace-nowrap" placeholder="e.g. 01/2019 - Present" />
                    </div>
                    <div className="flex justify-between items-center gap-3 mt-0.5">
                      <input data-template13-company type="text" value={company1temp13} onChange={(e) => setCompany1temp13(e.target.value)} className="font-bold bg-transparent flex-1 min-w-0 text-sm" placeholder="Company" />
                      <input data-template13-loc type="text" value={location1temp13} onChange={(e) => setLocation1temp13(e.target.value)} className="text-sm bg-transparent shrink-0 min-w-[100px] w-[100px] text-right text-gray-600 whitespace-nowrap" placeholder="e.g. Seattle, WA" />
                    </div>
                    <ul className="list-none mt-2 space-y-1 text-sm text-gray-700 pl-1">
                      {workdone1temp13.map((w, i) => (
                        <li key={i}><input type="text" value={w} onChange={(e) => handleWorkdone1temp13Change(i, e.target.value)} className="bg-transparent w-full text-sm" /></li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between items-center gap-3">
                      <input data-template13-jobtitle type="text" value={post2temp13} onChange={(e) => setPost2temp13(e.target.value)} className="font-bold bg-transparent flex-1 min-w-0" placeholder="Job Title" />
                      <input data-template13-date type="text" value={date2temp13} onChange={(e) => setDate2temp13(e.target.value)} className="text-sm bg-transparent shrink-0 min-w-[140px] w-[140px] text-right text-gray-600 whitespace-nowrap" placeholder="e.g. 06/2016 - 12/2018" />
                    </div>
                    <div className="flex justify-between items-center gap-3 mt-0.5">
                      <input data-template13-company type="text" value={company2temp13} onChange={(e) => setCompany2temp13(e.target.value)} className="font-bold bg-transparent flex-1 min-w-0 text-sm" placeholder="Company" />
                      <input data-template13-loc type="text" value={location2temp13} onChange={(e) => setLocation2temp13(e.target.value)} className="text-sm bg-transparent shrink-0 min-w-[100px] w-[100px] text-right text-gray-600 whitespace-nowrap" placeholder="e.g. Remote" />
                    </div>
                    <ul className="list-none mt-2 space-y-1 text-sm text-gray-700 pl-1">
                      {workdone2temp13.map((w, i) => (
                        <li key={i}><input type="text" value={w} onChange={(e) => handleWorkdone2temp13Change(i, e.target.value)} className="bg-transparent w-full text-sm" /></li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="mt-6">
                  <input type="text" value="EDUCATION" readOnly className={`text-xs font-bold uppercase text-gray-800 bg-transparent w-full border-b border-gray-300 ${CV_SEC_IN}`} />
                  <div className="mt-4">
                    <div className="flex justify-between items-start gap-2">
                      <input data-template13-edu-degree type="text" value={facultytemp13} onChange={(e) => setFacultytemp13(e.target.value)} className="font-bold bg-transparent flex-1 min-w-0" placeholder="Degree" />
                      <input data-template13-edu-date type="text" value={dateedutemp13} onChange={(e) => setDateedutemp13(e.target.value)} className="text-sm bg-transparent shrink-0 w-28 text-right text-gray-600" placeholder="e.g. 2012 - 2016" />
                    </div>
                    <div className="flex justify-between items-start gap-2 mt-0.5">
                      <input data-template13-edu-university type="text" value={universitytemp13} onChange={(e) => setUniversitytemp13(e.target.value)} className="bg-transparent flex-1 min-w-0 text-sm" placeholder="University" />
                      <input data-template13-edu-loc type="text" value={locationedutemp13} onChange={(e) => setLocationedutemp13(e.target.value)} className="text-sm bg-transparent shrink-0 w-28 text-right text-gray-600" placeholder="City, State" />
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <input type="text" value="LANGUAGES" readOnly className={`text-xs font-bold uppercase text-gray-800 bg-transparent w-full border-b border-gray-300 ${CV_SEC_IN}`} />
                  <div className="mt-4 flex flex-wrap gap-x-8 gap-y-4">
                    {languagestemp13.map((lang, i) => (
                      <div key={i} className="flex items-center gap-2 shrink-0">
                        <input data-template13-lang type="text" value={lang.name} onChange={(e) => handleLanguagetemp13Change(i, 'name', e.target.value)} className="font-bold bg-transparent min-w-[90px] text-sm whitespace-nowrap" placeholder="Language" />
                        <input data-template13-lang-level type="text" value={lang.level} onChange={(e) => handleLanguagetemp13Change(i, 'level', e.target.value)} className="bg-transparent min-w-[70px] text-sm text-gray-600 whitespace-nowrap" placeholder="Level" />
                        <div className="flex gap-0.5 shrink-0">
                          {[1,2,3,4,5].map((d) => (
                            <div key={d} className={`w-2 h-2 rounded-full ${d <= (lang.dots || 0) ? 'bg-gray-800' : 'bg-gray-300'}`} title={`${d}/5`} onClick={() => handleLanguagetemp13Change(i, 'dots', d)} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Right column - blue sidebar */}
              <div className="w-[35%] min-w-[200px] p-6 text-white" style={{ backgroundColor: sidebarBlue13 }}>
                <div className="mb-6">
                  <input type="text" value="ACHIEVEMENTS" readOnly className={`text-xs font-bold uppercase bg-transparent w-full border-b border-white/50 ${CV_SEC_IN}`} />
                  <div className="mt-3 space-y-3">
                    {achievementstemp13.map((a, i) => (
                      <div key={i}>
                        <input type="text" value={a.title} onChange={(e) => handleAchievementtemp13Change(i, 'title', e.target.value)} className="font-bold bg-transparent w-full text-white placeholder-white/60" placeholder="Title" />
                        <textarea value={a.desc} onChange={(e) => handleAchievementtemp13Change(i, 'desc', e.target.value)} onInput={(e) => resizeTextareaOnInput(e, 24)} className="text-sm bg-transparent w-full text-white/90 placeholder-white/50 mt-0.5 resize-none min-h-[24px]" placeholder="Description" rows={1} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mb-6">
                  <input type="text" value="SKILLS" readOnly className={`text-xs font-bold uppercase bg-transparent w-full border-b border-white/50 ${CV_SEC_IN}`} />
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 min-w-0" data-template13-skills>
                    {skillstemp13.map((s, i) => (
                      <input key={i} data-template13-skill type="text" value={s} onChange={(e) => handleSkillstemp13Change(i, e.target.value)} className="bg-white/10 text-white placeholder-white/50 px-2 py-1 rounded text-sm w-full min-w-0" placeholder="Skill" />
                    ))}
                  </div>
                </div>
                <div className="mb-6">
                  <input type="text" value="PROJECTS" readOnly className={`text-xs font-bold uppercase bg-transparent w-full border-b border-white/50 ${CV_SEC_IN}`} />
                  <div className="mt-3 space-y-3">
                    {projectstemp13.map((p, i) => (
                      <div key={i}>
                        <input type="text" value={p.title} onChange={(e) => handleProjecttemp13Change(i, 'title', e.target.value)} className="font-bold bg-transparent w-full text-white placeholder-white/60" placeholder="Project" />
                        <textarea value={p.desc} onChange={(e) => handleProjecttemp13Change(i, 'desc', e.target.value)} onInput={(e) => resizeTextareaOnInput(e, 24)} className="text-sm bg-transparent w-full text-white/90 placeholder-white/50 mt-0.5 resize-none min-h-[24px]" placeholder="Description" rows={1} />
                        <input type="text" value={p.link} onChange={(e) => handleProjecttemp13Change(i, 'link', e.target.value)} className="text-xs bg-transparent w-full text-white/80 placeholder-white/40 mt-0.5" placeholder="GitHub link" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mb-6">
                  <input type="text" value="CERTIFICATION" readOnly className={`text-xs font-bold uppercase bg-transparent w-full border-b border-white/50 ${CV_SEC_IN}`} />
                  <div className="mt-3 space-y-3">
                    {certificationstemp13.map((c, i) => (
                      <div key={i}>
                        <input type="text" value={c.title} onChange={(e) => handleCertificationtemp13Change(i, 'title', e.target.value)} className="font-bold bg-transparent w-full text-white placeholder-white/60" placeholder="Certification" />
                        <textarea value={c.issuer} onChange={(e) => handleCertificationtemp13Change(i, 'issuer', e.target.value)} onInput={(e) => resizeTextareaOnInput(e, 24)} className="text-sm bg-transparent w-full text-white/90 placeholder-white/50 mt-0.5 resize-none min-h-[24px]" placeholder="Issuer" rows={1} />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <input type="text" value="PASSIONS" readOnly className={`text-xs font-bold uppercase bg-transparent w-full border-b border-white/50 ${CV_SEC_IN}`} />
                  <div className="mt-3 space-y-3">
                    {passionstemp13.map((p, i) => (
                      <div key={i}>
                        <input type="text" value={p.title} onChange={(e) => handlePassiontemp13Change(i, 'title', e.target.value)} className="font-bold bg-transparent w-full text-white placeholder-white/60" placeholder="Title" />
                        <textarea value={p.desc} onChange={(e) => handlePassiontemp13Change(i, 'desc', e.target.value)} onInput={(e) => resizeTextareaOnInput(e, 24)} className="text-sm bg-transparent w-full text-white/90 placeholder-white/50 mt-0.5 resize-none min-h-[24px]" placeholder="Description" rows={1} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 14:
        const redAccent14 = '#C00000';
        return (
          <div data-template14 className="w-full max-w-3xl mx-auto bg-white overflow-visible" style={{ minHeight: "1100px", fontFamily: 'Helvetica, Arial, sans-serif' }}>
            {/* Header: Name (first black, last red) */}
            <div className="px-8 pt-8 pb-2">
              <div className="flex flex-wrap items-baseline gap-1">
                <input data-template14-firstname type="text" value={firstnametemp14} onChange={(e) => setFirstnametemp14(e.target.value.toUpperCase())} className="text-2xl font-bold bg-transparent w-auto min-w-[80px] uppercase tracking-wide text-black placeholder-gray-400" placeholder="FIRST" style={{ fontSize: '1.5rem' }} />
                <input data-template14-lastname type="text" value={lastnametemp14} onChange={(e) => setLastnametemp14(e.target.value.toUpperCase())} className="text-2xl font-bold bg-transparent w-auto min-w-[80px] uppercase tracking-wide placeholder-gray-400" placeholder="LAST" style={{ fontSize: '1.5rem', color: redAccent14 }} />
              </div>
            </div>
            {/* Contact bar: black bg, white text, pipes */}
            <div data-template14-contact className="bg-black text-white py-2.5 px-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
              <input type="text" value={locationtemp14} onChange={(e) => setLocationtemp14(e.target.value)} className="bg-transparent text-white placeholder-white/60 flex-1 min-w-[120px] text-center" placeholder="Location" />
              <span className="text-white/80">|</span>
              <input type="text" value={phonetemp14} onChange={(e) => setPhonetemp14(e.target.value)} className="bg-transparent text-white placeholder-white/60 flex-1 min-w-[100px] text-center" placeholder="Phone" />
              <span className="text-white/80">|</span>
              <input type="text" value={emailtemp14} onChange={(e) => setEmailtemp14(e.target.value)} className="bg-transparent text-white placeholder-white/60 flex-1 min-w-[140px] text-center" placeholder="Email" />
            </div>

            {/* Section: Professional Summary */}
            <div className="px-8 pt-6">
              <h3 data-template14-section className={`text-lg font-normal text-black mb-2 ${CV_SEC_H3}`} style={{ fontSize: '1.1rem' }}>Professional Summary</h3>
              <div data-template14-divider className="h-0.5 w-full mb-4" style={{ backgroundColor: redAccent14 }} />
              <textarea data-template14-summary value={summarytemp14} onChange={(e) => setSummarytemp14(e.target.value)} onInput={(e) => resizeTextareaOnInput(e, 80)} className="w-full bg-transparent text-sm text-gray-800 resize-none min-h-[60px]" rows={3} placeholder="Your professional summary..." />
            </div>

            {/* Section: Work History */}
            <div className="px-8 pt-6">
              <h3 data-template14-section className={`text-lg font-normal text-black mb-2 ${CV_SEC_H3}`} style={{ fontSize: '1.1rem' }}>Work History</h3>
              <div data-template14-divider className="h-0.5 w-full mb-4" style={{ backgroundColor: redAccent14 }} />
              <div className="space-y-6">
                <div>
                  <div className="flex flex-wrap justify-between items-baseline gap-2 mb-1">
                    <input data-template14-jobtitle type="text" value={post1temp14} onChange={(e) => setPost1temp14(e.target.value)} className="font-bold bg-transparent flex-1 min-w-0 text-black" placeholder="Job Title" />
                    <input data-template14-date type="text" value={date1temp14} onChange={(e) => setDate1temp14(e.target.value)} className="text-sm bg-transparent shrink-0 min-w-[140px] text-right text-gray-600" placeholder="MM/YYYY to MM/YYYY" />
                  </div>
                  <input data-template14-company type="text" value={company1temp14} onChange={(e) => setCompany1temp14(e.target.value)} className="font-bold bg-transparent w-full text-sm text-black mb-2" placeholder="Company Name" />
                  <ul className="list-disc pl-5 space-y-1">
                    {workdone1temp14.map((w, i) => (
                      <li key={i}><input data-template14-workbullet type="text" value={w} onChange={(e) => handleWorkdone1temp14Change(i, e.target.value)} className="bg-transparent w-full text-sm text-gray-800" placeholder="Responsibility" /></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="flex flex-wrap justify-between items-baseline gap-2 mb-1">
                    <input data-template14-jobtitle type="text" value={post2temp14} onChange={(e) => setPost2temp14(e.target.value)} className="font-bold bg-transparent flex-1 min-w-0 text-black" placeholder="Job Title" />
                    <input data-template14-date type="text" value={date2temp14} onChange={(e) => setDate2temp14(e.target.value)} className="text-sm bg-transparent shrink-0 min-w-[140px] text-right text-gray-600" placeholder="MM/YYYY to MM/YYYY" />
                  </div>
                  <input data-template14-company type="text" value={company2temp14} onChange={(e) => setCompany2temp14(e.target.value)} className="font-bold bg-transparent w-full text-sm text-black mb-2" placeholder="Company Name" />
                  <ul className="list-disc pl-5 space-y-1">
                    {workdone2temp14.map((w, i) => (
                      <li key={i}><input data-template14-workbullet type="text" value={w} onChange={(e) => handleWorkdone2temp14Change(i, e.target.value)} className="bg-transparent w-full text-sm text-gray-800" placeholder="Responsibility" /></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="flex flex-wrap justify-between items-baseline gap-2 mb-1">
                    <input data-template14-jobtitle type="text" value={post3temp14} onChange={(e) => setPost3temp14(e.target.value)} className="font-bold bg-transparent flex-1 min-w-0 text-black" placeholder="Job Title (optional)" />
                    <input data-template14-date type="text" value={date3temp14} onChange={(e) => setDate3temp14(e.target.value)} className="text-sm bg-transparent shrink-0 min-w-[140px] text-right text-gray-600" placeholder="MM/YYYY to MM/YYYY" />
                  </div>
                  <input data-template14-company type="text" value={company3temp14} onChange={(e) => setCompany3temp14(e.target.value)} className="font-bold bg-transparent w-full text-sm text-black mb-2" placeholder="Company Name" />
                  <ul className="list-disc pl-5 space-y-1">
                    {workdone3temp14.map((w, i) => (
                      <li key={i}><input data-template14-workbullet type="text" value={w} onChange={(e) => handleWorkdone3temp14Change(i, e.target.value)} className="bg-transparent w-full text-sm text-gray-800" placeholder="Responsibility" /></li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Section: Skills - two-column grid */}
            <div className="px-8 pt-6">
              <h3 data-template14-section className={`text-lg font-normal text-black mb-2 ${CV_SEC_H3}`} style={{ fontSize: '1.1rem' }}>Skills</h3>
              <div data-template14-divider className="h-0.5 w-full mb-4" style={{ backgroundColor: redAccent14 }} />
              <div data-template14-skills className="grid grid-cols-2 gap-x-8 gap-y-1">
                {skillstemp14.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="bullet-dot w-1.5 h-1.5 rounded-full bg-black shrink-0" />
                    <input data-template14-skill type="text" value={s} onChange={(e) => handleSkillstemp14Change(i, e.target.value)} className="bg-transparent w-full text-sm text-gray-800" placeholder="Skill" />
                  </div>
                ))}
              </div>
            </div>

            {/* Section: Education */}
            <div data-template14-education className="px-8 pt-6 pb-10">
              <h3 data-template14-section className={`text-lg font-normal text-black mb-2 ${CV_SEC_H3}`} style={{ fontSize: '1.1rem' }}>Education</h3>
              <div data-template14-divider className="h-0.5 w-full mb-4" style={{ backgroundColor: redAccent14 }} />
              <input data-template14-edu-degree type="text" value={facultytemp14} onChange={(e) => setFacultytemp14(e.target.value)} className="font-bold bg-transparent w-full text-black mb-1" placeholder="Degree / Major (e.g. J.D.)" />
              <input data-template14-edu-university type="text" value={universitytemp14} onChange={(e) => setUniversitytemp14(e.target.value)} className="font-bold bg-transparent w-full text-sm text-black mb-4" placeholder="University - Location (e.g. Georgetown University - Washington, DC)" />
              <input data-template14-edu-degree type="text" value={faculty2temp14} onChange={(e) => setFaculty2temp14(e.target.value)} className="font-bold bg-transparent w-full text-black mb-1" placeholder="Second Degree (optional)" />
              <input data-template14-edu-university type="text" value={university2temp14} onChange={(e) => setUniversity2temp14(e.target.value)} className="font-bold bg-transparent w-full text-sm text-black" placeholder="University - Location (optional)" />
            </div>
          </div>
        );

      case 15:
        const blueBar15 = '#B8D4E8';
        const renderSection15 = (title, content) => (
          <div className="mb-6">
            <div data-template15-sectionbar className="w-full min-h-[3rem] flex items-center justify-center px-4 py-2 box-border text-center" style={{ backgroundColor: blueBar15 }}>
              <span className="text-sm font-semibold uppercase tracking-wide text-gray-800" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{title}</span>
            </div>
            <div className="mt-4 text-left" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>{content}</div>
          </div>
        );
        return (
          <div data-template15 className="w-full max-w-2xl mx-auto p-8 bg-white" style={{ minHeight: "1100px" }}>
            {/* Header: Name centered, serif */}
            <div className="text-center mb-4">
              <input
                type="text"
                value={nametemp15}
                onChange={(e) => setNametemp15(e.target.value.toUpperCase())}
                className="text-2xl font-bold bg-transparent w-full text-center uppercase tracking-wide text-gray-900 placeholder-gray-400"
                placeholder="YOUR NAME"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              />
              <div className="h-px w-full my-3 bg-gray-300" />
              <div data-template15-contact className="flex flex-row flex-nowrap justify-center items-center gap-x-3 text-sm text-gray-800 w-full overflow-x-auto">
                <input type="text" value={phonetemp15} onChange={(e) => setPhonetemp15(e.target.value)} className="bg-transparent text-center min-w-[100px] shrink-0 w-auto" placeholder="Phone" />
                <span className="text-gray-500 shrink-0">|</span>
                <input type="text" value={emailtemp15} onChange={(e) => setEmailtemp15(e.target.value)} className="bg-transparent text-center min-w-[140px] shrink-0 w-auto" placeholder="Email" />
                <span className="text-gray-500 shrink-0">|</span>
                <input type="text" value={locationtemp15} onChange={(e) => setLocationtemp15(e.target.value)} className="bg-transparent text-center min-w-[100px] shrink-0 w-auto" placeholder="Location" />
                <span className="text-gray-500 shrink-0">|</span>
                <input type="text" value={linkedintemp15} onChange={(e) => setLinkedintemp15(e.target.value)} className="bg-transparent text-center min-w-[140px] shrink-0 w-auto" placeholder="LinkedIn" />
              </div>
            </div>

            {renderSection15("SUMMARY", (
              <textarea value={summarytemp15} onChange={(e) => setSummarytemp15(e.target.value)} onInput={(e) => resizeTextareaOnInput(e, 60)} className="w-full bg-transparent resize-none text-sm text-gray-800 min-h-[60px]" rows={3} placeholder="Professional summary..." />
            ))}

            {renderSection15("PROFESSIONAL EXPERIENCE", (
              <div className="space-y-6">
                <div>
                  <div className="flex flex-wrap justify-between items-baseline gap-2 mb-0.5">
                    <input data-template15-jobtitle type="text" value={post1temp15} onChange={(e) => setPost1temp15(e.target.value)} className="font-bold bg-transparent flex-1 min-w-0 text-gray-900 text-sm" placeholder="Job Title" />
                    <input data-template15-date type="text" value={date1temp15} onChange={(e) => setDate1temp15(e.target.value)} className="text-sm bg-transparent shrink-0 min-w-[120px] text-right text-gray-600" placeholder="9/2023 – Present" />
                  </div>
                  <input type="text" value={company1temp15} onChange={(e) => setCompany1temp15(e.target.value)} className="italic text-sm bg-transparent w-full text-gray-700 mb-1" placeholder="Company Name" />
                  <input type="text" value={location1temp15} onChange={(e) => setLocation1temp15(e.target.value)} className="italic text-sm bg-transparent w-full text-gray-600 mb-2" placeholder="Location" />
                  <ul data-template15-workbullets className="list-disc pl-4 space-y-1 text-sm text-gray-800">
                    {workdone1temp15.map((w, i) => (
                      <li key={i}><input data-template15-workbullet type="text" value={w} onChange={(e) => handleWorkdone1temp15Change(i, e.target.value)} className="bg-transparent w-full text-sm" placeholder="Responsibility" /></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="flex flex-wrap justify-between items-baseline gap-2 mb-0.5">
                    <input data-template15-jobtitle type="text" value={post2temp15} onChange={(e) => setPost2temp15(e.target.value)} className="font-bold bg-transparent flex-1 min-w-0 text-gray-900 text-sm" placeholder="Job Title" />
                    <input data-template15-date type="text" value={date2temp15} onChange={(e) => setDate2temp15(e.target.value)} className="text-sm bg-transparent shrink-0 min-w-[120px] text-right text-gray-600" placeholder="6/2020 – 8/2023" />
                  </div>
                  <input type="text" value={company2temp15} onChange={(e) => setCompany2temp15(e.target.value)} className="italic text-sm bg-transparent w-full text-gray-700 mb-1" placeholder="Company Name" />
                  <input type="text" value={location2temp15} onChange={(e) => setLocation2temp15(e.target.value)} className="italic text-sm bg-transparent w-full text-gray-600 mb-2" placeholder="Location" />
                  <ul data-template15-workbullets className="list-disc pl-4 space-y-1 text-sm text-gray-800">
                    {workdone2temp15.map((w, i) => (
                      <li key={i}><input data-template15-workbullet type="text" value={w} onChange={(e) => handleWorkdone2temp15Change(i, e.target.value)} className="bg-transparent w-full text-sm" placeholder="Responsibility" /></li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}

            {renderSection15("EDUCATION", (
              <div data-template15-education>
                <div className="flex flex-wrap justify-between items-baseline gap-2 mb-0.5">
                  <input data-template15-edu-university type="text" value={universitytemp15} onChange={(e) => setUniversitytemp15(e.target.value)} className="font-bold bg-transparent flex-1 min-w-0 text-gray-900 text-sm" placeholder="University Name" />
                  <input data-template15-edu-date type="text" value={dateedutemp15} onChange={(e) => setDateedutemp15(e.target.value)} className="text-sm bg-transparent shrink-0 min-w-[80px] text-right text-gray-600" placeholder="5/2022" />
                </div>
                <input data-template15-edu-location type="text" value={locationedutemp15} onChange={(e) => setLocationedutemp15(e.target.value)} className="italic text-sm bg-transparent w-full text-gray-600 mb-1" placeholder="City, State" />
                <input data-template15-edu-degree type="text" value={degreetemp15} onChange={(e) => setDegreetemp15(e.target.value)} className="text-sm bg-transparent w-full text-gray-800" placeholder="Bachelor of Science" />
                <input data-template15-edu-major type="text" value={majortemp15} onChange={(e) => setMajortemp15(e.target.value)} className="text-sm bg-transparent w-full text-gray-700" placeholder="Major" />
              </div>
            ))}

            {renderSection15("SKILLS", (
              <div className="text-sm text-gray-800 space-y-2">
                <div>
                  <span className="font-bold">Technical Skills: </span>
                  <input type="text" value={technicalSkillstemp15} onChange={(e) => setTechnicalSkillstemp15(e.target.value)} className="bg-transparent flex-1 inline w-[calc(100%-130px)]" placeholder="Skill 1, Skill 2, Skill 3" />
                </div>
                <div>
                  <span className="font-bold">Soft Skills: </span>
                  <input type="text" value={softSkillstemp15} onChange={(e) => setSoftSkillstemp15(e.target.value)} className="bg-transparent flex-1 inline w-[calc(100%-100px)]" placeholder="Leadership, Communication" />
                </div>
                <div>
                  <span className="font-bold">Languages: </span>
                  <input type="text" value={languagesTemp15} onChange={(e) => setLanguagesTemp15(e.target.value)} className="bg-transparent flex-1 inline w-[calc(100%-95px)]" placeholder="English, Spanish" />
                </div>
              </div>
            ))}
          </div>
        );

      case 16:
        const renderSection16 = (value, onChange, children) => (
          <div className="mb-5">
            <div className="border-t mt-4 mb-3" style={{ borderColor: '#d4d4d4', borderWidth: '1px' }} />
            <div className="flex min-h-[3rem] w-full items-center justify-center box-border py-2">
              <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="text-xs font-bold uppercase tracking-[0.35em] text-center w-full bg-transparent text-gray-900 leading-normal" />
            </div>
            <div className="border-t mt-2 mb-3" style={{ borderColor: '#d4d4d4', borderWidth: '1px' }} />
            {children}
          </div>
        );
        return (
          <div data-template16 className="w-full max-w-3xl mx-auto p-8 bg-white font-sans">
            <div className="text-center py-4 mb-2">
              <input
                type="text"
                value={nametemp16}
                onChange={(e) => setNametemp16(e.target.value.toUpperCase())}
                className="text-3xl font-bold uppercase tracking-[0.2em] bg-transparent w-full text-center text-black placeholder-gray-400"
                placeholder="YOUR NAME"
              />
            </div>
            <div data-template16-contact className="-mx-8 w-[calc(100%+4rem)] px-8 py-3 mb-4" style={{ backgroundColor: '#EBEBEB' }}>
              <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1 text-sm text-gray-800">
                <input type="text" value={locationtemp16} onChange={(e) => setLocationtemp16(e.target.value)} className="bg-transparent text-center min-w-[80px]" placeholder="Location" />
                <span className="text-gray-500">|</span>
                <input type="text" value={phonetemp16} onChange={(e) => setPhonetemp16(e.target.value)} className="bg-transparent text-center min-w-[110px]" placeholder="Phone" />
                <span className="text-gray-500">|</span>
                <input type="text" value={emailtemp16} onChange={(e) => setEmailtemp16(e.target.value)} className="bg-transparent text-center min-w-[140px]" placeholder="Email" />
                <span className="text-gray-500">|</span>
                <input type="text" value={linkedintemp16} onChange={(e) => setLinkedintemp16(e.target.value)} className="bg-transparent text-center min-w-[140px]" placeholder="LinkedIn" />
              </div>
            </div>
            <div className="border-t border-gray-300 mb-6" style={{ borderColor: '#d4d4d4' }} />
            {renderSection16(profilelabeltemp16, setProfilelabeltemp16, (
              <div className="w-full">
                <RichTextBlock
                  value={profiletemp16}
                  onChange={setProfiletemp16}
                  data-template16-profile
                  className="text-sm bg-transparent w-full max-w-full leading-relaxed text-gray-800 text-justify"
                  minHeight="60px"
                />
              </div>
            ))}
            {renderSection16(skillslabeltemp16, setSkillslabeltemp16, (
              <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm text-gray-700">
                {skillstemp16.slice(0, 9).map((s, i) => (
                  <input key={i} type="text" value={s} onChange={(e) => handelskillstemp16(i, e.target.value)} className="bg-transparent w-full" />
                ))}
              </div>
            ))}
            {renderSection16(worklabeltemp16, setWorklabeltemp16, (
              <div data-template16-work className="flex flex-col gap-6 w-full">
                <div data-template16-workentry className="flex flex-col w-full min-w-0">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <input type="text" value={company1temp16} onChange={(e) => setCompany1temp16(e.target.value)} className="font-bold bg-transparent w-full text-gray-900 text-sm" placeholder="Company" />
                      <input type="text" value={post1temp16} onChange={(e) => setPost1temp16(e.target.value)} className="font-bold bg-transparent w-full text-gray-900 text-sm mt-0.5" placeholder="Job Title" />
                    </div>
                    <div className="text-right shrink-0">
                      <input type="text" value={date1temp16} onChange={(e) => setDate1temp16(e.target.value)} className="font-bold bg-transparent text-right block text-gray-900 text-sm" placeholder="Date" />
                      <input type="text" value={location1temp16} onChange={(e) => setLocation1temp16(e.target.value)} className="bg-transparent text-right block text-sm text-gray-600 mt-0.5" placeholder="Location" />
                    </div>
                  </div>
                  <div className="w-full min-w-0 mt-2">
                    <RichTextBlock value={workdesc1temp16} onChange={setWorkdesc1temp16} data-template16-workdesc className="text-sm bg-transparent w-full text-gray-700 leading-relaxed" minHeight="30px" />
                  </div>
                  <ul className="mt-2 pl-5 list-none text-sm text-gray-700 space-y-1 w-full min-w-0">
                    {workdone1temp16.map((item, i) => (
                      <li key={i}>
                        <RichTextBlock value={item} onChange={(v) => handleworkdone1temp16(i, v)} className="inline bg-transparent" minHeight="20px" />
                      </li>
                    ))}
                  </ul>
                </div>
                <div data-template16-workentry className="flex flex-col w-full min-w-0">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <input type="text" value={company2temp16} onChange={(e) => setCompany2temp16(e.target.value)} className="font-bold bg-transparent w-full text-gray-900 text-sm" placeholder="Company" />
                      <input type="text" value={post2temp16} onChange={(e) => setPost2temp16(e.target.value)} className="font-bold bg-transparent w-full text-gray-900 text-sm mt-0.5" placeholder="Job Title" />
                    </div>
                    <div className="text-right shrink-0">
                      <input type="text" value={date2temp16} onChange={(e) => setDate2temp16(e.target.value)} className="font-bold bg-transparent text-right block text-gray-900 text-sm" placeholder="Date" />
                      <input type="text" value={location2temp16} onChange={(e) => setLocation2temp16(e.target.value)} className="bg-transparent text-right block text-sm text-gray-600 mt-0.5" placeholder="Location" />
                    </div>
                  </div>
                  <div className="w-full min-w-0 mt-2">
                    <RichTextBlock value={workdesc2temp16} onChange={setWorkdesc2temp16} data-template16-workdesc className="text-sm bg-transparent w-full text-gray-700 leading-relaxed" minHeight="30px" />
                  </div>
                  <ul className="mt-2 pl-5 list-none text-sm text-gray-700 space-y-1 w-full min-w-0">
                    {workdone2temp16.map((item, i) => (
                      <li key={i}>
                        <RichTextBlock value={item} onChange={(v) => handleworkdone2temp16(i, v)} className="inline bg-transparent" minHeight="20px" />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
            {renderSection16(educationlabeltemp16, setEducationlabeltemp16, (
              <div className="flex justify-between items-start gap-4 w-full min-w-0">
                <div>
                  <input type="text" value={universitytemp16} onChange={(e) => setUniversitytemp16(e.target.value)} className="font-bold bg-transparent w-full text-gray-900 text-sm" placeholder="Institution" />
                  <input type="text" value={facultytemp16} onChange={(e) => setFacultytemp16(e.target.value)} className="bg-transparent w-full text-gray-700 text-sm mt-0.5" placeholder="Degree" />
                </div>
                <div className="text-right shrink-0">
                  <input type="text" value={year16temp16} onChange={(e) => setYear16temp16(e.target.value)} className="font-bold bg-transparent text-right block text-gray-900 text-sm" placeholder="Year" />
                  <input type="text" value={location16temp16} onChange={(e) => setLocation16temp16(e.target.value)} className="bg-transparent text-right block text-sm text-gray-600 mt-0.5" placeholder="Location" />
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return <p>Template not found</p>;
    }
  };

  // No template selected (e.g. direct URL, refresh, or back navigation)
  const hasValidTemplate = templateId && !Number.isNaN(templateId) && templateId >= 1 && templateId <= 16;
  if (!hasValidTemplate) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 -mt-20">
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
      </div>
    );
  }

  return (
    <div className="relative">
      <Navbar />
    <img src={Logo} className="h-[70px] w-52 ml-20 mt-[-10px] absolute object-contain" alt="Logo" />
    <p className="text-slate-100 ml-[600px] font-medium text-lg mt-3 absolute hidden xl:block pointer-events-none">Click anywhere to edit your CV</p>
    <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 sm:gap-3 max-w-[min(52vw,calc(100%-12rem))] sm:max-w-none justify-end">
      <span className="text-slate-300 text-xs sm:text-sm font-medium truncate max-w-[100px] sm:max-w-[11rem] text-right">
        {TEMPLATE_NAMES[templateId] || `Template ${templateId}`}
      </span>
    </div>

      {enhancedResume && (
        <div
          className={`fixed z-40 flex flex-col gap-2 transition-all duration-200 ${
            showEnhancedRef
              ? 'lg:left-4 lg:top-[4.5rem] lg:w-[min(22rem,calc(100vw-2rem))] lg:h-[calc(100vh-4.75rem)] max-lg:inset-x-3 max-lg:bottom-3 max-lg:top-auto max-lg:max-h-[min(52vh,480px)] max-lg:rounded-2xl max-lg:shadow-2xl'
              : 'lg:left-4 lg:top-[4.5rem] max-lg:left-3 max-lg:bottom-20 w-auto'
          }`}
        >
          <button
            type="button"
            onClick={() => setShowEnhancedRef(!showEnhancedRef)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold shadow-lg hover:from-blue-700 hover:to-purple-700 justify-center shrink-0"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 8.414V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm">{showEnhancedRef ? 'Hide' : 'Show'} CV reference</span>
          </button>
          {showEnhancedRef && (
            <EnhancedCvReferencePanelCard
              textareaId="enhanced-ref-raw"
              editableRefContent={editableRefContent}
              setEditableRefContent={setEditableRefContent}
              handleCopyToTemplate={handleCopyToTemplate}
              isApplyingToTemplate={isApplyingToTemplate}
              applyFeedback={applyFeedback}
              handleCopyRefContent={handleCopyRefContent}
              copied={copied}
              enhancedResume={enhancedResume}
              compact
            />
          )}
        </div>
      )}

      {isApplyingToTemplate && (
        <div className="fixed inset-0 z-[70] bg-slate-900/40 flex items-center justify-center p-4" role="status" aria-live="polite">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 px-8 py-7 max-w-sm w-full flex flex-col items-center text-center gap-3">
            <svg className="w-12 h-12 text-emerald-600 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-lg font-bold text-slate-800">Copying to your template</p>
            <p className="text-sm text-slate-600">Filling in your CV fields… this takes about 2–3 seconds.</p>
          </div>
        </div>
      )}

      {/* {renderTemplate()} */}

      <FormattingToolbar
        layoutOffsetClass={
          enhancedResume && showEnhancedRef ? 'lg:pl-[22rem] xl:pl-[24rem]' : ''
        }
      />
      <div
        className={`px-4 pt-28 pb-6 bg-slate-50 min-h-screen transition-[padding] duration-200 ${
          enhancedResume && showEnhancedRef
            ? 'lg:pl-[22rem] xl:pl-[24rem] max-lg:pb-[min(46vh,360px)]'
            : ''
        }`}
      >
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

        {/* Enhanced Download Section — lift on small screens when bottom CV reference is open */}
        <div
          className={`fixed z-50 flex flex-col gap-3 items-end max-w-[90vw] md:max-w-none right-4 md:right-6 transition-[bottom] duration-200 ${
            enhancedResume && showEnhancedRef
              ? 'bottom-[min(calc(48vh+1rem),26rem)] lg:bottom-6'
              : 'bottom-4 md:bottom-6'
          }`}
        >
          {/* Reset template — restore placeholder defaults for supported layouts */}
          {templateId === 1 && (
            <button
              onClick={resetTemplate1}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold shadow-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset template
            </button>
          )}
          {templateId === 3 && (
            <button
              type="button"
              onClick={resetTemplate3}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold shadow-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset template
            </button>
          )}
          {templateId === 4 && (
            <button
              type="button"
              onClick={resetTemplate4}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold shadow-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset template
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowDownloadOptions((s) => !s)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-semibold shadow-lg transition-colors"
            aria-expanded={showDownloadOptions}
            aria-controls="download-options-panel"
            title={showDownloadOptions ? "Hide download options" : "Show download options"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {showDownloadOptions ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              )}
            </svg>
            {showDownloadOptions ? "Hide downloads" : "Show downloads"}
          </button>
          {/* Download Options */}
          {showDownloadOptions && (
          <div id="download-options-panel" className={`bg-white rounded-xl shadow-lg border border-slate-100 p-4 md:p-5 flex flex-col gap-3 transition-all duration-300 ${
            isDownloading ? 'opacity-75 pointer-events-none' : ''
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-semibold text-gray-800">Download Options</span>
            </div>
            
            <button
              onClick={() => handleDownload('pdf', !VISUAL_PDF_TEMPLATE_IDS.includes(templateId))}
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
                  {VISUAL_PDF_TEMPLATE_IDS.includes(templateId) ? 'Download PDF (Template Layout)' : 'Download Text Editable PDF'}
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 -mt-1">
              {VISUAL_PDF_TEMPLATE_IDS.includes(templateId)
                ? 'Image-based PDF — fills the full A4 page (no white margins). Aspect ratio may differ slightly from the preview if the capture is not A4-shaped. For a non-stretched copy use Print → Save as PDF.'
                : 'Text-only editable PDF (not design-matched). Use PNG for exact visual layout.'}
            </p>

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
          )}
        </div>
      </div>
    </div>
  );
};

export default Fill_cv;
