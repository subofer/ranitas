/**
 * Funciones de normalización de datos
 */

const texto = (valor) => {
  if (typeof valor !== 'string') return '';
  return valor.trim();
};

const numero = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
};

const entero = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

const enteroPositivo = (valor) => {
  const n = entero(valor);
  return Math.max(0, n);
};

export default {
  texto,
  numero,
  entero,
  enteroPositivo,
};
