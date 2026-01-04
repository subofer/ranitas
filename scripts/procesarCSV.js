const fs = require('fs');
const path = require('path');

// Función para procesar el CSV de inventario
function procesarCSVInventario() {
  const rutaCSV = '/home/subofer/CURSOR/INVENTARIO 9-02-2024.xlsx - Hoja1.csv';
  
  try {
    console.log('📂 Leyendo archivo CSV...');
    const contenido = fs.readFileSync(rutaCSV, 'utf8');
    const lineas = contenido.split('\n');
    
    console.log(`📊 Total de líneas: ${lineas.length}`);
    
    // Estructura para almacenar los datos procesados
    const proveedores = new Map();
    const productos = [];
    
    let proveedorActual = null;
    let lineaActual = 0;
    
    for (const linea of lineas) {
      lineaActual++;
      
      // Omitir línea de encabezados (línea 1)
      if (lineaActual === 1) continue;
      
      // Si la línea está vacía, continuar
      if (!linea.trim()) continue;
      
      const columnas = linea.split(',');
      
      // Detectar líneas de proveedores (terminan con muchas comas)
      if (columnas.length >= 15 && columnas.slice(1, 15).every(col => col.trim() === '')) {
        proveedorActual = columnas[0].trim();
        proveedores.set(proveedorActual, { nombre: proveedorActual, productos: [] });
        console.log(`🏢 Proveedor encontrado: ${proveedorActual}`);
        continue;
      }
      
      // Si tenemos un proveedor actual, procesar productos
      if (proveedorActual && columnas[0] && columnas[0].trim()) {
        const nombreProducto = columnas[0].trim();
        const costo = columnas[2] ? columnas[2].replace(/[$,\s]/g, '') : '0';
        const precioFinal = columnas[10] ? columnas[10].replace(/[$,\s]/g, '') : '0';
        const precioUnidad = columnas[11] ? columnas[11].replace(/[$,\s]/g, '') : '0';
        
        // Solo procesar productos con precio válido
        const precioNumerico = parseFloat(precioFinal) || parseFloat(precioUnidad) || 0;
        
        if (precioNumerico > 0) {
          const producto = {
            codigo: `779${String(lineaActual).padStart(9, '0')}`, // Generar código único
            descripcion: nombreProducto,
            precio: precioNumerico,
            proveedor: proveedorActual,
            categoria: determinarCategoria(nombreProducto),
            costo: parseFloat(costo) || 0,
            linea: lineaActual
          };
          
          productos.push(producto);
          
          // Agregar a la lista del proveedor
          if (proveedores.has(proveedorActual)) {
            proveedores.get(proveedorActual).productos.push(producto);
          }
        }
      }
    }
    
    console.log(`\n📈 Resumen:`);
    console.log(`   - Proveedores encontrados: ${proveedores.size}`);
    console.log(`   - Productos válidos: ${productos.length}`);
    
    // Mostrar resumen por proveedor
    console.log('\n🏢 Productos por proveedor:');
    for (const [nombreProv, datosProv] of proveedores) {
      console.log(`   - ${nombreProv}: ${datosProv.productos.length} productos`);
    }
    
    // Crear archivo de datos procesados para el script de importación
    const datosParaImportacion = productos.map(producto => ({
      codigo: producto.codigo,
      descripcion: producto.descripcion,
      precio: producto.precio,
      proveedor: producto.proveedor,
      categoria: producto.categoria
    }));
    
    const archivoSalida = path.join(process.cwd(), 'scripts', 'datos-planilla-common.js');
    const contenidoSalida = `// Datos procesados automáticamente desde CSV de inventario
// Generado el: ${new Date().toISOString()}

const datosPlanilla = ${JSON.stringify(datosParaImportacion, null, 2)};

const resumenProveedores = ${JSON.stringify(Array.from(proveedores.entries()).map(([nombre, datos]) => ({
  nombre,
  cantidadProductos: datos.productos.length
})), null, 2)};

module.exports = { datosPlanilla, resumenProveedores };
`;
    
    fs.writeFileSync(archivoSalida, contenidoSalida, 'utf8');
    console.log(`\n💾 Archivo generado: ${archivoSalida}`);
    
    return { proveedores, productos };
    
  } catch (error) {
    console.error('❌ Error procesando CSV:', error);
    return null;
  }
}

// Función para determinar categoría basada en el nombre del producto
function determinarCategoria(nombreProducto) {
  const nombre = nombreProducto.toLowerCase();
  
  if (nombre.includes('miel')) return 'Mieles y Dulces';
  if (nombre.includes('mermelada') || nombre.includes('jalea')) return 'Mermeladas y Jaleas';
  if (nombre.includes('jugo') || nombre.includes('bebida')) return 'Jugos y Bebidas';
  if (nombre.includes('dulce de leche')) return 'Dulces y Confituras';
  if (nombre.includes('fruto') || nombre.includes('fruta')) return 'Frutas y Conservas';
  if (nombre.includes('light') || nombre.includes('stevia') || nombre.includes('bajo en')) return 'Productos Light';
  if (nombre.includes('orgánic')) return 'Productos Orgánicos';
  if (nombre.includes('crem') || nombre.includes('líquid')) return 'Mieles y Dulces';
  
  // Categoría por defecto
  return 'Alimentos y Conservas';
}

// Ejecutar procesamiento
console.log('🚀 Iniciando procesamiento del CSV de inventario...\n');
const resultado = procesarCSVInventario();

if (resultado) {
  console.log('\n✅ Procesamiento completado exitosamente!');
  console.log('Ahora puedes ejecutar la importación.');
} else {
  console.log('\n❌ Error en el procesamiento');
}
