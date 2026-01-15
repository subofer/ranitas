import { datosPlanilla } from './datos-planilla-common.js';
import prisma from '../prisma/prisma.js';
import { hashPassword } from '../lib/sesion/crypto.js';
import { textos } from '../lib/manipularTextos.js';

const seedProductosDesdePlanilla = async () => {
  try {
    console.log('🌱 Creando productos desde planilla procesada...');
    console.log(`📊 Total de productos a procesar: ${datosPlanilla.length}`);

    // Crear usuario admin si no existe
    let usuarioAdmin = await prisma.usuarios.findUnique({
      where: { nombre: 'admin' }
    });

    if (!usuarioAdmin) {
      const hashedPassword = await hashPassword('admin');
      usuarioAdmin = await prisma.usuarios.create({
        data: {
          nombre: 'admin',
          password: hashedPassword,
          nivel: 1
        }
      });
      console.log('✅ Usuario admin creado');
    }

    // Procesar datos de la planilla
    const proveedoresUnicos = new Set();
    const categoriasUnicas = new Set();

    // Recopilar proveedores y categorías únicos
    datosPlanilla.forEach(item => {
      if (item.proveedor) proveedoresUnicos.add(item.proveedor);
      if (item.categoria) categoriasUnicas.add(item.categoria);
    });

    console.log(`🏢 Proveedores únicos encontrados: ${proveedoresUnicos.size}`);
    console.log(`📂 Categorías únicas encontradas: ${categoriasUnicas.size}`);

    // Crear categorías
    const categoriasMap = new Map();
    for (const catNombre of categoriasUnicas) {
      const categoria = await prisma.categorias.upsert({
        where: { nombre: catNombre },
        update: {},
        create: { nombre: catNombre },
      });
      categoriasMap.set(catNombre, categoria.id);
      console.log(`✅ Categoría "${catNombre}" creada`);
    }

    // Crear proveedores como contactos
    const proveedoresMap = new Map();
    for (const provNombre of proveedoresUnicos) {
      // Generar CUIT mock si no está disponible
      const cuitMock = `20${Math.random().toString().substr(2, 8)}9`;

      const proveedor = await prisma.contactos.upsert({
        where: { nombre: provNombre },
        update: {},
        create: {
          nombre: provNombre,
          cuit: cuitMock,
          telefono: '0800-completar-telefono',
          persona: 'JURIDICA',
          iva: 'RESPONSABLE_INSCRIPTO',
          esProveedor: true,
        },
      });
      proveedoresMap.set(provNombre, proveedor.id);
      console.log(`✅ Proveedor "${provNombre}" creado`);
    }

    // Crear productos (limitado para evitar sobrecarga inicial)
    const productosCreados = [];
    const limiteProductos = Math.min(500, datosPlanilla.length); // Procesar máximo 500 productos inicialmente
    
    console.log(`📦 Procesando ${limiteProductos} productos...`);
    
    for (let i = 0; i < limiteProductos; i++) {
      const item = datosPlanilla[i];
      
      if (i % 50 === 0) {
        console.log(`📦 Procesando producto ${i + 1}/${limiteProductos}...`);
      }

      const categoriasIds = [];
      if (item.categoria && categoriasMap.has(item.categoria)) {
        categoriasIds.push({ id: categoriasMap.get(item.categoria) });
      }

      // Usar código del item o generar uno
      const codigoBarra = item.codigo || `779${String(i + 1).padStart(9, '0')}`;

      // Extraer nombre y descripción
      const nombre = textos.mayusculas.primeras(item.descripcion || `Producto ${codigoBarra}`);
      const descripcion = item.descripcion || nombre;

      // Intentar determinar unidad y tamaño (lógica básica)
      let unidad = 'unidades';
      let size = 1;

      // Lógica para determinar unidad basada en la descripción
      if (descripcion.toLowerCase().includes('kg') || descripcion.toLowerCase().includes('kilo')) {
        unidad = 'kg';
        size = 1;
      } else if (descripcion.toLowerCase().includes('gr') || descripcion.toLowerCase().includes('gramo')) {
        unidad = 'gramos';
        size = descripcion.match(/(\d+)/)?.[1] || 100;
      } else if (descripcion.toLowerCase().includes('lt') || descripcion.toLowerCase().includes('litro')) {
        unidad = 'litros';
        size = 1;
      }

      const precio = parseFloat(item.precio) || Math.floor(Math.random() * 5000) + 1000;

      const producto = await prisma.productos.upsert({
        where: { codigoBarra: codigoBarra.toString() },
        update: {},
        create: {
          codigoBarra: codigoBarra.toString(),
          nombre,
          descripcion,
          unidad,
          size: parseFloat(size),
          tipoVenta: 'UNIDAD',
          categorias: {
            connect: categoriasIds
          }
        },
      });

      // Crear precio
      await prisma.precios.create({
        data: {
          idProducto: producto.id,
          precio: precio
        }
      });

      // Relacionar con proveedor
      if (item.proveedor && proveedoresMap.has(item.proveedor)) {
        await prisma.productoProveedor.upsert({
          where: {
            proveedorId_productoId: {
              proveedorId: proveedoresMap.get(item.proveedor),
              productoId: producto.id
            }
          },
          update: {},
          create: {
            proveedorId: proveedoresMap.get(item.proveedor),
            productoId: producto.id,
            codigo: nombre
          }
        });
      }

      productosCreados.push(producto);
    }

    // Crear algunos pedidos de ejemplo (solo para los primeros 50 productos)
    console.log('\n📦 Creando pedidos de ejemplo...');
    const productosParaPedidos = productosCreados.slice(0, Math.min(50, productosCreados.length));

    for (const producto of productosParaPedidos) {
      const cantidadRandom = Math.floor(Math.random() * 30) + 10; // Entre 10 y 40 unidades
      const precioUnitario = await prisma.precios.findFirst({
        where: { idProducto: producto.id },
        orderBy: { createdAt: 'desc' }
      });

      if (precioUnitario) {
        // Encontrar proveedor para este producto
        const relacionProveedor = await prisma.productoProveedor.findFirst({
          where: { productoId: producto.id },
          include: { proveedor: true }
        });

        if (relacionProveedor) {
          const pedido = await prisma.pedidos.create({
            data: {
              numero: `PED-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              fecha: new Date(),
              idProveedor: relacionProveedor.proveedorId,
              idUsuario: usuarioAdmin.id,
              notas: `Pedido automático para stock inicial desde planilla`,
              detallePedidos: {
                create: {
                  idProducto: producto.id,
                  cantidad: cantidadRandom,
                  precioUnitario: precioUnitario.precio,
                  observaciones: 'Stock inicial desde planilla'
                }
              }
            }
          });

          // Crear factura correspondiente
          await prisma.documentos.create({
            data: {
              idContacto: relacionProveedor.proveedorId, // Emisor (proveedor)
              idDestinatario: null, // Receptor (empresa)
              numeroDocumento: `FACT-${Date.now()}`,
              tipoMovimiento: 'ENTRADA',
              tipoDocumento: 'FACTURA_A',
              fecha: new Date(),
              tieneImpuestos: true,
              total: precioUnitario.precio * cantidadRandom,
              detalle: {
                create: {
                  idProducto: producto.id,
                  cantidad: cantidadRandom,
                  precioUnitario: precioUnitario.precio
                }
              }
            }
          });
        }
      }
    }

    console.log(`\n🎉 Importación completada exitosamente!`);
    console.log(`📊 Resumen:`);
    console.log(`   - Categorías creadas: ${categoriasMap.size}`);
    console.log(`   - Proveedores creados: ${proveedoresUnicos.size}`);
    console.log(`   - Productos creados: ${productosCreados.length}`);
    console.log(`   - Pedidos y facturas creadas: ${productosParaPedidos.length}`);
    console.log(`\n💡 Para importar más productos, modifica el límite en el script.`);

  } catch (error) {
    console.error('❌ Error en la importación:', error);
  }
};

// Ejecutar importación
console.log('🚀 Iniciando importación de datos desde planilla...\n');
seedProductosDesdePlanilla();
