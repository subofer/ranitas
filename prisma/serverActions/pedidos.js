"use server"
import prisma from "../prisma";
import { revalidatePath } from "next/cache";
import { crearPedido, actualizarEstadoPedido, agregarProductoAPedido, eliminarPedido } from "../consultas/pedidos";
import { auditAction } from "@/lib/actions/audit";
import { getSession } from "@/lib/sesion/sesion";

const revalidate = () => {
  revalidatePath("/pedidos");
  revalidatePath("/");
};

// Crear un nuevo pedido
export const crearNuevoPedido = async (datosPedido) => {
  const session = await getSession();
  const userId = session?.user || 'Sistema';

  try {
    const pedido = await crearPedido(datosPedido);
    
    // Auditar éxito
    await auditAction({
      level: 'SUCCESS',
      action: 'CREAR_PEDIDO',
      message: `Pedido creado: ${pedido.id}`,
      category: 'DB',
      metadata: { pedidoId: pedido.id, proveedorId: datosPedido.idProveedor },
      userId
    });

    revalidate();
    return { success: true, error: false, pedido };
  } catch (error) {
    console.error("Error creando pedido:", error);
    
    // Auditar error
    await auditAction({
      level: 'ERROR',
      action: 'CREAR_PEDIDO',
      message: error.message,
      category: 'DB',
      metadata: { proveedorId: datosPedido.idProveedor },
      userId
    });

    return { success: false, error: true, msg: error.message };
  }
};

// Actualizar estado de pedido
export const cambiarEstadoPedido = async (idPedido, nuevoEstado) => {
  const session = await getSession();
  const userId = session?.user || 'Sistema';

  try {
    const pedido = await actualizarEstadoPedido(idPedido, nuevoEstado);
    
    // Auditar éxito
    await auditAction({
      level: 'SUCCESS',
      action: 'CAMBIAR_ESTADO_PEDIDO',
      message: `Pedido actualizado a ${nuevoEstado}`,
      category: 'DB',
      metadata: { pedidoId: idPedido, nuevoEstado, estadoAnterior: pedido.estado },
      userId
    });

    revalidate();
    return { success: true, error: false, pedido };
  } catch (error) {
    console.error("Error actualizando estado del pedido:", error);
    
    // Auditar error
    await auditAction({
      level: 'ERROR',
      action: 'CAMBIAR_ESTADO_PEDIDO',
      message: error.message,
      category: 'DB',
      metadata: { pedidoId: idPedido, nuevoEstado },
      userId
    });

    return { success: false, error: true, msg: error.message };
  }
};

// Agregar producto a pedido existente
export const agregarProductoPedido = async (idPedido, producto) => {
  const session = await getSession();
  const userId = session?.user || 'Sistema';

  try {
    const detalle = await agregarProductoAPedido(idPedido, producto);
    
    // Auditar éxito
    await auditAction({
      level: 'SUCCESS',
      action: 'AGREGAR_PRODUCTO_PEDIDO',
      message: `Producto ${producto.id} agregado al pedido ${idPedido}`,
      category: 'DB',
      metadata: { pedidoId: idPedido, productoId: producto.id, cantidad: producto.cantidad },
      userId
    });

    revalidate();
    return { success: true, error: false, detalle };
  } catch (error) {
    console.error("Error agregando producto al pedido:", error);
    
    // Auditar error
    await auditAction({
      level: 'ERROR',
      action: 'AGREGAR_PRODUCTO_PEDIDO',
      message: error.message,
      category: 'DB',
      metadata: { pedidoId: idPedido, productoId: producto.id },
      userId
    });

    return { success: false, error: true, msg: error.message };
  }
};

// Eliminar pedido
export const eliminarPedidoCompleto = async (idPedido) => {
  const session = await getSession();
  const userId = session?.user || 'Sistema';

  try {
    await eliminarPedido(idPedido);
    
    // Auditar éxito
    await auditAction({
      level: 'SUCCESS',
      action: 'ELIMINAR_PEDIDO',
      message: `Pedido ${idPedido} eliminado`,
      category: 'DB',
      metadata: { pedidoId: idPedido },
      userId
    });

    revalidate();
    return { success: true, error: false };
  } catch (error) {
    console.error("Error eliminando pedido:", error);
    
    // Auditar error
    await auditAction({
      level: 'ERROR',
      action: 'ELIMINAR_PEDIDO',
      message: error.message,
      category: 'DB',
      metadata: { pedidoId: idPedido },
      userId
    });

    return { success: false, error: true, msg: error.message };
  }
};

// Crear pedidos automáticamente para productos con stock bajo
export const crearPedidosAutomaticos = async (idUsuario) => {
  const session = await getSession();
  const userId = session?.user || 'Sistema';

  try {
    const { getProductosAgrupadosPorProveedor } = await import("../consultas/pedidos");
    const productosPorProveedor = await getProductosAgrupadosPorProveedor();

    const pedidosCreados = [];

    for (const grupo of productosPorProveedor) {
      const pedido = await crearPedido({
        idProveedor: grupo.proveedor.id,
        productos: grupo.productos.map(p => ({
          id: p.id,
          cantidad: p.cantidadSugerida,
          precioUnitario: p.precios?.[0]?.precio,
          observaciones: `Reposición automática - Stock bajo: ${p.size || 0} unidades`
        })),
        idUsuario,
        notas: `Pedido automático generado por sistema - Productos con stock bajo`
      });

      pedidosCreados.push(pedido);
    }

    // Auditar éxito
    await auditAction({
      level: 'SUCCESS',
      action: 'CREAR_PEDIDOS_AUTOMATICOS',
      message: `${pedidosCreados.length} pedidos automáticos creados`,
      category: 'SYSTEM',
      metadata: { cantidad: pedidosCreados.length, pedidosIds: pedidosCreados.map(p => p.id) },
      userId
    });

    revalidate();
    return { success: true, error: false, pedidos: pedidosCreados };
  } catch (error) {
    console.error("Error creando pedidos automáticos:", error);
    
    // Auditar error
    await auditAction({
      level: 'ERROR',
      action: 'CREAR_PEDIDOS_AUTOMATICOS',
      message: error.message,
      category: 'SYSTEM',
      userId
    });

    return { success: false, error: true, msg: error.message };
  }
};
