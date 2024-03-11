"use server"
import axios from 'axios'; // Asegúrate de importar axios correctamente
import { load } from 'cheerio';

const buscarPorCodigoDeBarrasEnGoogle = async (codigoDeBarras) => {
  const url = `https://www.google.com/search?q=${codigoDeBarras}`;
  const { data } = await axios.request({
    method: "GET",url,
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
    }})
  const $ = load(data);

  let resultadosDeLaBusqueda = []
  const salidaHtml = []
  $('.srKDX').each((index, div) => {
    salidaHtml.push($(div).html())
  });
  
  const html = $('.srKDX').each((index, element) => {
    const enlace = $(element).find('a')

    let comercio = $(element).find('.VuuXrf').first().text();
    let categoria = $(element).find('.ylgVCe').first().text();
    let descripcion = $(element).find(".BNeawe").text()
    let precioString = $(element).find('.fG8Fp').find('span').text()

    let rating = {};
    const matchRatingOpiniones = precioString.match(/Rating: (\d+)%(\d+) opinión/);
    if (matchRatingOpiniones) {
      rating.valor = parseInt(matchRatingOpiniones[1], 10);
      rating.opiniones = parseInt(matchRatingOpiniones[2], 10);
      rating.tieneRating = true;
    }

    let valor;
    const matchPrecio = precioString.match(/ARS\s*([0-9,.]+)/);
    if (matchPrecio) {
      valor = matchPrecio[1].replace(",", "").replace(".",",");
    }

    resultadosDeLaBusqueda.push({
      comercio,
      logoComercio:{
        alt:$(element).find("img.XNo5Ab").attr('alt'),
        src:$(element).find("img.XNo5Ab").attr('src'),
      },
      categoria,
      titulo: $(element).find('h3').text(),
      descripcion,
      enlace:{
        href: enlace.attr('href'),
        text: enlace.text(),
      },
      imagen: {
        alt: $(element).find('.uhHOwf > img').attr('alt'),
        src: $(element).find('div.uhHOwf.ez24Df img').attr('src'),

      },
      rating,
      precio: {
        precioString,
        valor: parseFloat(valor),
        disponible: precioString.includes("Disponible"),
        enPesosArgentinos: precioString.includes("ARS"),
      }
      });
  });
  console.log(resultadosDeLaBusqueda);
  //return resultadosDeLaBusqueda;
  return {
    html: salidaHtml,
    resultadosDeLaBusqueda,
  }
}

export default buscarPorCodigoDeBarrasEnGoogle;