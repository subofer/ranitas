
const pm = (dir, s) => `${s.charAt(0)[dir]()}${s.slice(1)}`;
const all = (dir, s) => `${s[dir]()}`;
const tm = (dir, s) => s.split(" ").map(p => p.length > 2 ? pm(dir, p) : p).join(" ");


export const texto = {
  mayusculas: {
    primera: (s) => pm('toUpperCase', all('toLowerCase', s)),
    primeras: (s) => tm('toUpperCase', all('toLowerCase', s)),
    todas: (s) => tm('toUpperCase', s),
  },
  minusculas: {
    todas: (s) => all('toLowerCase', s),
  }
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