"use server"
import prisma from "../prisma";

// Obtener todos los pedidos con sus detalles
export const getPedidos = async () => {
  return await prisma.pedidos.findMany({
    include: {
      proveedor: true,
      usuario: {
        select: {
          id: true,
          nombre: true
        }
      },
      detallePedidos: {
        include: {
          producto: {
            include: {
              categorias: true,
              precios: {
                orderBy: { createdAt: 'desc' },
                take: 1
              }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

// Obtener un pedido específico
export const getPedidoById = async (id) => {
  return await prisma.pedidos.findUnique({
    where: { id },
    include: {
      proveedor: true,
      usuario: {
        select: {
          id: true,
          nombre: true
        }
      },
      detallePedidos: {
        include: {
          producto: {
            include: {
              categorias: true,
              precios: {
                orderBy: { createdAt: 'desc' },
                take: 1
              }
            }
          }
        }
      }
    }
  });
};

// Obtener pedidos por proveedor
export const getPedidosByProveedor = async (idProveedor) => {
  return await prisma.pedidos.findMany({
    where: { idProveedor },
    include: {
      usuario: {
        select: {
          id: true,
          nombre: true
        }
      },
      detallePedidos: {
        include: {
          producto: {
            include: {
              categorias: true,
              precios: {
                orderBy: { createdAt: 'desc' },
                take: 1
              }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

// Crear un nuevo pedido
export const crearPedido = async (datosPedido) => {
  const { idProveedor, productos, idUsuario, notas } = datosPedido;

  // Generar número de pedido único
  const numeroPedido = `PED-${Date.now()}`;

  return await prisma.pedidos.create({
    data: {
      numero: numeroPedido,
      fecha: new Date(),
      idProveedor: idProveedor || null, // Permitir null para pedidos sin proveedor asignado
      idUsuario,
      notas,
      detallePedidos: {
        create: productos.map(producto => ({
          idProducto: producto.id,
          cantidad: producto.cantidad || 1,
          precioUnitario: producto.precioUnitario,
          observaciones: producto.observaciones
        }))
      }
    },
    include: {
      proveedor: true,
      detallePedidos: {
        include: {
          producto: true
        }
      }
    }
  });
};

// Actualizar estado de pedido
export const actualizarEstadoPedido = async (idPedido, nuevoEstado) => {
  return await prisma.pedidos.update({
    where: { id: idPedido },
    data: { estado: nuevoEstado },
    include: {
      proveedor: true,
      detallePedidos: {
        include: {
          producto: true
        }
      }
    }
  });
};

// Eliminar pedido
export const eliminarPedido = async (idPedido) => {
  return await prisma.pedidos.delete({
    where: { id: idPedido }
  });
};

// Agregar producto a pedido existente
export const agregarProductoAPedido = async (idPedido, producto) => {
  return await prisma.detallePedidos.upsert({
    where: {
      idPedido_idProducto: {
        idPedido,
        idProducto: producto.id
      }
    },
    update: {
      cantidad: {
        increment: producto.cantidad || 1
      }
    },
    create: {
      idPedido,
      idProducto: producto.id,
      cantidad: producto.cantidad || 1,
      precioUnitario: producto.precioUnitario,
      observaciones: producto.observaciones
    },
    include: {
      producto: true
    }
  });
};

// Verificar si un producto ya está en algún pedido pendiente
export const productoEstaPedido = async (idProducto) => {
  const pedidosPendientes = await prisma.pedidos.findMany({
    where: {
      estado: 'PENDIENTE'
    },
    include: {
      detallePedidos: {
        where: {
          idProducto: idProducto
        }
      }
    }
  });

  return pedidosPendientes.some(pedido => pedido.detallePedidos.length > 0);
};

// Obtener productos agrupados por proveedor para generar pedidos
export const getProductosAgrupadosPorProveedor = async () => {
  // Esta función debería devolver productos que necesitan reposición
  // agrupados por sus proveedores
  const productosStockBajo = await prisma.productos.findMany({
    where: {
      OR: [
        { size: { lt: 10 } },
        { precios: { none: {} } }
      ]
    },
    include: {
      proveedores: {
        include: {
          proveedor: true
        }
      },
      categorias: true,
      precios: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });

  // Agrupar por proveedor
  const productosPorProveedor = {};

  productosStockBajo.forEach(producto => {
    producto.proveedores.forEach(provRel => {
      const proveedorId = provRel.proveedor.id;
      const proveedorNombre = provRel.proveedor.nombre;

      if (!productosPorProveedor[proveedorId]) {
        productosPorProveedor[proveedorId] = {
          proveedor: provRel.proveedor,
          productos: []
        };
      }

      productosPorProveedor[proveedorId].productos.push({
        ...producto,
        cantidadSugerida: Math.max(20 - (producto.size || 0), 5) // Sugerir cantidad para llegar a 20 unidades mínimo
      });
    });
  });

  // Filtrar solo grupos que tienen proveedores válidos
  return Object.values(productosPorProveedor).filter(grupo =>
    grupo.proveedor && grupo.proveedor.id
  );
};
