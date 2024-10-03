import { contarProductos } from "@/prisma/consultas/productos";

const generateBarCode = async ({ nombre }) => {
  const prefijo = `2333${await contarProductos()}`;

  const codif = `${[...nombre].reduce((acc, char, i) =>
    acc + char.charCodeAt(0) + i
  , (Math.random() * 90 + 10 | 0) * 1e4)}`;

  return `${prefijo}${'0'.repeat(13 - prefijo.length - codif.length)}${codif}`;
};

export default generateBarCode;

