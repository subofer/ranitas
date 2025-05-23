const pm = (dir, s) => `${s.charAt(0)[dir]()}${s.slice(1)}`;
const all = (dir, s) => `${s?.[dir]()}`;
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
  monedaDecimales: (s) => {
    if (typeof s !== "number") return "$0.00"; // Manejo de valores `undefined` o incorrectos
    return `$${s.toLocaleString('es-AR', {
    minimumFractionDigits: 2, // Asegura que siempre haya dos dígitos después del punto decimal
    maximumFractionDigits: 2, // Limita los dígitos después del punto decimal a dos
  })}`},

  preparar: (s) => !s ? [] : s.toString().toLowerCase().split(/\s+/),
  documento: (s) => !s? "" : s.replace(/\D/g, ''),
  cuit: (s) => !s? "" : formatCuit(s),
  resumen: resumirTexto,
  resumenN: (n) => (s) => resumirTexto(s,n),
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

export const fechaHoy = () => {
  const hoy = new Date();
  const anho = hoy.getFullYear();
  const mes = (`0${hoy.getMonth() + 1}`).slice(-2); // Añade un cero adelante y luego obtiene los últimos 2 caracteres para asegurar el formato MM
  const dia = (`0${hoy.getDate()}`).slice(-2); // Añade un cero adelante y luego obtiene los últimos 2 caracteres para asegurar el formato DD
  return `${anho}-${mes}-${dia}`;
};


export const tiempo = {
  segundos: (t) => t * 1000,
  minutos:  (t) => t * tiempo.segundos(60),
  horas:    (t) => t * tiempo.minutos(60),
  dias:     (t) => t * tiempo.horas(24),
  semanas:  (t) => t * tiempo.dias(7),
  meses:    (t) => t * tiempo.semanas(4),
  años:     (t) => t * tiempo.meses(12)
}

const units = {
  segundos: "sec",
  minutos:  "minutes",
  horas:    "hours",
  dias:     "days",
  semanas:  "weeks",
  años:     "years",
}

export const expiraEn = (t, unidad) => new Date( Date.now() + tiempo[unidad](t) );
export const expiraStr = (t, unidad) => `${expiraEn(t, unidad)/1000} secs`;