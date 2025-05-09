
const fs = require('fs');

function filtrarCalles() {
  try {
    // Leer el archivo JSON con el encoding adecuado
    const data = fs.readFileSync('calles.json', 'utf8');
    const obj = JSON.parse(data);
    const cantidadOriginal = obj.cantidad;
    console.log('Archivo cantidad calles Original: ', cantidadOriginal);

    // Expresión regular para identificar nombres no deseados
    const regex = /^Calle s[/\s]?n$/i;

    // Filtrar las calles que no coincidan con la expresión regular
    const callesFiltradas = obj.calles.filter(calle => !regex.test(calle.nombre));
    const callesTransformadas = callesFiltradas.map(({altura:{inicio, fin}, ...calle}) => ({
      id: calle.id,
      nombre: calle.nombre,
      categoria: calle.categoria,
      alturas:JSON.stringify([[inicio.derecha, inicio.izquierda],[fin.derecha, fin.izquierda]]),
      idProvincia: calle.provincia.id,
      idLocalidadCensal: calle.localidad_censal.id

    }));


    // Actualizar el objeto con las calles filtradas y la nueva cantidad y total
    obj.calles = callesTransformadas;
    obj.cantidad = callesTransformadas.length;
    obj.total = callesTransformadas.length;
    obj.inicio = 0;
    obj.paramentros = {};

    // Guardar el resultado en un nuevo archivo JSON
    fs.writeFileSync('calles_filtradas.json', JSON.stringify(obj));

    console.log('Archivo guardado con las calles filtradas. Total de calles filtradas: ', callesFiltradas.length);
    console.log('Total calles removidas:', cantidadOriginal-callesFiltradas.length);
  } catch (err) {
    console.error('Error al procesar el archivo:', err);
  }
}

// Ejecutar la función de filtrado
//filtrarCalles();



function limpiarLocalidades() {
  try {
    // Leer el archivo JSON con el encoding adecuado
    const data = fs.readFileSync('localidades.json', 'utf8');
    const obj = JSON.parse(data);

    // Eliminar los campos "centroide", "categoria" y "fuente" de cada localidad
    const objNew = obj.map(localidad => ({
      id: localidad.id,
      nombre: localidad.nombre,
      provincia: localidad.provincia,
      departamento: localidad.departamento,
      municipio: localidad.municipio,
      localidad_censal: localidad.localidad_censal
    }));

    // Guardar el resultado en un nuevo archivo JSON
    fs.writeFileSync('localidades_limpias.json', JSON.stringify(objNew));

    console.log('Archivo guardado con las localidades limpias.');
  } catch (err) {
    console.error('Error al procesar el archivo:', err);
  }
}

limpiarLocalidades()