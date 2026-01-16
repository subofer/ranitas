"use server"
import prisma from "../prisma";

export const ultimoPrecioDelProducto = async (idDelProducto) => await prisma.precios.findFirst({
  where: {
    productoId: idDelProducto,
  },
  orderBy: {
    createdAt: 'desc',
  },
});

export const nuevoPrecioProducto = async (idDelProducto, nuevoPrecio) => {
  await prisma.precios.create({
    data: {
      precio: nuevoPrecio,
      idProducto: idDelProducto,
    },
  });
}


export const getProductosPaginados = async ({ skip = 0, take = 50, filter = '', categoryFilter = '' } = {}) => {
  const where = {
    AND: [
      {
        OR: [
          { nombre: { contains: filter, mode: 'insensitive' } },
          { codigoBarra: { contains: filter, mode: 'insensitive' } },
          { descripcion: { contains: filter, mode: 'insensitive' } },
        ],
      },
      categoryFilter ? {
        categorias: {
          some: {
            nombre: { contains: categoryFilter, mode: 'insensitive' }
          }
        }
      } : {},
    ],
  };

  const [productos, total] = await Promise.all([
    prisma.productos.findMany({
      where,
      skip,
      take,
      include: {
        categorias: true,
        precios: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
        proveedores: {
          orderBy: {
            createdAt: 'desc', // Ordenar en ProductoProveedor
          },
          include: {
            proveedor: true, // Incluir información del proveedor
          },
        },
        presentaciones: {
          include: {
            tipoPresentacion: true,
            stock: true,
            contenidas: {
              include: {
                presentacionContenida: {
                  include: {
                    tipoPresentacion: true,
                  },
                },
                presentacionContenedora: {
                  include: {
                    tipoPresentacion: true,
                  },
                },
              },
            },
            contenedoras: {
              include: {
                presentacionContenedora: {
                  include: {
                    tipoPresentacion: true,
                  },
                },
                presentacionContenida: {
                  include: {
                    tipoPresentacion: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        nombre: 'asc',
      },
    }),
    prisma.productos.count({ where }),
  ]);

  return { productos, total };
};

export const contarProductos = async (where = {}) => await prisma.productos.count({ where });

export const getCategoriasUnicas = async () => {
  return await prisma.categorias.findMany({
    select: {
      id: true,
      nombre: true,
    },
    orderBy: {
      nombre: 'asc',
    },
  });
};

export const getProductoPorCodigoBarra = async (codigoBarra) => {
  const producto = await prisma.productos.findUnique({
    where: {
      codigoBarra: codigoBarra,
    },
    include: {
      marca: true,
      categorias: true,
      proveedores: {
        include: {
          proveedor: true, // Incluir los detalles del proveedor desde la tabla intermedia
        },
      },
      precios: {
        orderBy: {
          createdAt: 'desc',
        },
      },
      presentaciones: {
        include: {
          tipoPresentacion: true,
          stock: true,
          contenidas: {
            include: {
              presentacionContenida: {
                include: {
                  tipoPresentacion: true,
                },
              },
              presentacionContenedora: {
                include: {
                  tipoPresentacion: true,
                },
              },
            },
          },
          contenedoras: {
            include: {
              presentacionContenedora: {
                include: {
                  tipoPresentacion: true,
                },
              },
              presentacionContenida: {
                include: {
                  tipoPresentacion: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Aquí puedes definir el objeto por defecto que deseas retornar si no se encuentra el producto
  const respuestaPorDefecto = { error: true, msg: "producto no encontrado" }; // Ajusta esto según lo que necesites

  return producto || respuestaPorDefecto;
}

export const getProductoPorId = async (id) => {
  if (!id) return { error: true, msg: "producto no encontrado" };

  const producto = await prisma.productos.findUnique({
    where: { id },
    include: {
      marca: true,
      categorias: true,
      proveedores: {
        include: {
          proveedor: true,
        },
      },
      precios: {
        orderBy: {
          createdAt: 'desc',
        },
      },
      presentaciones: {
        include: {
          tipoPresentacion: true,
          stock: true,
          contenidas: {
            include: {
              presentacionContenida: {
                include: {
                  tipoPresentacion: true,
                },
              },
              presentacionContenedora: {
                include: {
                  tipoPresentacion: true,
                },
              },
            },
          },
          contenedoras: {
            include: {
              presentacionContenedora: {
                include: {
                  tipoPresentacion: true,
                },
              },
              presentacionContenida: {
                include: {
                  tipoPresentacion: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const respuestaPorDefecto = { error: true, msg: "producto no encontrado" };
  return producto || respuestaPorDefecto;
}

// Búsqueda liviana para UX tipo POS/autocomplete (evita includes pesados)
export const buscarProductosParaVenta = async ({ filter = '', take = 15 } = {}) => {
  const f = String(filter || '').trim();
  if (!f) return { productos: [] };

  const productos = await prisma.productos.findMany({
    where: {
      OR: [
        { nombre: { contains: f, mode: 'insensitive' } },
        { codigoBarra: { contains: f, mode: 'insensitive' } },
        { descripcion: { contains: f, mode: 'insensitive' } },
      ],
    },
    take,
    orderBy: { nombre: 'asc' },
    select: {
      id: true,
      codigoBarra: true,
      nombre: true,
      descripcion: true,
      imagen: true,
      tipoVenta: true,
      unidad: true,
      categorias: {
        select: {
          nombre: true,
        },
      },
      precios: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
        select: {
          precio: true,
        },
      },
      presentaciones: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  });

  return { productos };
};

// Lista completa (liviana) para dropdown del POS.
export const getProductosParaVenta = async ({ take = 5000 } = {}) => {
  const productos = await prisma.productos.findMany({
    take,
    orderBy: { nombre: 'asc' },
    select: {
      id: true,
      codigoBarra: true,
      nombre: true,
      descripcion: true,
      imagen: true,
      tipoVenta: true,
      unidad: true,
      categorias: {
        select: { nombre: true },
      },
      precios: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { precio: true },
      },
      presentaciones: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  });

  return { productos };
};

export const getProductos = async ({ take = 50, skip = 0, filter = '', categoryFilter = '' } = {}) => {
  const where = {
    AND: [
      {
        OR: [
          { nombre: { contains: filter, mode: 'insensitive' } },
          { codigoBarra: { contains: filter, mode: 'insensitive' } },
          { descripcion: { contains: filter, mode: 'insensitive' } },
        ],
      },
      categoryFilter ? {
        categorias: {
          some: {
            nombre: { contains: categoryFilter, mode: 'insensitive' }
          }
        }
      } : {},
    ],
  };

  const productos = await prisma.productos.findMany({
    where: take === undefined ? {} : where,
    take: take === undefined ? undefined : take,
    skip: take === undefined ? 0 : skip,
    include: {
      marca: true,
      categorias: true,
      precios: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      },
      proveedores: {
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          proveedor: true,
        },
      },
      presentaciones: {
        include: {
          tipoPresentacion: true,
          stock: true,
          contenidas: {
            include: {
              presentacionContenida: {
                include: {
                  tipoPresentacion: true,
                },
              },
              presentacionContenedora: {
                include: {
                  tipoPresentacion: true,
                },
              },
            },
          },
          contenedoras: {
            include: {
              presentacionContenedora: {
                include: {
                  tipoPresentacion: true,
                },
              },
              presentacionContenida: {
                include: {
                  tipoPresentacion: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      nombre: 'asc',
    },
  });

  return { productos };
}

export const getAllProductosBasic = async () => {
  const productos = await prisma.productos.findMany({
    select: {
      id: true,
      nombre: true,
      presentaciones: {
        select: {
          id: true,
          nombre: true,
          esUnidadBase: true,
          cantidad: true,
          unidadMedida: true,
          tipoPresentacion: {
            select: {
              nombre: true,
            },
          },
        },
      },
    },
    orderBy: {
      nombre: 'asc',
    },
  });

  return productos;
};
