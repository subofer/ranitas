import prisma from '../prisma/prisma.js';

const norm = (s) => String(s ?? '').trim().toLowerCase();

const isPesoKg = (unidad) => {
  const u = norm(unidad);
  return u === 'kg' || u === 'kilo' || u === 'kilos' || u.includes('kg');
};

const isUnidadDiscreta = (unidad) => {
  const u = norm(unidad);
  if (!u) return true;
  if (isPesoKg(u)) return false;
  return ['u', 'unidad', 'unidades', 'und', 'uds', 'capsula', 'cápsula', 'capsulas', 'cápsulas'].includes(u);
};

const ensureTipoPresentacion = async (nombre, descripcion) => {
  await prisma.tiposPresentacion.upsert({
    where: { nombre },
    update: {},
    create: { nombre, descripcion },
  });
};

const getTipoIdMap = async () => {
  const tipos = await prisma.tiposPresentacion.findMany({ select: { id: true, nombre: true } });
  const map = new Map();
  for (const t of tipos) map.set(t.nombre, t.id);
  return map;
};

const ensurePresentacion = async ({ productoId, nombre, tipoPresentacionId, cantidad, unidadMedida, esUnidadBase = false }) => {
  const existente = await prisma.presentaciones.findFirst({
    where: { productoId, nombre },
    select: { id: true, nombre: true, esUnidadBase: true },
  });

  if (existente) {
    if (esUnidadBase && !existente.esUnidadBase) {
      await prisma.presentaciones.update({ where: { id: existente.id }, data: { esUnidadBase: true } });
    }
    return existente;
  }

  return prisma.presentaciones.create({
    data: {
      productoId,
      nombre,
      tipoPresentacionId,
      cantidad,
      unidadMedida,
      esUnidadBase,
    },
    select: { id: true, nombre: true, esUnidadBase: true },
  });
};

const ensureStockPresentacion = async (presentacionId) => {
  try {
    await prisma.stockPresentacion.upsert({
      where: { presentacionId },
      update: {},
      create: { presentacionId, stockCerrado: 0 },
    });
  } catch {
    // no-op
  }
};

const ensureAgrupacion = async ({ presentacionContenedoraId, presentacionContenidaId, cantidad }) => {
  try {
    await prisma.agrupacionPresentaciones.create({
      data: { presentacionContenedoraId, presentacionContenidaId, cantidad },
    });
  } catch (e) {
    // Si ya existe por @@unique, no hacemos nada.
    if (e?.code !== 'P2002') throw e;
  }
};

const elegirUnidadBase = (producto) => {
  if (isPesoKg(producto?.unidad)) return 'kg';
  const u = norm(producto?.unidad);
  if (!u) return 'u';
  if (['u', 'unidad', 'unidades', 'und', 'uds'].includes(u)) return 'u';
  return u;
};

const aplicarPresentacionesAProducto = async (producto, tipoIds) => {
  const presentacionesActuales = Array.isArray(producto?.presentaciones) ? producto.presentaciones : [];
  const baseExistente = presentacionesActuales.find((p) => p?.esUnidadBase);

  const unidadBase = elegirUnidadBase(producto);
  const baseNombre = unidadBase === 'kg' ? 'Kg suelto' : 'Unidad suelta';

  const base = baseExistente
    ? { id: baseExistente.id, nombre: baseExistente.nombre }
    : await ensurePresentacion({
        productoId: producto.id,
        nombre: baseNombre,
        tipoPresentacionId: tipoIds.get('unidad'),
        cantidad: 1,
        unidadMedida: unidadBase,
        esUnidadBase: true,
      });

  // Heurística: si es granel o unidad kg => bolsas/bolsones.
  const addPeso = producto?.tipoVenta === 'GRANEL' || isPesoKg(producto?.unidad);

  // Heurística: snacks/unidad => cajas.
  const nombreLower = norm(producto?.nombre);
  const pareceUnidad = isUnidadDiscreta(producto?.unidad);
  const pareceSnack = ['alfajor', 'gallet', 'barra', 'chocolate', 'caramelo', 'snack'].some((k) => nombreLower.includes(k));

  const wantsCaja = pareceUnidad && (pareceSnack || producto?.tipoVenta === 'UNIDAD');

  const existentesPorNombre = new Set(presentacionesActuales.map((p) => p?.nombre).filter(Boolean));

  const crearCaja = async (n) => {
    const nombre = `Caja x ${n}`;
    if (existentesPorNombre.has(nombre)) return;
    const caja = await ensurePresentacion({
      productoId: producto.id,
      nombre,
      tipoPresentacionId: tipoIds.get('caja'),
      cantidad: n,
      unidadMedida: unidadBase,
    });
    await ensureStockPresentacion(caja.id);
    await ensureAgrupacion({ presentacionContenedoraId: caja.id, presentacionContenidaId: base.id, cantidad: n });
  };

  const crearBolsa = async (kg, etiqueta) => {
    const nombre = etiqueta;
    if (existentesPorNombre.has(nombre)) return;
    const bolsa = await ensurePresentacion({
      productoId: producto.id,
      nombre,
      tipoPresentacionId: tipoIds.get('bolsa'),
      cantidad: kg,
      unidadMedida: 'kg',
    });
    await ensureStockPresentacion(bolsa.id);
    await ensureAgrupacion({ presentacionContenedoraId: bolsa.id, presentacionContenidaId: base.id, cantidad: kg });
  };

  if (wantsCaja) {
    await crearCaja(6);
    await crearCaja(12);
  }

  if (addPeso && unidadBase === 'kg') {
    await crearBolsa(1, 'Bolsa 1kg');
    await crearBolsa(5, 'Bolsa 5kg');
    await crearBolsa(25, 'Bolson 25kg');
  }
};

const main = async () => {
  console.log('🧠 Asignando presentaciones automáticas...');

  // Asegurar tipos base.
  await ensureTipoPresentacion('unidad', 'Unidad individual');
  await ensureTipoPresentacion('caja', 'Caja contenedora');
  await ensureTipoPresentacion('bolsa', 'Bolsa contenedora');

  const tipoIds = await getTipoIdMap();
  for (const req of ['unidad', 'caja', 'bolsa']) {
    if (!tipoIds.get(req)) {
      throw new Error(`Falta TiposPresentacion '${req}'. Corré el seed o crealo primero.`);
    }
  }

  const productos = await prisma.productos.findMany({
    select: {
      id: true,
      nombre: true,
      unidad: true,
      tipoVenta: true,
      presentaciones: {
        select: {
          id: true,
          nombre: true,
          esUnidadBase: true,
        },
      },
    },
    orderBy: { nombre: 'asc' },
  });

  let ok = 0;
  for (const p of productos) {
    try {
      await aplicarPresentacionesAProducto(p, tipoIds);
      ok += 1;
      if (ok % 100 === 0) console.log(`...${ok}/${productos.length}`);
    } catch (e) {
      console.error(`❌ Error en '${p.nombre}':`, e?.message || e);
    }
  }

  console.log(`✅ Listo. Procesados ${ok}/${productos.length}`);
};

try {
  await main();
} finally {
  await prisma.$disconnect();
}
