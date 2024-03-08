"use server"
import axios from 'axios'; // Asegúrate de importar axios correctamente
import { load } from 'cheerio';

export const buscarPorCodigoDeBarrasEnGoogle = async (codigoDeBarras) => {
  const url = `https://www.google.com/search?q=${codigoDeBarras}`;
  const { data } = await axios.get(url);
  const $ = load(data);
  console.log(url);
  console.log($("body").text());
    let pepe = []
    const contenedores = $('.yuRUbf').each((index, element) => {

      const titulo = $(element).find('h3').text();
      const enlace = $(element).find('a').attr('href');

      let precio = '';
      const textoContenedor = $(element).text();
      const matchPrecio = textoContenedor.match(/\$\s*\d+(?:,\d{3})*(\.\d{2})?/); // Expresión regular para precios como $1,000.00
      if (matchPrecio) {
        precio = matchPrecio[0]; // Toma el primer match como el precio
      }
      pepe.push({ titulo, enlace, precio });
      console.log({ titulo, enlace, precio });
    });
    console.log(pepe);

  }