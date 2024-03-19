"use client"
const HighlightMatch = ({text, filter, largo}) => {
  const startIndex = text.toLowerCase().indexOf(filter.toLowerCase());
  if (startIndex === -1) return text; // Si no hay coincidencia, devuelve el texto original

  const endIndex = startIndex + filter.length;
  const highlightClass = largo === 1 ? "bg-green-200" : "bg-blue-200"; // Clase verde para coincidencia exacta y única

  return (
    <>
      {text.substring(0, startIndex)}
      <span className={highlightClass}>{text.substring(startIndex, endIndex)}</span>
      {text.substring(endIndex)}
    </>
  );
};

export default HighlightMatch;