import { contarProductos } from "@/prisma/consultas/productos";

const generateBarCode = async ({ nombre }) => {
  const prefijo = `2333${await contarProductos()}`;

  const codif = `${[...nombre].reduce((acc, char, i) =>
    acc + char.charCodeAt(0) + i
  , (Math.random() * 90 + 10 | 0) * 1e4)}`;

  return `${prefijo}${'0'.repeat(13 - prefijo.length - codif.length)}${codif}`;
};

export default generateBarCode;
const generarPresentaciones = () => {
  const empaques = [
    { tipo: "caja", base: 10 }, // Ejemplo: Caja contiene 10 unidades
    { tipo: "bolsa", base: 5 }, // Bolsa contiene 5 unidades
    { tipo: "unidad", base: 1 }, // Unidad base
  ];

  const embases = [
    { tipo: "botella", base: 1 },
    { tipo: "bolsa", base: 1 },
    { tipo: "caja", base: 10 }, // Caja contiene 10 envases
    { tipo: "unidad", base: 1 },
  ];

  const contenido = [
    { tipo: "litros", base: 1 },
    { tipo: "mililitros", base: 0.001 },
    { tipo: "gramos", base: 0.001 },
    { tipo: "kilogramos", base: 1 },
    { tipo: "unidades", base: 1 },
  ];

  const presentaciones = [];

  empaques.forEach((empaque) => {
    embases.forEach((embase) => {
      contenido.forEach((cont) => {
        const descripcion = `${empaque.tipo} de ${embase.tipo} de ${cont.tipo}`;
        const equivalencia =
          empaque.base * embase.base * cont.base; // Calculamos la equivalencia total
        presentaciones.push({
          descripcion,
          empaque: empaque.tipo,
          embase: embase.tipo,
          contenido: cont.tipo,
          multiplicador: equivalencia,
        });
      });
    });
  });

  console.log(presentaciones); // Muestra todas las combinaciones con equivalencias
  return presentaciones;
};

//const presentacionesGeneradas = generarPresentaciones();
