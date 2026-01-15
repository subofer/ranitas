"use server";

import prisma from "../prisma";

const normalizarEnteroPositivo = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(Math.max(0, n));
};

const normalizarFloatPositivo = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
};

const normalizarNumero = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return n;
};

async function getContactoEmisorInterno() {
  const interno = await prisma.contactos.findFirst({
    where: { esInterno: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return interno?.id ?? null;
}

async function getContactoConsumidorFinal() {
  const CUIT_CF = "00000000000";
  const existente = await prisma.contactos.findUnique({
    where: { cuit: CUIT_CF },
    select: { id: true },
  });
  if (existente?.id) return existente.id;

  const creado = await prisma.contactos.create({
    data: {
      cuit: CUIT_CF,
      nombre: "Consumidor Final",
      esInterno: false,
      esProveedor: false,
    },
    select: { id: true },
  });
  return creado.id;
}

export async function guardarVentaConStock(venta = {}) {
  const detalle = Array.isArray(venta?.detalle) ? venta.detalle : [];
  if (detalle.length === 0) return { error: true, msg: "Venta sin productos" };

  const detalleBruto = detalle
    .map((item) => ({
      idProducto: item?.idProducto ?? item?.id,
      cantidad: item?.cantidad,
      precioUnitario: normalizarNumero(item?.precioUnitario ?? item?.precioActual),
      unidadVenta: item?.unidadVenta ?? null,
      variedad: item?.variedad ?? null,
    }))
    .filter((d) => d.idProducto);

  if (detalleBruto.length === 0) return { error: true, msg: "No hay renglones válidos" };

  const emisorId = await getContactoEmisorInterno();
  if (!emisorId) {
    return {
      error: true,
      msg: "No hay un contacto interno (esInterno=true) configurado para emitir la venta.",
    };
  }
  const consumidorId = await getContactoConsumidorFinal();

  const tipoDocumento = "FACTURA_A";
  const tipoMovimiento = "SALIDA";
  const fecha = new Date();
  const tieneImpuestos = false;

  try {
    const documento = await prisma.$transaction(async (tx) => {
      // Numeración correlativa por emisor + tipo
      const last = await tx.documentos.findFirst({
        where: {
          tipoMovimiento,
          tipoDocumento,
          idContacto: emisorId,
        },
        orderBy: { createdAt: "desc" },
        select: { numeroDocumento: true },
      });
      const nextNumero = String((Number(last?.numeroDocumento) || 0) + 1);

      const ids = [...new Set(detalleBruto.map((d) => d.idProducto))];
      const productos = await tx.productos.findMany({
        where: { id: { in: ids } },
        select: { id: true, stockSuelto: true, nombre: true, tipoVenta: true, unidad: true },
      });
      const prodById = new Map(productos.map((p) => [p.id, p]));

      const detallesTransformados = detalleBruto
        .map((d) => {
          const prod = prodById.get(d.idProducto);
          if (!prod) return null;
          const esGranel = prod.tipoVenta === 'GRANEL';
          const cantidadNormalizada = esGranel
            ? normalizarFloatPositivo(d.cantidad)
            : normalizarEnteroPositivo(d.cantidad);
          if (cantidadNormalizada <= 0) return null;
          return {
            idProducto: d.idProducto,
            cantidad: cantidadNormalizada,
            precioUnitario: d.precioUnitario,
            unidadVenta: d.unidadVenta ?? (esGranel ? (prod.unidad || 'kg') : null),
            variedad: d.variedad,
            _esGranel: esGranel,
          };
        })
        .filter(Boolean);

      if (detallesTransformados.length === 0) throw new Error('No hay renglones válidos');

      // Validar stock SOLO para unidades/bultos
      for (const d of detallesTransformados) {
        if (d._esGranel) continue;
        const prod = prodById.get(d.idProducto);
        if (!prod) throw new Error('Producto no encontrado');
        if ((prod.stockSuelto ?? 0) < d.cantidad) {
          throw new Error(`Stock insuficiente para ${prod.nombre}. Disponible: ${prod.stockSuelto ?? 0}`);
        }
      }

      const total = detallesTransformados.reduce((acc, d) => acc + d.precioUnitario * d.cantidad, 0);

      const doc = await tx.documentos.create({
        data: {
          idContacto: emisorId,
          idDestinatario: consumidorId,
          numeroDocumento: nextNumero,
          fecha,
          tieneImpuestos,
          tipoDocumento,
          tipoMovimiento,
          total,
          detalle: {
            create: detallesTransformados.map(({ _esGranel, ...rest }) => rest),
          },
        },
        include: { detalle: true },
      });

      // Descontar stock suelto SOLO para unidades/bultos
      for (const d of detallesTransformados) {
        if (d._esGranel) continue;
        await tx.productos.update({
          where: { id: d.idProducto },
          data: { stockSuelto: { decrement: d.cantidad } },
        });
      }

      return doc;
    });

    return { error: false, msg: "Venta guardada", data: documento };
  } catch (e) {
    return { error: true, msg: e?.message || "Error guardando venta" };
  }
}
