import { copiarAlPortapapeles } from "./copyToClipBoard";

export function arrayToCSV(data) {
  const replacer = (__, value) => value === null ? '': value
  const columnas = Object.keys(data[0]);
  const header = columnas.join(';');

  const rows = data.map(obj =>
    columnas.map(columna => JSON.stringify(obj[columna], replacer)).join(';')
  );
  return [header, ...rows].join('\n');
}

export function copyCsvToClipBoard(data) {
  data?.length > 0 && copiarAlPortapapeles(arrayToCSV(data))
}
