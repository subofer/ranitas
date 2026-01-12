"use client"

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const HighlightMatch = ({ text: textProp, filter: filterProp, highlightClass = "bg-green-200" }) => {
  const text = textProp == null ? "" : String(textProp);
  const filter = filterProp == null ? "" : String(filterProp).trim();

  if (!filter) return <span className="text-gray-900">{text}</span>;

  const tokens = filter
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map(escapeRegExp);

  if (tokens.length === 0) return <span className="text-gray-900">{text}</span>;

  const alternation = tokens.join("|");
  const splitRegex = new RegExp(`(${alternation})`, "gi");
  const exactRegex = new RegExp(`^(?:${alternation})$`, "i");

  const parts = text.split(splitRegex).filter(Boolean);
  return (
    <>
      {parts.map((part, index) => (
        <span
          key={`${index}-${part}`}
          className={`text-gray-900 ${exactRegex.test(part) ? highlightClass : ""}`}
        >
          {part}
        </span>
      ))}
    </>
  );
};

export default HighlightMatch;