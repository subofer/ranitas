/**
 * Utilidades para normalización y manipulación de texto
 * Centraliza funciones comunes de búsqueda y filtrado
 */

/**
 * Normaliza texto para comparación (lowercase y trim)
 */
export const normalizeText = (text) => {
  if (!text) return '';
  return text.toLowerCase().trim();
};

/**
 * Quita acentos de un texto para búsquedas más flexibles
 */
export const removeAccents = (text) => {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n');
};

/**
 * Verifica si un texto contiene un término de búsqueda
 * Considera variaciones con y sin acentos
 */
export const textMatches = (text, searchTerm) => {
  if (!searchTerm?.trim()) return true;
  if (!text) return false;

  const normalizedText = normalizeText(text);
  const normalizedSearch = normalizeText(searchTerm);
  const textNoAccents = removeAccents(normalizedText);
  const searchNoAccents = removeAccents(normalizedSearch);

  return normalizedText.includes(normalizedSearch) ||
         textNoAccents.includes(searchNoAccents) ||
         normalizedText.includes(searchNoAccents) ||
         textNoAccents.includes(normalizedSearch);
};

/**
 * Verifica si un texto coincide con TODAS las palabras de búsqueda
 */
export const textMatchesAllWords = (text, searchTerm) => {
  if (!searchTerm?.trim()) return true;
  if (!text) return false;

  const words = normalizeText(searchTerm).split(/\s+/).filter(w => w.length > 0);
  return words.every(word => textMatches(text, word));
};

/**
 * Filtra un array de objetos por múltiples campos
 * @param {Array} items - Array de objetos a filtrar
 * @param {string} searchTerm - Término de búsqueda
 * @param {Function[]} fieldAccessors - Funciones que extraen campos de cada item
 */
export const filterByFields = (items, searchTerm, fieldAccessors) => {
  if (!searchTerm?.trim()) return items;
  if (!items?.length) return [];

  return items.filter(item => {
    return fieldAccessors.some(accessor => {
      const value = accessor(item);
      return textMatches(value, searchTerm);
    });
  });
};
