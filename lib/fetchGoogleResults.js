"use server"
import axios from 'axios'; // Asegúrate de importar axios correctamente
import { load } from 'cheerio';

export const buscarPorCodigoDeBarrasEnGoogle = async (codigoDeBarras) => {
  const url = `https://www.google.com/search?q=${codigoDeBarras}`;
  const { data } = await axios.request({
    method: "GET",url,
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
    }})
  const $ = load(data);

//  console.log($("#search").text());
  let pepe = []
  const contenedores = $('.srKDX').each((index, element) => {

    const titulo = $(element).find('h3').text();
    const enlace = $(element).find('a').attr('href');
    const imagen = {
      alt: $(element).find('img').attr('alt'),
      src: $(element).find('img').attr('src'),
    }
    let comercio = $(element).find('.VuuXrf').text();
    comercio = comercio.substring(0, comercio.length/2);
    let posiblePrecio = $(element).find('.fG8Fp').find('span').text()
    let disponible = posiblePrecio.includes("Disponible");
    let enPesosArgentinos = posiblePrecio.includes("ARS ");
    
    posiblePrecio = posiblePrecio.replace("Disponible",'')
    posiblePrecio = posiblePrecio.replace("ARS ",'')

/*
    let precio = '';
    const matchPrecio = posiblePrecio.match(/\$\s*\d+(?:,\d{3})*(\.\d{2})?/);
    if (matchPrecio) {
      precio = matchPrecio[0]; // Toma el primer match como el precio
    }
    */
    pepe.push({ disponible, enPesosArgentinos,  comercio, titulo, enlace, imagen, posiblePrecio });
  });
  console.log(pepe);
}