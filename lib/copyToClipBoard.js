"use client"
export function copiarAlPortapapeles(texto) {
  navigator.clipboard.writeText(texto).then(() => {
    console.log('Texto copiado al portapapeles');
  }).catch(err => {
    console.error('Error al copiar al portapapeles: ', err);
  });
}