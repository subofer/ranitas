"use server"
import { getBrowserInstance } from "./puppeteerSession";
import { textos } from "./manipularTextos";
import { consultarAHere } from "@/app/ia/consultaIa";

const  buscarEnGoogle = async (texto) => {
  let pagina = null;
  let navegador = null;
  try {
    const url = `https://www.google.com.ar/search?q=${texto}`;
    const isDev = process.env.NODE_ENV === 'development'
    navegador = await getBrowserInstance(true);
    pagina = await navegador.newPage();
    await pagina.goto(url, {waitUntil: 'networkidle2'});
  } catch(e) {
      console.log(e)
  } finally {
    return { pagina, navegador };
  }
};

const finalizarNavegacion = (pagina, navegador) => {
  if(true){
    if (pagina) pagina.close();
    if (navegador) navegador.close();
  }
};

const navegarPorEnlace = async (pagina, navegador, textoEnlace) => {
  const enlace = await pagina.evaluate((texto) => {
    const enlaces = [...document.querySelectorAll('a div')];
    for (let div of enlaces) {
      if (div.textContent.includes(texto)) {
        const enlace = div.closest('a');
        enlace.click();
        return { enlace: enlace.href, clicked: true };
      }
    }
    return { enlace: null, clicked: false };
  }, textoEnlace);
    console.log(enlace)
    if (enlace.clicked) {
      await pagina.waitForNavigation({ waitUntil: 'networkidle2' });
    }
    return { pagina, navegador };
};

export default async function buscarPorCodigoDeBarras(texto) {
  let { pagina, navegador } = await buscarEnGoogle(texto)
  try{
    const [imagenes, evaluation, textoCompleto] = await pagina.evaluate((codigoDeBarras, consultarAHere) => {
      const codigoBuscado = codigoDeBarras;
      const textoResultados = document.documentElement.innerText;
      const divsBusqueda = document.querySelectorAll("#rso > div");

      const resultadosDeLaBusqueda = [];

      let imagenesPro = [...document.querySelectorAll('.EyBRub')]
        .map(contenedor => [...contenedor.querySelectorAll('img')]
          .filter(img => img.alt)
          .map(({src, alt}) => ({
            imagen: { src, alt: alt || 'Sin descripción'}})
          )
        ).flat()


      divsBusqueda.forEach((div, index) => {

        const titulo = div.querySelector("h3")?.textContent || "";
        const enlaceElemento = div.querySelector("a");

        const imagenComercio = div.querySelector("img.XNo5Ab");
        let imagenProducto = div.querySelector("div.uhHOwf img")

        const spans = div.querySelectorAll('.fG8Fp > span');

        let precioString = [...spans].map(span => span.textContent.replace(",", "").replace(".", ",")).join(" ");

        const regex = /(?:(Rating: (\d+)%|Calificación: (\d+))\s*·?\s*(\d+)\s*opinión(?:es)?\s*·?\s*)?(ARS)\s*([0-9,]+)\s*(·\s*No)?/;
        let matchRating = precioString.match(regex);
        let rating = {};
        let precio  = {};

        if (matchRating) {
          rating = {
            ...rating,
            valor: matchRating[2] ? parseInt(matchRating[2], 10) : matchRating[3] ? parseInt(matchRating[3], 10) : null,
            opiniones: matchRating[4] ? parseInt(matchRating[4], 10) : null,
            tieneRating: !!rating.valor,
            tipo: matchRating[2] ? "Rating" : matchRating[3] ? "Calificación" : null,
          }
          precio = {
            ...precio,
            valor: parseFloat(matchRating[6].replace(/\./g, '').replace(',', '.')),
            disponible: !matchRating[7],
            enPesosArgentinos: matchRating[5] == "ARS",
            moneda: matchRating[5],
            precioString: matchRating[0],
          }
        }

        let fraseUnidades = titulo.replace(/[-\/.]+|\s{2,}/g, ' ');
        fraseUnidades = fraseUnidades.replace(codigoDeBarras, '').trim();

        const regexUnidades = /(\d+)\s?(ml|cc|kg|gr|g|L)\b/gi;
        const resultadoUnidades = fraseUnidades.match(regexUnidades);

        let detalles = {
          nombre : "",
          unidad : "",
          cantidad : 0,
          tieneUnidad : false,
        }

        if (resultadoUnidades && resultadoUnidades.length > 0) {
          const match = regexUnidades.exec(resultadoUnidades[0]);
          if (match) {
            detalles = {
              ...detalles,
              cantidad: parseFloat(match[1], 10),
              unidad: match[2],
              tieneUnidad: true,
              nombre: fraseUnidades.replace(match[0], '').trim(),
            }
          }
        }
        const articulo = {
          titulo,
          codigoDeBarras,
          comercio: div.querySelector(".VuuXrf")?.textContent || "",
          logoComercio: {
            src: imagenComercio?.src || "",
            alt: imagenComercio?.alt || "",
          },
          categoria: div.querySelector(".ylgVCe")?.textContent || "",
          descripcion: div.querySelector(".BNeawe")?.textContent || "",
          enlace: {
            href: enlaceElemento?.href || "",
            text: enlaceElemento?.textContent || ""
          },
          imagen: {
            tieneImagen: imagenProducto?.src ? true: false,
            src: imagenProducto?.src || "",
            alt: imagenProducto?.alt || "",
          },
          rating,
          precio,
          detalles,
          puntaje: 0,
          prismaObject: {
            codigoBarra: codigoBuscado,
            nombre: detalles.nombre,
            categoriaId: 0,
            precioActual: precio.valor,
            size: detalles.cantidad,
            unidad: detalles.unidad,
            descripcion: titulo,
            imagen: imagenProducto?.src || "",
            proveedores: [],
          }
        };
        let puntaje = 0;
          if (articulo.detalles.tieneUnidad) puntaje += 60;
          if (articulo.precio.enPesosArgentinos) puntaje += 40;
          if (articulo.imagen.tieneImagen) puntaje += 20;
          if (articulo.rating.tieneRating) puntaje += 10;
          if (articulo.precio.valor == 0) puntaje -= 5;
        articulo.puntaje = puntaje;

        resultadosDeLaBusqueda.push(articulo)
      });

    return [imagenesPro, resultadosDeLaBusqueda, textoResultados]
    },texto, consultarAHere);

    evaluation.sort((a, b) => b.puntaje - a.puntaje);

    evaluation.forEach(r => {
      if(r.imagen?.src && (!r.imagen.src.includes('data:image') || r.imagen.src == "data:image/gif;base64,R0lGODlhAQABAIAAAP///////yH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==")){
        r.imagen.src == "ImagenTruchaCambiar"
        r.imagen.tieneImagen = false;
      }
      r.detalles.nombre = textos.mayusculas.primeras(r.detalles.nombre);

      r.prismaObject.codigoBarra = r.prismaObject.codigoDeBarras;
      r.prismaObject.nombre = textos.mayusculas.primeras(r.prismaObject.nombre);
      r.prismaObject.categoriaId = 0;
      r.prismaObject.precio = r.prismaObject.precioActual;
      r.prismaObject.size = parseInt(r.prismaObject.size);
      r.prismaObject.unidad = textos.mayusculas.primeras(r.prismaObject.unidad);
      r.prismaObject.descripcion = textos.mayusculas.primeras(r.prismaObject.descripcion);
    });


    //Cambia las imagenes por imagenes aleatorias del resto del conjunto.
    const pRis = evaluation.filter(r => r.imagen.tieneImagen);
    let lastUsed = null;
    const ri = (a) => Math.floor(Math.random() * a.length);
    const dr = (l, a, n = ri(a)) => l == n ? ri(a) : n;
    if (pRis.length != 0){
      evaluation.forEach(r => {
        if (!r.imagen.tieneImagen || r.imagen.src == "ImagenTruchaCambiar") {
          lastUsed = dr(lastUsed, pRis);
          r.imagen = pRis[lastUsed].imagen;
          r.prismaObject.imagen = r.imagen.src;
        }
      });
    }
    //Le cambio la imagen al primer resultado por una de la lista de imagenes pro.
    const primerResultado = evaluation[0];
    const mejoresResultados = evaluation.filter(({puntaje}) => puntaje > 20);
    // Filtrar imágenes excluyendo la específica basándose en su `src`
    let imagenesFiltradas = imagenes.filter(({ imagen }) => imagen.src !== "data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==");
    imagenesFiltradas = imagenesFiltradas.filter(({ imagen }) => !imagen.src.includes("https://encrypted-tbn0.gstatic.com/images?"));
    imagenesFiltradas = imagenesFiltradas.filter(Boolean)
    if(evaluation.length > 0 && mejoresResultados.length > 0){
      return {
        error:{},
        imagenes:imagenesFiltradas || [],
        resultadosDeLaBusqueda: evaluation,
        primerResultado,
        mejoresResultados,
        textoCompleto
      };
    }
  } catch (e) {
    return {
      error: e,
      imagenes: [],
      resultadosDeLaBusqueda: [{ prismaObject: {} }],
      primerResultado: {titulo: "no se encontro"},
      mejoresResultados: [{ prismaObject: {} }],
    };

  } finally {
    finalizarNavegacion(pagina,navegador);
  }
};
