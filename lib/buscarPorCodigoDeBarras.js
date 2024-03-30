"use server"
import { getBrowserInstance } from "./puppeteerSession";
import { textos } from "./manipularTextos";

export default async function buscarPorCodigoDeBarras(texto) {
  let pagina = null;
  let navegador = null;
  try{
    const url = `https://www.google.com.ar/search?q=${texto}`;
    const isDev = process.env.NODE_ENV === 'development'

    navegador = await getBrowserInstance(isDev || true);
    pagina = await navegador.newPage();
    await pagina.goto(url);

    const [imagenes, evaluation] = await pagina.evaluate((codigoDeBarras) => {
      const divsResultados = document.querySelector("#rso")
      const divsBusqueda = divsResultados.querySelectorAll("#rso > div");
      const resultadosDeLaBusqueda = [];

      const contenedoresEyBRub = document.querySelectorAll('.EyBRub');
      let imagenesPro = [];
      contenedoresEyBRub.forEach(contenedor => {
        const imagenes = contenedor.querySelectorAll('img'); // Cambia esto según necesites para ser más específico
        imagenes.forEach(img => {
          img?.alt  &&
          imagenesPro.push({imagen:{
            src: img.src,
            alt: img.alt || 'Sin descripción' // Asegúrate de tener un valor por defecto para 'alt'
          }
          });
        });
      });
      divsBusqueda.forEach((div, index) => {

        const titulo = div.querySelector("h3")?.textContent || "";
        const enlaceElemento = div.querySelector("a");

        const imagenComercio = div.querySelector("img.XNo5Ab");
        let imagenProducto = div.querySelector("div.uhHOwf img")

        const spans = div.querySelectorAll('.fG8Fp > span');

        let precioString = [...spans]
            .map(span => span.textContent.replace(",", "").replace(".", ",")).join(" ");

        const regex = /(?:(Rating: (\d+)%|Calificación: (\d+))\s*·?\s*(\d+)\s*opinión(?:es)?\s*·?\s*)?(ARS)\s*([0-9,]+)\s*(·\s*No)?/;
        let matchRating = precioString.match(regex);
        let rating = {};
        let precio = {};

        if (matchRating) {
          rating.valor = matchRating[2] ? parseInt(matchRating[2], 10) : matchRating[3] ? parseInt(matchRating[3], 10) : null;
          rating.opiniones = matchRating[4] ? parseInt(matchRating[4], 10) : null;
          rating.tieneRating = !!rating.valor;
          rating.tipo = matchRating[2] ? "Rating" : matchRating[3] ? "Calificación" : null;
          precio.valor = parseFloat(matchRating[6].replace(/\./g, '').replace(',', '.'));
          precio.disponible = !matchRating[7];
          precio.enPesosArgentinos = matchRating[5] == "ARS";
          precio.moneda = matchRating[5]
          precio.precioString = matchRating[0]
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
            detalles.cantidad = parseFloat(match[1], 10);
            detalles.unidad = match[2];
            detalles.tieneUnidad = true;
            detalles.nombre = fraseUnidades.replace(match[0], '').trim();
        }
      }

        resultadosDeLaBusqueda.push({
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
            codigoBarra: codigoDeBarras,
            nombre: detalles.nombre,
            categoriaId: 0,
            precioActual: precio.valor,
            size: detalles.cantidad,
            unidad: detalles.unidad,
            descripcion: titulo,
            imagen: imagenProducto?.src || "",
          }
        });
      });

    return [imagenesPro, resultadosDeLaBusqueda]
    },texto);

    evaluation.forEach((r,i) => {
      let puntaje = 0;
      if (r.detalles.tieneUnidad) puntaje += 60;
      if (r.precio.enPesosArgentinos) puntaje += 40;
      if (r.imagen.tieneImagen) puntaje += 20;
      if (r.rating.tieneRating) puntaje += 10;
      if (r.precio.valor == 0) puntaje -= 5;
      evaluation[i].puntaje = puntaje;
    });
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
    const primerResultadoDeLaBusqueda = evaluation[0];
    const mejoresResultados = evaluation.filter(({puntaje}) => puntaje > 20);
    // Filtrar imágenes excluyendo la específica basándose en su `src`
    let imagenesFiltradas = imagenes.filter(({ imagen }) => imagen.src !== "data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==");
    imagenesFiltradas = imagenesFiltradas.filter(({ imagen }) => !imagen.src.includes("https://encrypted-tbn0.gstatic.com/images?"));
    imagenesFiltradas = imagenesFiltradas.filter(Boolean)
    if(evaluation.length > 0 && mejoresResultados.length > 0){
      return {
        error:{},
        imagenes:imagenesFiltradas,
        resultadosDeLaBusqueda: evaluation,
        primerResultadoDeLaBusqueda,
        mejoresResultados,
      };
    }
  } catch (e) {
    return {
      error: e,
      imagenes: [],
      resultadosDeLaBusqueda: [{ prismaObject: {} }],
      primerResultadoDeLaBusqueda: {titulo: "no se encontro"},
      mejoresResultados: [{ prismaObject: {} }],
    };

  } finally {
    try{
      if(true){
        if (pagina) pagina.close();
        if (navegador) navegador.close();
      }
    }catch(e){
      //console.log(e)
    }
  }


}
