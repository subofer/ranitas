"use server"
import { getBrowserInstance } from "./puppeteerSession";

export default async function buscarPorCodigoDeBarras(texto) {
  const url = `https://www.google.com/search?q=${texto}`;
  const navegador = await getBrowserInstance();
  const pagina = await navegador.newPage();
  await pagina.goto(url);

  const evaluation = await pagina.evaluate(() => {
    const divsBusqueda = document.querySelectorAll(".srKDX.cvP2Ce");
    const resultadosDeLaBusqueda = [];
    const salidaHtml = []

    divsBusqueda.forEach((div, index) => {
      salidaHtml.push(div.innerHTML);

      const bloque = div.querySelector("h3").closest("[data-snc]");
      const enlaceElemento = bloque.querySelector("a");

      const imagenComercio = div.querySelector("img.XNo5Ab");
      const imagenProducto = div.querySelector("div.uhHOwf img")

      let precioString = div.querySelector('.fG8Fp > span')?.textContent.replace(",","").replace(".",",") || "";
      let rating = {};
      let valor = 0;

      if (precioString.includes("Rating:")) {
        const matchRatingOpiniones = precioString.match(/Rating: (\d+)%(\d+) opinión/);
        if (matchRatingOpiniones) {
          rating.valor = parseInt(matchRatingOpiniones[1], 10);
          rating.opiniones = parseInt(matchRatingOpiniones[2], 10);
          rating.tieneRating = true;
        }
      }

      const matchPrecio = precioString.match(/ARS\s*([0-9,.]+)/);
      if (matchPrecio) {
        valor = parseFloat(matchPrecio[1].replace(/\./g, ''));
      }

      resultadosDeLaBusqueda.push({
        titulo: bloque.querySelector("h3")?.textContent || "",
        comercio: bloque.querySelector(".VuuXrf")?.textContent || "",
        logoComercio: {
          src: imagenComercio?.src || "",
          alt: imagenComercio?.alt || "",
        },
        categoria: bloque.querySelector(".ylgVCe")?.textContent || "",
        descripcion: bloque.querySelector(".BNeawe")?.textContent || "",
        enlace: {
          href: enlaceElemento?.href || "",
          text: enlaceElemento?.textContent || ""
        },
        imagen: {
          src: imagenProducto?.src || "",
          alt: imagenProducto?.alt || "",
        },
        rating,
        precio: {
          precioString,
          valor,
          disponible: precioString.includes("Disponible"),
          enPesosArgentinos: precioString.includes("ARS"),
        }
      });
    });

    /*
    resultadosDeLaBusqueda.sort((a, b) => {

      if (a.rating.tieneRating && !b.rating.tieneRating) return -1;
      if (!a.rating.tieneRating && b.rating.tieneRating) return 1;

      if (a.precio.valor && !b.precio.valor)return -1;
      if (!a.precio.valor && b.precio.valor)return 1;

      if (a.hasImagen && !b.hasImagen) return -1;
      if (!a.hasImagen && b.hasImagen) return 1;

      if (a.rating.tieneRating && b.rating.tieneRating) return b.rating.valor - a.rating.valor; // Mayor valor de rating primero

       return 0;
    });
*/
    return {
      html: salidaHtml,
      resultadosDeLaBusqueda
    };
  });

  return evaluation;
}
