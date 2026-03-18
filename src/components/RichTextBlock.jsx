import React, { useRef, useEffect } from "react";

/**
 * Contenteditable block for rich text (bold, italic, underline, etc.).
 * Stores HTML. Use with FormattingToolbar for MS Word-style formatting.
 */
const RichTextBlock = ({
  value,
  onChange,
  className = "",
  placeholder = "",
  minHeight = "24px",
  ...props
}) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const html = value || "";
    if (el.innerHTML !== html) {
      el.innerHTML = html;
    }
  }, [value]);

  const handleInput = () => {
    if (ref.current && onChange) {
      onChange(ref.current.innerHTML);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onPaste={handlePaste}
      data-placeholder={placeholder}
      className={`outline-none focus:ring-2 focus:ring-blue-200/30 rounded px-1 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 ${className}`}
      style={{ minHeight, fontFamily: 'inherit', fontSize: 'inherit' }}
      {...props}
    />
  );
};

export default RichTextBlock;
