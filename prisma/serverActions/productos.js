"use server"
import prisma from "../prisma";
import { textos } from "@/lib/manipularTextos";
import { revalidatePath } from 'next/cache'
import { auditAction } from "@/lib/actions/audit";
import { getSession } from "@/lib/sesion/sesion";

const revalidarProductos = () => revalidatePath("/cargarProductos");

export async function guardarCambiosListadoProductos({ productos = [], presentaciones = [], motivo = 'edicion_listado' } = {}) {
  const normalizarNumero = (value) => {
    if (value == null || value === '') return null;
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return n;
  };

  const normalizarPorcentaje = (value) => {
    if (value == null || value === '') return 0;
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
  };

  const normalizarEnteroNoNeg = (value) => {
    const n = normalizarNumero(value);
    if (n == null) return null;
    return Math.trunc(Math.max(0, n));
  };

  const payloadProductos = Array.isArray(productos) ? productos : [];
  const payloadPresentaciones = Array.isArray(presentaciones) ? presentaciones : [];

  const session = await getSession();
  const userId = session?.user || 'Sistema';

  const productosNorm = payloadProductos
    .filter((p) => p && p.id)
    .map((p) => ({
      id: p.id,
      nombre: p.nombre !== undefined ? (p.nombre == null ? '' : String(p.nombre)) : undefined,
      codigoBarra: p.codigoBarra !== undefined ? (p.codigoBarra == null ? '' : String(p.codigoBarra)) : undefined,
      descripcion: p.descripcion !== undefined ? (p.descripcion == null ? '' : String(p.descripcion)) : undefined,
      size: p.size !== undefined ? normalizarNumero(p.size) : undefined,
      unidad: p.unidad !== undefined ? (p.unidad == null ? '' : String(p.unidad)) : undefined,
      categoriaId: p.categoriaId !== undefined ? (p.categoriaId ? String(p.categoriaId) : null) : undefined,
      stockSuelto: p.stockSuelto !== undefined ? normalizarEnteroNoNeg(p.stockSuelto) : undefined,
      marcaId: p.marcaId !== undefined ? (p.marcaId ? String(p.marcaId) : null) : undefined,
      precio: p.precio !== undefined ? normalizarNumero(p.precio) : undefined,
    }))
    .filter((p) => p.id);

  const presentacionesNorm = payloadPresentaciones
    .filter((p) => p && (p.presentacionId || p.id))
    .map((p) => ({
      presentacionId: p.presentacionId || p.id,
      stockCerrado: p.stockCerrado !== undefined ? normalizarEnteroNoNeg(p.stockCerrado) : undefined,
      precio: p.precio !== undefined ? normalizarNumero(p.precio) : undefined,
      descuento: p.descuento !== undefined ? normalizarPorcentaje(p.descuento) : undefined,
    }))
    .filter((p) => p.presentacionId);

  // Si no hay nada para guardar, no tocar la DB.
  if (productosNorm.length === 0 && presentacionesNorm.length === 0) {
    return { error: false, changed: 0 };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let changed = 0;

      for (const p of productosNorm) {
        const antes = await tx.productos.findUnique({
          where: { id: p.id },
          select: {
            id: true,
            nombre: true,
            codigoBarra: true,
            descripcion: true,
            size: true,
            unidad: true,
            stockSuelto: true,
            marcaId: true,
            categorias: { select: { id: true } },
          },
        });
        if (!antes) continue;

        const updatesProducto = {};

        if (p.nombre !== undefined && p.nombre !== antes.nombre) updatesProducto.nombre = p.nombre;
        if (p.codigoBarra !== undefined && p.codigoBarra !== antes.codigoBarra) updatesProducto.codigoBarra = p.codigoBarra;
        if (p.descripcion !== undefined && p.descripcion !== (antes.descripcion || '')) updatesProducto.descripcion = p.descripcion;
        if (p.size !== undefined && p.size !== antes.size) updatesProducto.size = p.size;
        if (p.unidad !== undefined && p.unidad !== (antes.unidad || '')) updatesProducto.unidad = p.unidad;

        const categoriaAntesId = (antes.categorias?.[0]?.id) ?? null;
        if (p.categoriaId !== undefined && p.categoriaId !== categoriaAntesId) {
          updatesProducto.categorias = p.categoriaId
            ? { set: [{ id: p.categoriaId }] }
            : { set: [] };
        }

        if (Object.keys(updatesProducto).length > 0) {
          await tx.productos.update({
            where: { id: p.id },
            data: updatesProducto,
            select: { id: true },
          });

          await auditAction({
            level: 'SUCCESS',
            action: 'PRODUCTO_ACTUALIZADO',
            message: `Producto actualizado (listado): ${antes.nombre}`,
            category: 'DB',
            metadata: {
              productoId: p.id,
              productoNombre: antes.nombre,
              codigoBarraAntes: antes.codigoBarra,
              codigoBarraDespues: p.codigoBarra !== undefined ? p.codigoBarra : antes.codigoBarra,
              motivo: motivo || null,
              cambios: Object.keys(updatesProducto),
            },
            userId,
          });
          changed += 1;
        }

        // Stock suelto (conteo manual)
        if (p.stockSuelto !== undefined && p.stockSuelto != null && p.stockSuelto !== antes.stockSuelto) {
          await tx.productos.update({
            where: { id: p.id },
            data: { stockSuelto: p.stockSuelto },
            select: { id: true },
          });

          await auditAction({
            level: 'SUCCESS',
            action: 'CONTEO_MANUAL',
            message: `Conteo manual stock suelto (listado): ${antes.nombre} ${antes.stockSuelto} -> ${p.stockSuelto}`,
            category: 'DB',
            metadata: {
              productoId: p.id,
              productoNombre: antes.nombre,
              codigoBarra: antes.codigoBarra,
              stockSueltoAntes: antes.stockSuelto,
              stockSueltoDespues: p.stockSuelto,
              motivo: motivo || null,
            },
            userId,
          });
          changed += 1;
        }

        // Marca
        if (p.marcaId !== undefined && p.marcaId !== antes.marcaId) {
          await tx.productos.update({
            where: { id: p.id },
            data: { marcaId: p.marcaId },
            select: { id: true },
          });

          await auditAction({
            level: 'SUCCESS',
            action: 'PRODUCTO_ACTUALIZADO',
            message: `Marca actualizada (listado): ${antes.nombre}`,
            category: 'DB',
            metadata: {
              productoId: p.id,
              productoNombre: antes.nombre,
              codigoBarra: antes.codigoBarra,
              marcaAntes: antes.marcaId,
              marcaDespues: p.marcaId,
              motivo: motivo || null,
            },
            userId,
          });
          changed += 1;
        }

        // Precio (histórico)
        if (p.precio !== undefined) {
          if (!Number.isFinite(p.precio) || p.precio < 0) {
            throw new Error(`Precio inválido para producto ${p.id}`);
          }

          const precioPrevio = await tx.precios.findFirst({
            where: { idProducto: p.id },
            orderBy: { createdAt: 'desc' },
            select: { precio: true, createdAt: true },
          });

          // Evitar crear historial si no cambió
          if (precioPrevio?.precio !== p.precio) {
            await tx.precios.create({
              data: { precio: p.precio, idProducto: p.id },
            });

            await auditAction({
              level: 'SUCCESS',
              action: 'PRECIO_ACTUALIZADO',
              message: `Precio actualizado (listado): ${antes.nombre} (${antes.codigoBarra})`,
              category: 'DB',
              metadata: {
                productoId: p.id,
                productoNombre: antes.nombre,
                codigoBarra: antes.codigoBarra,
                precioAntes: precioPrevio?.precio ?? null,
                precioDespues: p.precio,
                motivo: motivo || null,
              },
              userId,
            });
            changed += 1;
          }
        }
      }

      for (const s of presentacionesNorm) {
        const quiereStock = s.stockCerrado !== undefined && s.stockCerrado != null;
        const quierePrecio = s.precio !== undefined;
        const quiereDescuento = s.descuento !== undefined;
        if (!quiereStock && !quierePrecio && !quiereDescuento) continue;

        const presentacion = await tx.presentaciones.findUnique({
          where: { id: s.presentacionId },
          select: {
            id: true,
            nombre: true,
            productoId: true,
            precio: true,
            descuento: true,
            producto: { select: { id: true, nombre: true, codigoBarra: true } },
          },
        });
        if (!presentacion) continue;

        // Stock cerrado
        if (quiereStock) {
          const stockAntes = await tx.stockPresentacion.findUnique({
            where: { presentacionId: s.presentacionId },
            select: { stockCerrado: true },
          });

          const antesVal = stockAntes?.stockCerrado ?? 0;
          if (antesVal !== s.stockCerrado) {
            await tx.stockPresentacion.upsert({
              where: { presentacionId: s.presentacionId },
              create: { presentacionId: s.presentacionId, stockCerrado: s.stockCerrado },
              update: { stockCerrado: s.stockCerrado },
              select: { presentacionId: true },
            });

            await auditAction({
              level: 'SUCCESS',
              action: 'CONTEO_MANUAL',
              message: `Conteo manual stock cerrado (listado): ${presentacion.producto?.nombre || 'Producto'} · ${presentacion.nombre} ${antesVal} -> ${s.stockCerrado}`,
              category: 'DB',
              metadata: {
                productoId: presentacion.productoId,
                productoNombre: presentacion.producto?.nombre || null,
                codigoBarra: presentacion.producto?.codigoBarra || null,
                presentacionId: s.presentacionId,
                presentacionNombre: presentacion.nombre,
                stockCerradoAntes: antesVal,
                stockCerradoDespues: s.stockCerrado,
                motivo: motivo || null,
              },
              userId,
            });
            changed += 1;
          }
        }

        // Precio/Descuento
        const updatesPres = {};
        if (quierePrecio) {
          if (s.precio != null && (!Number.isFinite(s.precio) || s.precio < 0)) {
            throw new Error(`Precio inválido para presentación ${s.presentacionId}`);
          }
          if (s.precio !== presentacion.precio) updatesPres.precio = s.precio;
        }
        if (quiereDescuento) {
          if (!Number.isFinite(s.descuento) || s.descuento < 0 || s.descuento > 100) {
            throw new Error(`Descuento inválido para presentación ${s.presentacionId}`);
          }
          if (s.descuento !== presentacion.descuento) updatesPres.descuento = s.descuento;
        }

        if (Object.keys(updatesPres).length > 0) {
          await tx.presentaciones.update({
            where: { id: s.presentacionId },
            data: updatesPres,
            select: { id: true },
          });

          await auditAction({
            level: 'SUCCESS',
            action: 'PRESENTACION_ACTUALIZADA',
            message: `Presentación actualizada (listado): ${presentacion.producto?.nombre || 'Producto'} · ${presentacion.nombre}`,
            category: 'DB',
            metadata: {
              productoId: presentacion.productoId,
              productoNombre: presentacion.producto?.nombre || null,
              codigoBarra: presentacion.producto?.codigoBarra || null,
              presentacionId: s.presentacionId,
              presentacionNombre: presentacion.nombre,
              cambios: Object.keys(updatesPres),
              precioAntes: presentacion.precio ?? null,
              precioDespues: updatesPres.precio !== undefined ? updatesPres.precio : presentacion.precio ?? null,
              descuentoAntes: presentacion.descuento ?? 0,
              descuentoDespues: updatesPres.descuento !== undefined ? updatesPres.descuento : presentacion.descuento ?? 0,
              motivo: motivo || null,
            },
            userId,
          });
          changed += 1;
        }
      }

      return { changed };
    });

    revalidatePath('/listadoProductos');
    revalidarProductos();
    return { error: false, changed: result.changed };
  } catch (e) {
    return { error: true, msg: e?.message || 'Error guardando cambios' };
  }
}

export async function actualizarPrecioProducto({ productoId, nuevoPrecio, motivo } = {}) {
  const normalizarNumero = (value, fallback = 0) => {
    if (value == null || value === '') return fallback;
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return n;
  };

  if (!productoId) return { error: true, msg: 'Falta productoId' };

  const session = await getSession();
  const userId = session?.user || 'Sistema';

  const precio = normalizarNumero(nuevoPrecio, NaN);
  if (!Number.isFinite(precio) || precio < 0) return { error: true, msg: 'Precio inválido' };

  const producto = await prisma.productos.findUnique({
    where: { id: productoId },
    select: { id: true, nombre: true, codigoBarra: true },
  });
  if (!producto) return { error: true, msg: 'Producto no encontrado' };

  const precioPrevio = await prisma.precios.findFirst({
    where: { idProducto: productoId },
    orderBy: { createdAt: 'desc' },
    select: { precio: true, createdAt: true },
  });

  await prisma.precios.create({
    data: {
      precio,
      idProducto: productoId,
    },
  });

  await auditAction({
    level: 'SUCCESS',
    action: 'PRECIO_ACTUALIZADO',
    message: `Precio actualizado: ${producto.nombre} (${producto.codigoBarra})`,
    category: 'DB',
    metadata: {
      productoId,
      productoNombre: producto.nombre,
      codigoBarra: producto.codigoBarra,
      precioAntes: precioPrevio?.precio ?? null,
      precioDespues: precio,
      motivo: motivo || null,
    },
    userId,
  });

  revalidatePath('/listadoProductos');
  revalidarProductos();
  return { error: false };
}

export async function guardarProducto(formData) {
  const esUuid = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

  const normalizarEntero = (value, fallback = 0) => {
    if (value == null || value === '') return fallback;
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.trunc(n);
  };

  const normalizarNumeroNullable = (value) => {
    if (value == null || value === '') return null;
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return n;
  };

  const normalizarPorcentaje = (value) => {
    if (value == null || value === '') return 0;
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
  };

  const transformedData = {
    codigoBarra: formData.codigoBarra,
    descripcion: formData.descripcion,
    unidad: formData.unidad,
    imagen: formData.imagen,
    size: parseFloat(formData.size) || null,
    stockSuelto: normalizarEntero(formData.stockSuelto, 0),
    nombre: textos.mayusculas.primeras(formData.nombre),
    marcaId: formData.marcaId || null,
  };

  const relaciones = { update: {}, create: {} };

  if (formData.categorias) {
    // Para update, primero desconectar todas las categorías existentes
    if (formData.id) {
      relaciones.update.categorias = {
        set: [], // Desconectar todas primero
        connect: formData.categorias.map(({ id }) => ({ id })), // Luego conectar las nuevas
      };
    } else {
      // Para create, solo conectar
      relaciones.create.categorias = {
        connect: formData.categorias.map(({ id }) => ({ id })),
      };
    }
  } else if (formData.id) {
    // Si no hay categorías pero es update, desconectar todas
    relaciones.update.categorias = {
      set: [],
    };
  }

  if (formData.proveedores?.length > 0) {
    const proveedoresValidos = formData.proveedores.map(p => p.proveedor).filter(p => p.id); // Solo con ID
    relaciones.create.proveedores = {
      connectOrCreate: proveedoresValidos.map(({ id, codigoProveedor }) => ({
        where: {
          proveedorId_productoId: {
            proveedorId: id, // Usa el ID del proveedor
            productoId: formData.id
          },
        },
        create: {
          proveedor: { connect: { id } }, // Conectá el proveedor existente
          codigo: codigoProveedor || formData.nombre, // Usá el código o el nombre del producto
        },
      })),
    };
    relaciones.update.proveedores = relaciones.create.proveedores;
  }

  // Manejar presentaciones sin borrarlas (preserva IDs y permite stock por presentación)
  const presentacionesInput = Array.isArray(formData.presentaciones) ? formData.presentaciones : [];
  const presentacionesNormalizadas = presentacionesInput
    .filter((p) => p && p.nombre && p.tipoPresentacionId)
    .map((p) => ({
      id: p.id,
      nombre: p.nombre,
      codigoBarra: p.codigoBarra ? String(p.codigoBarra).trim() : null,
      tipoPresentacionId: p.tipoPresentacionId,
      cantidad: parseFloat(p.cantidad) || 1,
      unidadMedida: p.unidadMedida,
      contenidoPorUnidad: p.contenidoPorUnidad ? parseFloat(p.contenidoPorUnidad) : null,
      unidadContenido: p.unidadContenido || null,
      precio: normalizarNumeroNullable(p.precio),
      descuento: normalizarPorcentaje(p.descuento),
      esUnidadBase: Boolean(p.esUnidadBase),
    }));

  const hayAlgunaBase = presentacionesNormalizadas.some((p) => p.esUnidadBase);
  const presentacionesConUnaBase = presentacionesNormalizadas.map((p, idx) => {
    if (hayAlgunaBase) return p;
    // Si no se marcó ninguna, setear la primera como base (mínimo viable)
    return { ...p, esUnidadBase: idx === 0 };
  });

  try {
    // Solo eliminar proveedores no deseados si es un update y hay proveedores
    if (formData.id && formData.proveedores?.length >= 0) {
      const proveedoresIds = formData.proveedores
        .map(p => p.proveedor?.id)
        .filter(id => id); // Filtrar IDs válidos

      if (proveedoresIds.length > 0) {
        await prisma.productoProveedor.deleteMany({
          where: {
            productoId: formData.id,
            proveedorId: { notIn: proveedoresIds }
          }
        });
      }
    }

    const producto = await prisma.productos.upsert({
      where: { codigoBarra: formData.codigoBarra },
      update: {
        ...transformedData,
        ...relaciones.update,
      },
      create: {
        ...transformedData,
        ...relaciones.create,
      },
      include: {
        categorias: true,
        proveedores: true, // Esto incluye los códigos por proveedor
        presentaciones: {
          include: {
            tipoPresentacion: true,
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
            stock: true,
          },
        },
      },
    });

    // Sincronizar presentaciones (upsert/update/delete) preservando IDs
    const productoId = producto.id;

    const existentes = await prisma.presentaciones.findMany({
      where: { productoId },
      select: { id: true },
    });
    const existentesIds = new Set(existentes.map((p) => p.id));

    const idsAConservar = new Set(
      presentacionesConUnaBase
        .map((p) => (esUuid(p.id) ? p.id : null))
        .filter(Boolean)
    );

    const idsAEliminar = [...existentesIds].filter((id) => !idsAConservar.has(id));
    if (idsAEliminar.length > 0) {
      await prisma.presentaciones.deleteMany({
        where: { id: { in: idsAEliminar } },
      });
    }

    // Asegurar que sólo haya 1 base
    const baseId = presentacionesConUnaBase.find((p) => p.esUnidadBase && esUuid(p.id))?.id ?? null;
    if (baseId) {
      await prisma.presentaciones.updateMany({
        where: { productoId, id: { not: baseId } },
        data: { esUnidadBase: false },
      });
    }

    for (const p of presentacionesConUnaBase) {
      if (esUuid(p.id)) {
        await prisma.presentaciones.update({
          where: { id: p.id },
          data: {
            nombre: p.nombre,
            codigoBarra: p.codigoBarra || null,
            tipoPresentacionId: p.tipoPresentacionId,
            cantidad: p.cantidad,
            unidadMedida: p.unidadMedida,
            contenidoPorUnidad: p.contenidoPorUnidad,
            unidadContenido: p.unidadContenido,
            precio: p.precio,
            descuento: p.descuento,
            esUnidadBase: Boolean(p.esUnidadBase),
          },
        });

        await prisma.stockPresentacion.upsert({
          where: { presentacionId: p.id },
          update: {},
          create: { presentacionId: p.id, stockCerrado: 0 },
        });
      } else {
        const creada = await prisma.presentaciones.create({
          data: {
            productoId,
            nombre: p.nombre,
            codigoBarra: p.codigoBarra || null,
            tipoPresentacionId: p.tipoPresentacionId,
            cantidad: p.cantidad,
            unidadMedida: p.unidadMedida,
            contenidoPorUnidad: p.contenidoPorUnidad,
            unidadContenido: p.unidadContenido,
            precio: p.precio,
            descuento: p.descuento,
            esUnidadBase: Boolean(p.esUnidadBase),
          },
        });

        await prisma.stockPresentacion.create({
          data: { presentacionId: creada.id, stockCerrado: 0 },
        });
      }
    }

    // Recargar producto con presentaciones sincronizadas
    const productoActualizado = await prisma.productos.findUnique({
      where: { id: productoId },
      include: {
        categorias: true,
        proveedores: true,
        presentaciones: {
          include: {
            tipoPresentacion: true,
            stock: true,
            contenidas: {
              include: {
                presentacionContenida: { include: { tipoPresentacion: true } },
                presentacionContenedora: { include: { tipoPresentacion: true } },
              },
            },
            contenedoras: {
              include: {
                presentacionContenida: { include: { tipoPresentacion: true } },
                presentacionContenedora: { include: { tipoPresentacion: true } },
              },
            },
          },
        },
      },
    });

    // Auditar éxito
    await auditAction({
      level: 'SUCCESS',
      action: 'GUARDAR_PRODUCTO',
      message: 'Producto guardado correctamente',
      category: 'DB',
    });

    return { error: false, msg: "Producto procesado con éxito", data: productoActualizado ?? producto };
  } catch (error) {
    console.error("Error al guardar el producto:", error);
    let msg = "Error al procesar el producto";
    if (error.code === "P2002") {
      msg = `Ya existe un producto con el código de barras ${formData.codigoBarra}.`;
    }

    // Auditar error
    await auditAction({
      level: 'ERROR',
      action: 'GUARDAR_PRODUCTO',
      message: msg,
      category: 'DB',
    });

    return { error: true, msg, data: null };
  } finally {
    revalidarProductos();
  }
}









export async function guardarProductoBuscado(productObject) {
  const response = await guardarProducto(productObject)
  revalidarProductos();
  return response
}

export async function eliminarProductoConPreciosPorId(idProducto, userIdParam = null) {
  try{
    console.log(`[ELIMINAR] Iniciando eliminación de producto ${idProducto} con userId: ${userIdParam}`);
    
    // Obtener usuario activo
    let userId = userIdParam; // Usar el userId pasado como parámetro si existe
    if (!userId) {
      const session = await getSession();
      userId = session?.user || 'Sistema';
    }
    
    console.log(`[ELIMINAR] userId final: ${userId}`);

    // Obtener datos del producto antes de eliminarlo
    const producto = await prisma.productos.findUnique({
      where: { id: idProducto },
      include: { precios: true }
    });

    if (!producto) {
      return { error: true, msg: 'Producto no encontrado' };
    }

    // Verificar si hay múltiples precios (historial de compra)
    if (producto.precios.length > 1) {
      await auditAction({
        level: 'WARNING',
        action: 'ELIMINAR_PRODUCTO',
        message: `Intento de eliminación rechazado: ${producto.nombre} tiene historial de precios`,
        category: 'DB',
        metadata: {
          productId: producto.id,
          productName: producto.nombre,
          codigoBarra: producto.codigoBarra,
          preciosCount: producto.precios.length,
          reason: 'MULTIPLE_PRICES'
        },
        userId
      });

      return {
        error: true,
        msg: 'Este producto tiene historial de precios. Para eliminarlo, contacte al administrador.',
        code: 'MULTIPLE_PRICES'
      };
    }

    // Guardar datos completos para posible undo
    const productoCompleto = await prisma.productos.findUnique({
      where: { id: idProducto },
      include: { precios: true }
    });

    // Eliminar precios (los detalles se eliminarán por cascada)
    await prisma.precios.deleteMany({
      where: { idProducto: idProducto }
    });

    // Eliminar el producto (cascará los detalles)
    const resultado = await prisma.productos.delete({
      where: { id: idProducto }
    });

    // Auditar éxito con metadata del producto
    console.log(`[ELIMINAR] Creando audit log con metadata:`, {
      productId: producto.id,
      productName: producto.nombre,
      codigoBarra: producto.codigoBarra,
      preciosCount: producto.precios.length,
      userId
    });
    
    await auditAction({
      level: 'SUCCESS',
      action: 'ELIMINAR_PRODUCTO',
      message: `Producto eliminado: ${producto.nombre}`,
      category: 'DB',
      metadata: {
        productId: producto.id,
        productName: producto.nombre,
        codigoBarra: producto.codigoBarra,
        preciosCount: producto.precios.length,
        productoCompleto: productoCompleto // Guardar para undo
      },
      userId
    });
    
    console.log(`[ELIMINAR] Producto eliminado exitosamente`);

    return { 
      error: false, 
      msg: "Producto eliminado con éxito", 
      data: resultado,
      undoData: productoCompleto // Retornar datos para undo en el cliente
    };
  }catch(e){
    const session = await getSession();
    const userId = session?.user || 'Sistema';

    let msg;
    let level = 'ERROR';
    
    switch (e.code) {
      case "P2003":
        msg = 'No se puede borrar este producto, está vinculado a detalles de compra/venta'
        level = 'WARNING';
      break;
      default:
        msg = e.message
      break;
    }

    // Auditar como intento del usuario
    await auditAction({
      level: level,
      action: 'ELIMINAR_PRODUCTO',
      message: msg,
      category: 'DB',
      metadata: { productId: idProducto },
      userId
    });

    return {error: true, code: e.code, msg}
  } finally {
    revalidarProductos();
  }
}