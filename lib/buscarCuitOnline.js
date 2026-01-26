"use server"
import { getBrowserInstance } from "./puppeteerSession";

export default async function buscarCuitOnline(cuitOdni) {
  let pagina = null;
  let navegador = null;
  try{
    const url = `https://www.cuitonline.com/search.php?q=${cuitOdni}`
    const isDev = process.env.NODE_ENV === 'development'
    // Ejecutar en modo headless por defecto. Para depurar puedes forzar el navegador visible
    // estableciendo la variable de entorno DEBUG_CUIT_BROWSER=true
    const showBrowser = process.env.DEBUG_CUIT_BROWSER === 'true'
    console.log('buscarCuitOnline - showBrowser:', showBrowser)

    // Usamos showBrowser (false por defecto) para evitar abrir ventanas del navegador en el servidor
    navegador = await getBrowserInstance(showBrowser);
    pagina = await navegador.newPage();
    await pagina.goto(url);

    const resultados = await pagina.evaluate(() => {
      const elementosHit = document.querySelectorAll(".hit");
      return Array.from(elementosHit).map(elemento => {
        const nombreElemento = elemento.querySelector("h2.denominacion");
        const nombre = nombreElemento ? nombreElemento.innerText.trim() : "";
        const cuitElemento = elemento.querySelector(".cuit");
        const cuit = cuitElemento ? cuitElemento.innerText.trim() : "";

        let tipo = "";
        let datosAdicionales = {};

        const infoElemento = elemento.querySelector(".doc-facets");
        if (infoElemento) {
          const detalles = infoElemento.innerText.split('\n')
            .map(linea => linea.trim())
            .filter(linea => linea);

          detalles.forEach(detalle => {
            const detalleLimpio = detalle.replace(/•\s*/g, '');
            if (detalleLimpio.includes('Persona')) {
              tipo = detalleLimpio.includes('Física') ? 'Física' : 'Jurídica';
              const generoMatch = detalleLimpio.match(/\((masculino|femenino)\)/i);
              if (generoMatch) {
                datosAdicionales.genero = generoMatch[1];
              }
            } else {
              const [clave, valor] = detalleLimpio.split(':').map(part => part.trim());
              if (clave.toLowerCase() !== 'cuit' && clave && valor) {
                datosAdicionales[clave.toLowerCase().replace(/\s+/g, '_')] = valor;
              } else if (detalleLimpio.toLowerCase().includes('empleador')) {
                // Asume "Empleador" sin valor específico como "Sí"
                datosAdicionales['empleador'] = 'Sí';
              }
            }
          });
        }

        return {
          nombre,
          cuit,
          tipo,
          datosAdicionales
        };
      });
    });



    return resultados
  } catch (e) {
      console.error(e)
  } finally {
      try{
        if (pagina) pagina.close();
        if (navegador) navegador.close();
      }catch(e){
        //console.log(e)
      }
    }
}
