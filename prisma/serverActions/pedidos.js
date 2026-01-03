"use server"
import prisma from "../prisma";
import { revalidatePath } from "next/cache";
import { crearPedido, actualizarEstadoPedido, agregarProductoAPedido, eliminarPedido } from "../consultas/pedidos";

const revalidate = () => {
  revalidatePath("/pedidos");
  revalidatePath("/");
};

// Crear un nuevo pedido
export const crearNuevoPedido = async (datosPedido) => {
  try {
    const pedido = await crearPedido(datosPedido);
    revalidate();
    return { success: true, pedido };
  } catch (error) {
    console.error("Error creando pedido:", error);
    return { success: false, error: error.message };
  }
};

// Actualizar estado de pedido
export const cambiarEstadoPedido = async (idPedido, nuevoEstado) => {
  try {
    const pedido = await actualizarEstadoPedido(idPedido, nuevoEstado);
    revalidate();
    return { success: true, pedido };
  } catch (error) {
    console.error("Error actualizando estado del pedido:", error);
    return { success: false, error: error.message };
  }
};

// Agregar producto a pedido existente
export const agregarProductoPedido = async (idPedido, producto) => {
  try {
    const detalle = await agregarProductoAPedido(idPedido, producto);
    revalidate();
    return { success: true, detalle };
  } catch (error) {
    console.error("Error agregando producto al pedido:", error);
    return { success: false, error: error.message };
  }
};

// Eliminar pedido
export const eliminarPedidoCompleto = async (idPedido) => {
  try {
    await eliminarPedido(idPedido);
    revalidate();
    return { success: true };
  } catch (error) {
    console.error("Error eliminando pedido:", error);
    return { success: false, error: error.message };
  }
};

// Crear pedidos automáticamente para productos con stock bajo
export const crearPedidosAutomaticos = async (idUsuario) => {
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

    revalidate();
    return { success: true, pedidos: pedidosCreados };
  } catch (error) {
    console.error("Error creando pedidos automáticos:", error);
    return { success: false, error: error.message };
  }
};
