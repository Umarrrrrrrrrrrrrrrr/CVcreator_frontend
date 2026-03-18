# Add New CV Template — Image-Only Workflow

**Just attach your CV template image and specify the template number.** The AI will handle everything.

---

## Quick Start

1. **Attach your CV template image** (screenshot or design).
2. **Say:** `Add this as Template [X]` (e.g. "Add this as Template 9").
3. The AI will analyze the image and:
   - Copy it to the thumbnail
   - Build the layout and edit menu
   - Add rich text where needed
   - Wire up PDF export
   - Ensure header/toolbar stay fixed

---

## The Prompt (copy & paste)

```
Add this image as Template [X]. Do everything needed:

1. **Thumbnail:** Save the attached image to `src/Pages/assets/temp[X].png`.

2. **Analyze the image** and build the layout to match:
   - Column structure (one/two columns, widths)
   - Sections (e.g. Summary, Experience, Education, Skills, Contact)
   - Typography (headers, body, accents)
   - Pre-fill with sample content visible in the image (names, companies, dates, etc.)

3. **State & layout in Fill_cv.jsx:**
   - Add/update state for all editable fields
   - Add handlers for arrays/objects (skills, experience entries, etc.)
   - Add profile image state and handler if the template has a photo
   - Use `selectedImage[X]` and `handleImageChange[X]` for the profile image
   - Use `id="Imageinput[X]"` for the file input (e.g. Imageinput9)

4. **Rich text:** Use RichTextBlock for:
   - Summary/Profile paragraphs
   - Experience bullet points and descriptions
   - Achievement, course, passion descriptions
   - Any multi-line text that should support bold, italic, underline, font size, color

5. **PDF export:** Add/update the Template [X] block in handleDownloadTextPdf:
   - Use `stripHtml()` for all rich text fields
   - Match the layout (e.g. two-column for Template 7 with black sidebar)
   - For templates with profile images: use `image[X]DataUrlRef` for blob→dataURL, and `imageToCircularDataUrl()` if the image should be round

6. **Auto-populate:** Update the Template [X] block in applyEditedContentToTemplate and in the useEffect for enhanced resume, so parsed data fills the correct fields.

7. **Fixed UI:** Ensure the nav bar and FormattingToolbar stay fixed at the top (position: fixed).

Files to modify:
- `src/Pages/assets/temp[X].png`
- `src/Pages/Fill_CV/Fill_cv.jsx` (state, layout, PDF export, auto-populate)
```

---

## Optional: Custom Sample Content

If you want specific placeholder text instead of what’s in the image:

```
Use this sample content:
- Name: [NAME]
- Profession: [TITLE]
- Contact: [PHONE], [EMAIL], [LOCATION], [LINKEDIN]
- Summary: [PARAGRAPH]
- Experience: [JOB 1], [JOB 2] with bullets
- Education: [DEGREE], [SCHOOL], [DATE]
- Skills: [SKILL 1], [SKILL 2], ...
```

---

## Reference: Project Structure

- **Thumbnails:** `src/Pages/assets/temp1.png` … `temp15.png`
- **Main logic:** `src/Pages/Fill_CV/Fill_cv.jsx`
  - State variables (e.g. `nametemp7`, `profiletemp7`)
  - Template layout (switch/case by templateId)
  - PDF export (`handleDownloadTextPdf`)
  - Auto-populate (`applyEditedContentToTemplate`, useEffect)
- **Rich text:** `RichTextBlock` from `src/components/RichTextBlock.jsx`
- **Helpers:** `stripHtml()` for PDF, `imageToCircularDataUrl()` for round profile images
