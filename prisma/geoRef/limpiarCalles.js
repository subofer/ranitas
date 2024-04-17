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

    // Actualizar el objeto con las calles filtradas y la nueva cantidad y total
    obj.calles = callesFiltradas;
    obj.cantidad = callesFiltradas.length;
    obj.total = callesFiltradas.length;
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
filtrarCalles();
