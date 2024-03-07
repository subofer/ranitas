"use server"
import { getBrowserInstance } from "./puppeteerSession";

export default async function buscarPorCodigoDeBarras(texto) {
  const url = `https://www.google.com/search?q=${texto}`
  console.log(texto)

  try {
    const navegador = await getBrowserInstance();
    const pagina = await navegador.newPage();

    await pagina.goto(url);

    const resultado = await pagina.evaluate(() => {
      const resultados = [];
      const regexPrecio = /\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s*(·\s*Disponible)?/;
      const h3Elements = document.querySelectorAll("h3");

      h3Elements.forEach((h3, index) => {
        if (resultados.length < 500) {
          let bloque = h3.closest("[data-snc]");

          if (bloque) {
            const enlaceElemento = h3.closest("a");
            const url = enlaceElemento ? enlaceElemento.href : "URL no disponible";
            const nombreLocal = enlaceElemento ? enlaceElemento.querySelector(".VuuXrf").innerText : "Nombre del local no disponible";

            const imagenes = bloque.querySelectorAll("img");
            const imagen = imagenes.length > 1 ? imagenes[1].src : "Imagen no disponible";
            const hasImagen = imagen !== "Imagen no disponible";

            let descripcionDiv = bloque.querySelector("div:not([class]) > span");
            const descripcion = descripcionDiv ? descripcionDiv.innerText : "Descripción no disponible";

            const textosBloque = bloque.innerText || "";


            let precioFloat = 0;
            if (textosBloque) {
              const match = regexPrecio.exec(textosBloque);
              if (match) {
                precioFloat = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
              }
            }
            if (!isNaN(precioFloat)) {
              resultados.push({
                incidencia: index,
                titulo: h3.innerText,
                imagen,
                hasImagen,
                descripcion,
                precio: precioFloat,
                url,
                nombreLocal
              });
            }
          }
        }
      });

      return resultados;
    });


    return resultado
  } catch (error) {
    return error
  }
}
