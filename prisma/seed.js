import prisma from './prisma.js';
import { hashPassword } from '../lib/sesion/crypto.js';
import { readFileSync } from 'fs';
import { textos } from '../lib/manipularTextos.js';
import { seedDocumentTypes } from './seedDocumentTypes.js';

const seedUsuarios = async () => {
  const data = [
    { nombre: 'subofer', password: '1234' },
    { nombre: 'admin', password: 'admin' },
  ];

  for (const item of data) {
    const hashedPassword = await hashPassword(item.password);

    const newUser = {
      nombre: item.nombre,
      password: hashedPassword,
    };

    try {
      await prisma.usuarios.create({
        data: newUser,
      });
      console.log(`Usuario ${item.nombre} creado.`);
    } catch (error) {
      if(error.code== "P2002"){
        console.log(`Usuario ya existente ${item.nombre}: no re realizaron cambios`);
      }else{
        console.log(`Error al crear el usuario ${item.nombre}:`, error);
      }
    }
  }

  await prisma.$disconnect();
};


const seedCategorias = async () => {
  const categoriasPorDefecto = [
    'Cereales y granos',
    'Legumbres',
    'Frutos secos y semillas',
    'Harinas y premezclas',
    'Edulcorantes naturales',
    'Azúcares y mieles',
    'Superalimentos',
    'Productos sin gluten',
    'Productos sin lactosa',
    'Aceites y vinagres',
    'Snacks saludables',
    'Frutas deshidratadas',
    'Suplementos y proteínas',
    'Tés e infusiones',
    'Especias y condimentos',
    'Productos orgánicos',
    'Productos veganos',
    'Chocolates y cacao',
    'Pastas y fideos integrales',
    'Panificados y galletas saludables'
  ];

  for (const nombre of categoriasPorDefecto) {
    try {
      await prisma.categorias.upsert({
        where: { nombre },
        update: {}, // No actualizamos si ya existe
        create: { nombre },
      });
      console.log(`Categoría "${nombre}" creada o ya existente.`);
    } catch (error) {
      console.error(`Error al crear la categoría "${nombre}":`, error);
    }
  }
};


const crearProveedor = async (proveedorData) => {
  try {
    await prisma.contactos.upsert({
      where: { cuit: proveedorData.cuit },
      update: {}, // No actualizamos si ya existe
      create: {
        cuit: proveedorData.cuit,
        nombre: proveedorData.nombre,
        telefono: proveedorData.telefono || '0800-completar-telefono',
        esProveedor: proveedorData?.esProveedor,
        esInterno: proveedorData?.esInterno,
        esMarca: proveedorData?.esMarca,
        emails: {
          create: proveedorData.emails.map((email) => ({ email })),
        },
        direcciones: {
          create: proveedorData.direcciones?.map((direccion) => ({
            provincia: { connect: { id: direccion.idProvincia } },
            localidad: { connect: { id: direccion.idLocalidad } },
            calle: { connect: { id: direccion.idCalle } },
            numeroCalle: parseInt(direccion.numeroCalle),
            idLocalidadCensal: direccion.idLocalidadCensal,
          })),
        },
      },
    });
    console.log(`Proveedor ${proveedorData.nombre} creado o ya existente.`);
  } catch (error) {
    console.error(`Error al crear el proveedor ${proveedorData.nombre}:`, error);
  }
};

const seedProveedores = async () => {
  const proveedores = [
    {
      cuit: '27269425496',
      nombre: 'All-Diet S.R.L.',
      telefono: '08003338423',
      emails: ['ventas@alldiet.com.ar'],
      direcciones: [{
        idProvincia: '06',
        idLocalidad: '0642701009',
        idCalle: '0642701008765',
        numeroCalle: 268,
        idLocalidadCensal: '06427010',
      }],
      esProveedor: true,
    },
    {
      cuit: '20316249729',
      nombre: 'Facundo Ezequiel Villagra',
      telefono: '1122385810',
      emails: ['subofer@hotmail.com, subofer07@gmail.com'],
      direcciones: [{
        idProvincia: '02',
        idLocalidad: '0208401002',
        idCalle: '0209101009000',
        numeroCalle: 2777,
        idLocalidadCensal: '02000010',
      }],
      esInterno: true,
      esProveedor: true,
    },
  ];

  for (const proveedor of proveedores) {
    await crearProveedor(proveedor);
  }
};


const cargar = {
  provincias: true,
  localidades: true,
  calles: true,
}

const cargarGeoRef = async () => {
  try{
    const provinciasData = JSON.parse(readFileSync(`${process.cwd()}/prisma/geoRef/provincias.json`, 'utf8'));
    console.log('Provincias totales: ', provinciasData.length)
    provinciasData.forEach(async (item) =>
      cargar.provincias && (await prisma.provincias.create({
        data: {
          id: `${item.id}`,
          nombre: textos.mayusculas.primeras(item.nombre),
          nombreCompleto: item.nombre_completo,
          isoId: item.iso_id,
        }
    })));

    // Cargar y crear Localidades
    const localidadesData = JSON.parse(readFileSync(`${process.cwd()}/prisma/geoRef/localidades.json`, 'utf8'));
    console.log("localidades a cargar:", localidadesData.length)
      const pepin = localidadesData.map((({centroide, nombre}) => (centroide?.lat && centroide?.lon) ? null: nombre)).filter(Boolean)
      const indices = localidadesData.map(({nombre}, index) => pepin.includes(nombre) ? index: null).filter(Boolean)
      indices.forEach(indice => localidadesData[indice].centroide = localidadesData[indice-1].centroide)

      cargar.localidades && (await prisma.localidades.createMany({
        data: localidadesData.map((item, index) => ({
          id: `${item.id}`,
          nombre: textos.mayusculas.primeras(item.nombre),
          idProvincia: item.provincia.id,
          idDepartamento: item.departamento ? item.departamento.id : null,
          idMunicipio: item.municipio ? item.municipio.id : null,
          idLocalidadCensal: item.localidad_censal.id,
          nombreLocalidadCensal: item.localidad_censal.nombre,
        })),
        skipDuplicates: true,
     }));

     cargar.calles && (await cargarCalles());

  }catch (e){
    console.error(e);
  }finally{
    await prisma.$disconnect();
  }
}


const cargarCalles = async () => {
  const callesDataJson = JSON.parse(readFileSync(`${process.cwd()}/prisma/geoRef/calles.json`, 'utf8'));
  const callesDataLarge = callesDataJson.calles
  const callesData = callesDataLarge

  console.log('Cantidad de calles a crear: ', callesData.length)
  try {
    console.log(callesData)
    const batchSize = 500;  // Definir un tamaño de lote adecuado

    for (let i = 0; i < callesData.length; i += batchSize) {
      const batch = callesData.slice(i, i + batchSize);

      try {
        await prisma.calles.createMany({
          data: batch.map(item => ({
            ...item,
            id: `${item.id}`,
            nombre: `${textos.mayusculas.primeras(item.nombre)}`
          })),
          skipDuplicates: true
        });
      } catch (error) {
        console.error(`Error procesando el lote que comienza en el índice ${i}: ${error.message}`);
        // Opcional: Guardar o procesar registros problemáticos de manera individual
        for (const item of batch) {
          try {
            await prisma.calles.create({
              data: {
                ...item
              }
            });
          } catch (innerError) {
            console.error(`Error insertando calle con ID ${item.id}: ${innerError.message}`);
            console.error(`Error insertando calle con item.nombre ${item.nombre}`);
            console.error(`Error insertando calle con idProvincia ${item.provincia.id}`);
            console.error(`Error insertando calle con idLocalidadCensal ${item.localidad_censal.id}`);
          }
        }
      }
    }

    console.log('Todos los datos de calles han sido importados exitosamente.');
    console.log('Se cargaron ', callesDataLarge.length, " calles");
  } catch (error) {
    console.error('Error general en la carga de calles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const seed = async (semillero) => {
  for (const semilla of semillero) {
    try {await semilla()} catch (e) {console.log(e)}
  }
};

const seedTiposPresentacion = async () => {
  const tipos = [
    { nombre: 'unidad', descripcion: 'Unidad individual' },
    { nombre: 'caja', descripcion: 'Caja contenedora' },
    { nombre: 'bolsa', descripcion: 'Bolsa contenedora' },
    { nombre: 'botella', descripcion: 'Botella individual' },
    { nombre: 'paquete', descripcion: 'Paquete' },
    { nombre: 'pallet', descripcion: 'Pallet' },
    { nombre: 'granel', descripcion: 'A granel' },
  ];

  for (const tipo of tipos) {
    try {
      await prisma.tiposPresentacion.upsert({
        where: { nombre: tipo.nombre },
        update: {},
        create: tipo,
      });
      console.log(`Tipo de presentación "${tipo.nombre}" creado o ya existente.`);
    } catch (error) {
      console.error(`Error al crear el tipo de presentación "${tipo.nombre}":`, error);
    }
  }
};

// Función para crear productos con presentaciones
const seedProductos = async () => {
  try {
    console.log('🌱 Creando productos de prueba...');

    // Obtener IDs de tipos de presentación y categorías
    const tiposPresentacion = await prisma.tiposPresentacion.findMany();
    const categorias = await prisma.categorias.findMany();

    const getTipoId = (nombre) => tiposPresentacion.find(t => t.nombre === nombre)?.id;
    const getCategoriaId = (nombre) => categorias.find(c => c.nombre === nombre)?.id;

    const productos = [
      {
        codigoBarra: '7791234567890',
        nombre: 'Proteína Whey Premium',
        descripcion: 'Proteína de suero de leche de alta calidad para deportistas',
        unidad: 'gramos',
        size: 1000,
        categorias: [getCategoriaId('Proteínas'), getCategoriaId('Para Deportistas')].filter(Boolean),
        presentaciones: [
          {
            nombre: 'Frasco 1kg',
            tipoPresentacionId: getTipoId('botella'),
            cantidad: 1,
            unidadMedida: 'kg',
            contenidoPorUnidad: 1000,
            unidadContenido: 'gramos',
            precio: 25000,
            esUnidadBase: true,
          },
          {
            nombre: 'Caja 12 frascos',
            tipoPresentacionId: getTipoId('caja'),
            cantidad: 12,
            unidadMedida: 'frascos',
            precio: 280000,
            esUnidadBase: false,
          },
          {
            nombre: 'Pallet 50 cajas',
            tipoPresentacionId: getTipoId('pallet'),
            cantidad: 50,
            unidadMedida: 'cajas',
            precio: 14000000,
            esUnidadBase: false,
          }
        ]
      },
      {
        codigoBarra: '7791234567891',
        nombre: 'Omega 3 Fish Oil',
        descripcion: 'Aceite de pescado rico en ácidos grasos esenciales EPA y DHA',
        unidad: 'cápsulas',
        size: 120,
        categorias: [getCategoriaId('Vitaminas'), getCategoriaId('Superalimentos')].filter(Boolean),
        presentaciones: [
          {
            nombre: 'Frasco 120 cápsulas',
            tipoPresentacionId: getTipoId('botella'),
            cantidad: 1,
            unidadMedida: 'frasco',
            contenidoPorUnidad: 120,
            unidadContenido: 'cápsulas',
            precio: 18000,
            esUnidadBase: true,
          },
          {
            nombre: 'Caja 24 frascos',
            tipoPresentacionId: getTipoId('caja'),
            cantidad: 24,
            unidadMedida: 'frascos',
            precio: 400000,
            esUnidadBase: false,
          },
          {
            nombre: 'Pallet 30 cajas',
            tipoPresentacionId: getTipoId('pallet'),
            cantidad: 30,
            unidadMedida: 'cajas',
            precio: 12000000,
            esUnidadBase: false,
          }
        ]
      },
      {
        codigoBarra: '7791234567892',
        nombre: 'Colágeno Hidrolizado',
        descripcion: 'Colágeno tipo 1 y 3 hidrolizado para piel, cabello y articulaciones',
        unidad: 'gramos',
        size: 300,
        categorias: [getCategoriaId('Suplementos y proteínas'), getCategoriaId('Productos orgánicos')].filter(Boolean),
        presentaciones: [
          {
            nombre: 'Bolsa 300g',
            tipoPresentacionId: getTipoId('bolsa'),
            cantidad: 1,
            unidadMedida: 'bolsa',
            contenidoPorUnidad: 300,
            unidadContenido: 'gramos',
            precio: 15000,
            esUnidadBase: true,
          },
          {
            nombre: 'Caja 12 bolsas',
            tipoPresentacionId: getTipoId('caja'),
            cantidad: 12,
            unidadMedida: 'bolsas',
            precio: 165000,
            esUnidadBase: false,
          },
          {
            nombre: 'Pallet 40 cajas',
            tipoPresentacionId: getTipoId('pallet'),
            cantidad: 40,
            unidadMedida: 'cajas',
            precio: 6600000,
            esUnidadBase: false,
          }
        ]
      }
    ];

    for (const productoData of productos) {
      try {
        const { presentaciones, categorias: cats, ...productoFields } = productoData;

        const producto = await prisma.productos.upsert({
          where: { codigoBarra: productoFields.codigoBarra },
          update: {},
          create: {
            ...productoFields,
            categorias: cats.length > 0 ? {
              connect: cats.map(id => ({ id }))
            } : undefined,
            presentaciones: {
              create: presentaciones.map(pres => ({
                ...pres,
                stock: {
                  create: {
                    stockCerrado: Math.floor(Math.random() * 50) + 10 // Stock aleatorio entre 10-60
                  }
                }
              }))
            }
          }
        });

        console.log(`✅ Producto "${producto.nombre}" creado con ${presentaciones.length} presentaciones`);
      } catch (error) {
        console.error(`❌ Error creando producto "${productoData.nombre}":`, error);
      }
    }

    console.log('✅ Productos de prueba creados exitosamente');
  } catch (error) {
    console.error('❌ Error en seedProductos:', error);
  }
};

// Función para poblar datos de prueba
const seedMockData = async () => {
  try {
    console.log('🌱 Creando datos de prueba...');

    // Crear categorías adicionales
    const categoriasData = [
      'Proteínas', 'Vitaminas', 'Minerales', 'Superalimentos', 'Tés y Hierbas',
      'Productos Orgánicos', 'Sin Gluten', 'Sin Lactosa', 'Para Deportistas'
    ];

    for (const nombre of categoriasData) {
      await prisma.categorias.upsert({
        where: { nombre },
        update: {},
        create: { nombre }
      });
    }

    // Crear proveedores adicionales
    const proveedoresData = [
      { nombre: 'Proveedor Salud Natural', telefono: '1123456789', emails: ['info@saludnatural.com'] },
      { nombre: 'Distribuidora Nutricional', telefono: '1134567890', emails: ['ventas@nutricional.com'] },
      { nombre: 'Importadora Orgánica', telefono: '1145678901', emails: ['contacto@importadora.com'] }
    ];

    for (const prov of proveedoresData) {
      const { emails, ...provFields } = prov;
      await prisma.contactos.upsert({
        where: { nombre: prov.nombre },
        update: {},
        create: {
          ...provFields,
          esProveedor: true,
          cuit: `20${Math.random().toString().substr(2, 8)}9`,
          persona: 'JURIDICA',
          iva: 'RESPONSABLE_INSCRIPTO',
          emails: {
            create: emails.map(email => ({ email }))
          }
        }
      });
    }

    // Crear tipos de presentación adicionales
    const tiposPresentacionData = [
      { nombre: 'Sobre', descripcion: 'Presentación en sobre' },
      { nombre: 'Frasco', descripcion: 'Presentación en frasco' },
      { nombre: 'Lata', descripcion: 'Presentación en lata' }
    ];

    for (const tipo of tiposPresentacionData) {
      await prisma.tiposPresentacion.upsert({
        where: { nombre: tipo.nombre },
        update: {},
        create: tipo
      });
    }

    // Crear productos de prueba
    const productosData = [
      {
        codigoBarra: '7790012345001',
        nombre: 'Proteína Whey Isolada',
        descripcion: 'Proteína de suero de leche aislada, alto contenido proteico',
        unidad: 'gramos',
        size: 1000,
        categorias: ['Proteínas', 'Para Deportistas']
      },
      {
        codigoBarra: '7790012345002',
        nombre: 'Omega 3 Concentrado',
        descripcion: 'Ácidos grasos esenciales EPA y DHA',
        unidad: 'cápsulas',
        size: 60,
        categorias: ['Vitaminas', 'Superalimentos']
      },
      {
        codigoBarra: '7790012345003',
        nombre: 'Colágeno Hidrolizado',
        descripcion: 'Colágeno tipo 1 y 3 para piel, cabello y articulaciones',
        unidad: 'gramos',
        size: 300,
        categorias: ['Proteínas', 'Vitaminas']
      },
      {
        codigoBarra: '7790012345004',
        nombre: 'Té Verde Orgánico',
        descripcion: 'Té verde premium orgánico, rico en antioxidantes',
        unidad: 'gramos',
        size: 100,
        categorias: ['Tés y Hierbas', 'Productos Orgánicos']
      },
      {
        codigoBarra: '7790012345005',
        nombre: 'Maca Peruana',
        descripcion: 'Raíz de maca orgánica en polvo, energizante natural',
        unidad: 'gramos',
        size: 200,
        categorias: ['Superalimentos', 'Productos Orgánicos']
      }
    ];

    for (const prod of productosData) {
      const categoriasIds = [];
      for (const catNombre of prod.categorias) {
        const categoria = await prisma.categorias.findUnique({
          where: { nombre: catNombre }
        });
        if (categoria) {
          categoriasIds.push({ id: categoria.id });
        }
      }

      await prisma.productos.upsert({
        where: { codigoBarra: prod.codigoBarra },
        update: {},
        create: {
          ...prod,
          tipoVenta: 'UNIDAD',
          categorias: { connect: categoriasIds }
        }
      });
    }

    // Crear presentaciones para los productos
    const productos = await prisma.productos.findMany();

    for (const producto of productos) {
      // Crear algunas presentaciones para cada producto
      const presentaciones = [
        {
          nombre: `Caja x 12 unidades`,
          tipoPresentacionId: (await prisma.tiposPresentacion.findFirst({ where: { nombre: 'Caja' } }))?.id,
          cantidad: 12,
          unidadMedida: 'unidades'
        },
        {
          nombre: `Frasco x 60 unidades`,
          tipoPresentacionId: (await prisma.tiposPresentacion.findFirst({ where: { nombre: 'Frasco' } }))?.id,
          cantidad: 60,
          unidadMedida: 'unidades'
        }
      ];

      for (const pres of presentaciones) {
        if (pres.tipoPresentacionId) {
          // Verificar si ya existe esta presentación para el producto
          const existing = await prisma.presentaciones.findFirst({
            where: {
              productoId: producto.id,
              nombre: pres.nombre
            }
          });

          if (!existing) {
            await prisma.presentaciones.create({
              data: {
                ...pres,
                productoId: producto.id
              }
            });
          }
        }
      }
    }

    // Crear algunos precios para los productos
    for (const producto of productos) {
      // Verificar si ya existe un precio para este producto
      const existingPrecio = await prisma.precios.findFirst({
        where: { idProducto: producto.id }
      });

      if (!existingPrecio) {
        await prisma.precios.create({
          data: {
            precio: Math.floor(Math.random() * 5000) + 1000, // Precio entre 1000 y 6000
            idProducto: producto.id
          }
        });
      }
    }

    // Crear algunos documentos de prueba (facturas)
    const proveedores = await prisma.contactos.findMany({ where: { esProveedor: true } });

    for (let i = 0; i < 5; i++) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i * 7); // Documentos de las últimas 5 semanas

      await prisma.documentos.create({
        data: {
          numeroDocumento: `F001-${i + 1}`,
          fecha,
          tipoDocumento: 'FACTURA_A',
          tipoMovimiento: i % 2 === 0 ? 'ENTRADA' : 'SALIDA', // Alternar entre compras y ventas
          total: Math.floor(Math.random() * 10000) + 5000,
          idContacto: proveedores[i % proveedores.length]?.id,
          idDestinatario: proveedores.find(p => p.cuit === '27269425496')?.id, // Receptor es la empresa interna
          estadoDocumento: {
            connect: { codigo: 'IMPAGA' }
          }
        }
      });
    }

    console.log('✅ Datos de prueba creados exitosamente');
  } catch (error) {
    console.error('❌ Error creando datos de prueba:', error);
  }
};

await seed([
  seedUsuarios,
  seedTiposPresentacion,
  cargarGeoRef,
  seedDocumentTypes,
  seedProveedores,
  seedCategorias,
  seedProductos,
  seedMockData, // Agregar los datos de prueba
]);
