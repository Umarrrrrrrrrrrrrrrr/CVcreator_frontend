import React, { useState, useEffect } from "react";

/**
 * MS Word-style formatting toolbar. Sticky at top. Applies to selected text in contenteditable areas.
 */
const FormattingToolbar = ({ layoutOffsetClass = '', extraActions = null }) => {
  const [hasSelection, setHasSelection] = useState(false);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      if (!range || range.collapsed) {
        setHasSelection(false);
        return;
      }
      const container = range.commonAncestorContainer;
      const editable = container?.nodeType === 3
        ? container.parentElement?.closest("[contenteditable]")
        : container?.closest?.("[contenteditable]");
      setHasSelection(!!editable);
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  const execCommand = (cmd, value = null) => {
    if (!hasSelection) return;
    document.execCommand(cmd, false, value);
  };

  const active = hasSelection ? "text-gray-800 hover:bg-slate-100" : "text-gray-300 cursor-not-allowed";
  const selectActive = hasSelection ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 text-gray-400 cursor-not-allowed";

  return (
    <div className={`fixed top-14 left-0 right-0 z-[60] bg-slate-50 border-b border-slate-200 shadow-sm transition-[padding] duration-200 ${layoutOffsetClass}`}>
      <div className="max-w-4xl mx-auto px-4 py-2">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Font style group */}
          <div className="flex items-center gap-0.5 bg-white rounded-lg border border-slate-200 p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => execCommand("bold")}
              disabled={!hasSelection}
              className={`p-2 rounded-md transition-colors ${active}`}
              title="Bold (Ctrl+B)"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>
            </button>
            <button
              type="button"
              onClick={() => execCommand("italic")}
              disabled={!hasSelection}
              className={`p-2 rounded-md transition-colors ${active}`}
              title="Italic (Ctrl+I)"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>
            </button>
            <button
              type="button"
              onClick={() => execCommand("underline")}
              disabled={!hasSelection}
              className={`p-2 rounded-md transition-colors ${active}`}
              title="Underline"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/></svg>
            </button>
          </div>

          {/* Font size */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">Size</label>
            <select
              onChange={(e) => { const v = e.target.value; if (v) execCommand("fontSize", v); e.target.value = ""; }}
              disabled={!hasSelection}
              className={`text-xs border rounded-md px-2 py-1.5 transition-colors ${selectActive}`}
              title="Font size"
            >
              <option value="">—</option>
              <option value="1">Small</option>
              <option value="2">Normal</option>
              <option value="3">Medium</option>
              <option value="4">Large</option>
              <option value="5">X-Large</option>
            </select>
          </div>

          {/* Font family */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">Font</label>
            <select
              onChange={(e) => { const v = e.target.value; if (v) execCommand("fontName", v); e.target.value = ""; }}
              disabled={!hasSelection}
              className={`text-xs border rounded-md px-2 py-1.5 min-w-[110px] transition-colors ${selectActive}`}
              title="Font family"
            >
              <option value="">—</option>
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="sans-serif">Sans Serif</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Georgia">Georgia</option>
            </select>
          </div>

          {/* Text color */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">Color</label>
            <select
              onChange={(e) => { const v = e.target.value; if (v) execCommand("foreColor", v); e.target.value = ""; }}
              disabled={!hasSelection}
              className={`text-xs border rounded-md px-2 py-1.5 transition-colors ${selectActive}`}
              title="Text color"
            >
              <option value="">—</option>
              <option value="#000000">Black</option>
              <option value="#333333">Dark Gray</option>
              <option value="#0000ff">Blue</option>
              <option value="#006400">Green</option>
              <option value="#8b0000">Dark Red</option>
            </select>
          </div>

          {/* Clear formatting */}
          <button
            type="button"
            onClick={() => execCommand("removeFormat")}
            disabled={!hasSelection}
            className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded-md transition-colors ${active}`}
            title="Clear formatting"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear
          </button>
          {extraActions ? (
            <div className="w-full sm:w-auto flex justify-center sm:justify-end sm:ml-auto shrink-0 basis-full sm:basis-auto pt-2 border-t border-slate-200/80 sm:border-0 sm:pt-0">
              {extraActions}
            </div>
          ) : null}
        </div>
        {!hasSelection && (
          <p className="text-xs text-slate-400 mt-1.5">Select text in the CV to format it</p>
        )}
      </div>
    </div>
  );
};

export default FormattingToolbar;
