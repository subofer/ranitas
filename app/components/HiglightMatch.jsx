"use client"

const HighlightMatch = ({ text: textProp, filter: filterProp, highlightClass = "bg-green-200" }) => {
  const text = textProp == null ? "" : String(textProp);
  const filter = filterProp == null ? "" : String(filterProp).trim();

  if (!filter) return <span className="text-gray-900">{text}</span>;

  // Función para normalizar texto (quitar acentos para comparación)
  const normalizeForSearch = (str) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ñ/g, 'n');
  };

  const normalizedText = normalizeForSearch(text);
  const normalizedFilter = normalizeForSearch(filter);

  // Dividir el filtro en palabras
  const filterWords = normalizedFilter.split(/\s+/).filter(word => word.length > 0);

  if (filterWords.length === 0) return <span className="text-gray-900">{text}</span>;

  // Crear un array de partes del texto original
  let parts = [text];

  // Para cada palabra del filtro, dividir el texto donde aparezca
  for (const word of filterWords) {
    const newParts = [];
    for (const part of parts) {
      if (typeof part === 'string') {
        const normalizedPart = normalizeForSearch(part);
        const index = normalizedPart.indexOf(word);

        if (index !== -1) {
          // Encontramos la palabra en el texto normalizado, ahora mapear a la posición original
          let originalIndex = 0;
          let normalizedCount = 0;

          // Avanzar en el texto original hasta llegar a la posición normalizada
          while (normalizedCount < index && originalIndex < part.length) {
            const char = part[originalIndex];
            const normalizedChar = normalizeForSearch(char);
            if (normalizedChar) {
              normalizedCount++;
            }
            originalIndex++;
          }

          // Encontrar la longitud de la coincidencia en el texto original
          let matchLength = 0;
          let normalizedMatchCount = 0;

          while (normalizedMatchCount < word.length && (originalIndex + matchLength) < part.length) {
            const char = part[originalIndex + matchLength];
            const normalizedChar = normalizeForSearch(char);
            if (normalizedChar) {
              normalizedMatchCount++;
            }
            matchLength++;
          }

          // Dividir el texto original
          const before = part.substring(0, originalIndex);
          const match = part.substring(originalIndex, originalIndex + matchLength);
          const after = part.substring(originalIndex + matchLength);

          if (before) newParts.push(before);
          newParts.push({ text: match, highlight: true });
          if (after) newParts.push(after);
        } else {
          // No se encontró, mantener como está
          newParts.push(part);
        }
      } else {
        // Ya es un objeto resaltado, mantener
        newParts.push(part);
      }
    }
    parts = newParts;
  }

  // Renderizar las partes
  return (
    <>
      {parts.map((part, index) => {
        if (typeof part === 'string') {
          return <span key={index} className="text-gray-900">{part}</span>;
        } else {
          return (
            <span key={index} className={`text-gray-900 ${part.highlight ? highlightClass : ""}`}>
              {part.text}
            </span>
          );
        }
      })}
    </>
  );
};

export default HighlightMatch;