const pm = (dir, s) => `${s.charAt(0)[dir]()}${s.slice(1)}`;
const all = (dir, s) => `${s[dir]()}`;
const tm = (dir, s) => `${s.split(" ").map(p => p.length > 2 ? pm(dir, p) : p).join(" ")}`;

const formatCuit = (s) => {
  const numeros = s.replace(/\D/g, '')
  return `${numeros.slice(0,2)}-${numeros.slice(2,10)}-${numeros.slice(10,11)}`
}
const resumirTexto = (texto, largo = 6) => (
 `${texto.slice(0, largo/2)}${largo+3 >= texto.length ? "":"···"}${texto.slice(-largo/2, texto.length)}`
)

export const textos = {
  mayusculas: {
    primera: (s) => `${pm('toUpperCase', all('toLowerCase', s))}`,
    primeras: (s) => `${tm('toUpperCase', all('toLowerCase', s))}`,
    todas: (s) => `${all('toUpperCase', s)}`,
  },
  minusculas: {
    todas: (s) => `${all('toLowerCase', s)}`,
  },
  moneda: (s) => `$${s}`,
  preparar: (s) => !s ? [] : s.toString().toLowerCase().split(/\s+/),
  documento: (s) => !s? "" : s.replace(/\D/g, ''),
  cuit: (s) => !s? "" : formatCuit(s),
  resumen: resumirTexto,
  unidades: (s) => `${tm('toUpperCase', all('toLowerCase', s))}`,
  defecto: (defecto) => (s) => s?s:defecto,
}

const ff = (d) =>  d.toLocaleDateString('es-AR').split("/").map((d,i) => i<2?`00${d}`.slice(-2):d).join("/");

const hh = (d) => {
  const ah = d.toLocaleTimeString('es-AR').split(":");
  return ({
    hh: ah[0],mm: ah[1],ss: ah[2],
    hhmm: `${ah[0]}:${ah[1]}`,
    hhmmss: `${ah[0]}:${ah[1]}:${ah[2]}:`,
  })
}

export const fechas = {
  fecha: (d) => ff(d),
  hora:  (d) => hh(d),
  fechaYhora: (d) => `${ff(d)} ${hh(d).hhmm}`,
}


/*
 \d+\s?(g|ml|cc|kg)
*/