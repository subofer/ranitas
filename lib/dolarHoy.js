"use server"
import { cargarURL, finalizarNavegacion } from "./puppeteerSession";

export default async function buscarValoresDolar() {
  let resultado;
  let { pagina, navegador } = await cargarURL(`https://dolarhoy.com/`);
  try {
    resultado = await pagina.evaluate(() => {
      const result = {};
      const elements = document.querySelectorAll('.tile.dolar, .tile.is-child');

      elements.forEach((e) => {
        const tr = (a) => a ? a.textContent.trim().replace('$', '') : null;

        const [titulo, compra, venta] =
          ['.title', '.compra .val', '.venta .val'].map(
            (x) => tr(e.querySelector(x))
        );

        if (titulo && (compra || venta)) {
          result[titulo] = {
            compra: compra,
            venta: venta,
          };
        }
      });
      return result;
    });
    resultado.keys = Object.keys(resultado);
    console.log(resultado)
  } catch (e) {
    resultado = e;
  } finally {
    finalizarNavegacion(pagina, navegador);
    return resultado;
  }
}
