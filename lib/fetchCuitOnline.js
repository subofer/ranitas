"use server"
import fetch from 'node-fetch';
import { load } from 'cheerio';
import { textos } from './manipularTextos';

const fetchCuitOnline = async (cuitOdni) => {
  if(!cuitOdni) return ({error: true, msg: "falta dni o cuit"});
  const url = `https://www.cuitonline.com/search.php?q=${cuitOdni}`;
  const response = await fetch(url);
  const body = await response.text();
  const $ = load(body);

  const resultados = $(".hit").map((i, elemento) => {
    const datos = {
      nombre:textos.mayusculas.primeras($(elemento).find("h2.denominacion").text().trim()),
      nombreCrudo:$(elemento).find("h2.denominacion").text(),
      cuit:$(elemento).find(".cuit").text().trim()
    };

    const t = (t) => (c) => t.toLowerCase().includes(c)

    $(".doc-facets").find('span.bullet').each((i, {nextSibling: nodo}) => {
      if (nodo && nodo.type === 'text') {
        const texto = $(nodo).text().trim();
        const tiene = t(texto)
        if (tiene("persona")){
          if(tiene("sica")){
            datos.persona = "Persona Fisica"
            datos.sexo = $(nodo).next().text()
            datos.iva = "Consumidor Final"
          } else if (tiene("dica")){
            datos.persona = "Persona Juridica"
          }
        }
        tiene("ganancias") && (datos.ganancias = texto.split(":")[1].trim())
        tiene("iva") && (datos.iva = texto.split(":")[1].trim())
        tiene("empleador") && (datos.empleador = true)
      }
    });
    return datos;
  }) 
  const respuesta = resultados[0] || {error: true, msg:"No se encontro"}
  console.log(respuesta)
  return respuesta;
};

export default fetchCuitOnline;
