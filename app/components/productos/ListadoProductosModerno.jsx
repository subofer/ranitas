"use client"
import { useMemo, useState, useEffect, useCallback, useRef, Fragment } from 'react';
import debounce from '@/lib/debounce';
import { useKeyboard } from '@/hooks/useKeyboard';
import { getProductos } from '@/prisma/consultas/productos';
import { eliminarProductoConPreciosPorId, guardarCambiosListadoProductos, guardarProducto, actualizarPrecioProducto } from '@/prisma/serverActions/productos';
import { restaurarProducto } from '@/prisma/serverActions/undo';
import { alertaBorrarProducto } from '../alertas/alertaBorrarProducto';
import { useNotification } from '@/context/NotificationContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from '../formComponents/Icon';
import FilterSelect from '../formComponents/FilterSelect';
import BotonAgregarPedido from '../pedidos/BotonAgregarPedido';
import ImageWithFallback from '../ui/ImageWithFallback';
import { useErrorNotification } from '@/hooks/useErrorNotification';
import ProductListPlaceholder from './ProductListPlaceholder';
import ProductGridPlaceholder from './ProductGridPlaceholder';
import HighlightMatch from '../HiglightMatch';
import { CONTROL_PANEL } from '@/lib/controlPanelConfig';
import useSelect from '@/app/hooks/useSelect';
import { getMarcasSelect } from '@/prisma/consultas/marcas';
import { getCategorias } from '@/prisma/consultas/categorias';
import { getTiposPresentacion } from '@/prisma/consultas/tiposPresentacion';
import normalizar from '@/lib/normalizar';
import useProductosEdit from '@/app/hooks/useProductosEdit';
import useProductosTable from '@/app/hooks/useProductosTable';
import ProductoFila from './ProductoFila';
import { guardarPresentacion, eliminarPresentacion } from '@/prisma/serverActions/presentaciones';
import { abrirPresentacion } from '@/prisma/serverActions/stock';
import { confirmarEliminacion } from '@/lib/confirmDialog';

let productosCache = null;
let productosCacheAt = 0;


const construirAdyacenciasContenedoraAContenida = (producto) => {
  const map = new Map();
  const presentaciones = Array.isArray(producto?.presentaciones) ? producto.presentaciones : [];

  for (const p of presentaciones) {
    const edges = Array.isArray(p?.contenedoras) ? p.contenedoras : [];
    for (const e of edges) {
      const from = e.presentacionContenedoraId;
      const to = e.presentacionContenidaId;
      const factor = Number(e.cantidad);
      if (!from || !to) continue;
      if (!Number.isFinite(factor) || factor <= 0) continue;
      const lista = map.get(from) ?? [];
      lista.push({ to, factor });
      map.set(from, lista);
    }
  }

  return map;
};

const calcularFactorAUnidadBase = (producto, desdePresentacionId, basePresentacionId) => {
  if (!desdePresentacionId || !basePresentacionId) return null;
  if (desdePresentacionId === basePresentacionId) return 1;

  const ady = construirAdyacenciasContenedoraAContenida(producto);
  const queue = [{ id: desdePresentacionId, factor: 1 }];
  const visited = new Set([desdePresentacionId]);

  while (queue.length > 0) {
    const cur = queue.shift();
    const edges = ady.get(cur.id) ?? [];
    for (const e of edges) {
      const nextFactor = cur.factor * e.factor;
      if (e.to === basePresentacionId) return nextFactor;
      if (visited.has(e.to)) continue;
      visited.add(e.to);
      queue.push({ id: e.to, factor: nextFactor });
    }
  }

  return null;
};

const getUnidadBaseId = (producto) => {
  const presentaciones = Array.isArray(producto?.presentaciones) ? producto.presentaciones : [];
  return presentaciones.find((p) => p?.esUnidadBase)?.id ?? null;
};

const getStockCerradoPresentacion = (presentacion) => {
  const n = presentacion?.stock?.stockCerrado;
  return Number.isFinite(Number(n)) ? Math.trunc(Number(n)) : 0;
};

const calcularStockEquivalente = (producto) => {
  const stockSuelto = normalizar.enteroPositivo(producto?.stockSuelto ?? 0);
  const baseId = getUnidadBaseId(producto);
  const presentaciones = Array.isArray(producto?.presentaciones) ? producto.presentaciones : [];

  let equivalenteDesdePresentaciones = 0;
  if (baseId) {
    for (const p of presentaciones) {
      if (!p?.id) continue;
      if (p.id === baseId) continue;

      const stockCerrado = getStockCerradoPresentacion(p);
      if (stockCerrado <= 0) continue;

      const factor = calcularFactorAUnidadBase(producto, p.id, baseId);
      if (!Number.isFinite(factor) || factor == null) continue;

      equivalenteDesdePresentaciones += Math.round(stockCerrado * factor);
    }
  }

  return {
    stockSuelto,
    equivalenteDesdePresentaciones,
    totalEquivalente: stockSuelto + equivalenteDesdePresentaciones,
    baseId,
  };
};

const ListadoProductosModerno = ({ 
  mostrarCodigo = true, modoCompacto = false, autoFoco = true,  
}) => {
  const { showError } = useErrorNotification();
  const { addNotification } = useNotification();
  const { userName } = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vistaTipo, setVistaTipo] = useState('lista');

  // Hooks de estado de edición y tabla
  const {
    modoEdicionManual,
    toggleModoEdicion: setModoEdicionManual,
    guardandoCambios,
    editsProductos,
    editsPresentaciones,
    setProductoEdit,
    setPresentacionEdit,
    hayCambios,
    guardarCambios: ejecutarGuardarCambios,
  } = useProductosEdit();

  const {
    pagina,
    perPage,
    setPerPage,
    busquedaInput,
    setBusquedaInput,
    categoriaFiltro,
    setCategoriaFiltro,
    ordenamiento,
    handleOrdenar,
    searchFields,
    toggleCampoBusqueda,
    productosEnPagina,
    totalFiltrados,
    totalPaginas,
    productosFiltrados,
    navegarPagina: setPagina,
  } = useProductosTable(productos);

  const { data: marcasOptions = [] } = useSelect(getMarcasSelect, 'marcas');
  const { data: categoriasOptions = [] } = useSelect(getCategorias, 'categorias');
  const { data: tiposPresentacionOptions = [] } = useSelect(getTiposPresentacion, 'tiposPresentacion');

  const [presentacionSeleccionadaPorProducto, setPresentacionSeleccionadaPorProducto] = useState({});
  const [filaEditandoId, setFilaEditandoId] = useState(null);
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const [copyMenuOpen, setCopyMenuOpen] = useState(false);
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const [columnasVisibles, setColumnasVisibles] = useState(() => ({
    codigo: Boolean(mostrarCodigo),
    categoria: true,
    tamano: true,
    precio: true,
    stock: true,
  }));

  const [searchFields_local, setSearchFields_local] = useState({
    nombre: true,
    codigoBarra: true,
    precio: false,
    categoria: false,
    tamano: false,
    unidad: false,
    descripcion: false,
  });

  const inputBusquedaRef = useRef(null);
  const filaProductoRef = useRef({});
  const tablaRef = useRef(null);
  const categoryFilterRef = useRef(null);
  const copyMenuRef = useRef(null);
  const searchMenuRef = useRef(null);
  const columnsMenuRef = useRef(null);
  const scopeRef = useRef(null);

  const setQueryParams = useCallback((patch = {}) => {
    const params = new URLSearchParams(searchParams?.toString?.() || '');
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === '') params.delete(k);
      else params.set(k, String(v));
    }
    const qs = params.toString();
    router.replace(qs ? `/listadoProductos?${qs}` : '/listadoProductos', { scroll: false });
  }, [router, searchParams]);

  const cargarProductos = useCallback(async ({ force = false } = {}) => {
    try {
      setLoading(true);
      // Cache simple para evitar doble POST de montaje (StrictMode dev)
      if (!force && Array.isArray(productosCache) && productosCache.length >= 0) {
        const ageMs = Date.now() - (productosCacheAt || 0);
        if (ageMs < 30_000) {
          setProductos(productosCache);
          setLoading(false);
          return;
        }
      }

      const { productos: productosData = [] } = await getProductos({ take: 10000 }) || {};
      const lista = Array.isArray(productosData) ? productosData : [];
      setProductos(lista);
      productosCache = lista;
      productosCacheAt = Date.now();
    } catch (error) {
      console.error('Error cargando productos:', error);
      setProductos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  const guardarCambios = useCallback(async () => {
    if (!hayCambios) return;
    try {
      const entries = Object.entries(editsProductos || {});

      const presentacionesPayload = Object.entries(editsPresentaciones || {})
        .filter(([presentacionId]) => presentacionId && !String(presentacionId).startsWith('__new__'))
        .map(([presentacionId, edit]) => ({ presentacionId, ...(edit || {}) }));

      const nuevos = entries
        .filter(([id]) => String(id).startsWith('__new__'))
        .map(([tempId, edit]) => ({ tempId, ...(edit || {}) }));

      const existentes = entries
        .filter(([id]) => !String(id).startsWith('__new__'))
        .map(([id, edit]) => ({ id, ...(edit || {}) }))
        .filter((x) => x && x.id);

      // 1) Crear nuevos productos (alta rápida en tabla)
      for (const n of nuevos) {
        const codigo = (n.codigoBarra ?? '').toString().trim();
        const nombre = (n.nombre ?? '').toString().trim();
        if (!codigo) throw new Error('Nuevo producto: falta código de barras');
        if (!nombre) throw new Error('Nuevo producto: falta nombre');

        const categoriaId = n.categoriaId ? String(n.categoriaId) : null;
        const marcaId = n.marcaId ? String(n.marcaId) : null;

        const resCrear = await guardarProducto({
          id: '',
          codigoBarra: codigo,
          nombre,
          descripcion: n.descripcion ?? '',
          size: n.size ?? '',
          unidad: n.unidad ?? '',
          stockSuelto: n.stockSuelto ?? 0,
          imagen: '',
          marcaId: marcaId || '',
          proveedores: [],
          categorias: categoriaId ? [{ id: categoriaId, nombre: '' }] : [],
          presentaciones: [],
        });
        if (resCrear?.error) throw new Error(resCrear?.msg || 'Error creando nuevo producto');

        const productoCreadoId = resCrear?.data?.id;
        if (!productoCreadoId) throw new Error('Error creando nuevo producto (sin id)');

        if (n.precio !== undefined && n.precio !== null && n.precio !== '') {
          const rPrecio = await actualizarPrecioProducto({
            productoId: productoCreadoId,
            nuevoPrecio: n.precio,
            motivo: 'alta_listado',
          });
          if (rPrecio?.error) throw new Error(rPrecio?.msg || 'Error guardando precio inicial');
        }
      }

      // 2) Guardar cambios de productos existentes
      if (existentes.length > 0 || presentacionesPayload.length > 0) {
        const res = await guardarCambiosListadoProductos({
          productos: existentes,
          presentaciones: presentacionesPayload,
          motivo: 'edicion_listado',
        });
        if (res?.error) throw new Error(res.msg || 'No se pudieron guardar los cambios');
      }

      addNotification({ type: 'success', message: `✓ Cambios guardados` });
      setProductoEdit({});
      setPresentacionEdit({});
      setFilaEditandoId(null);
      await cargarProductos({ force: true });
    } catch (e) {
      console.error(e);
      addNotification({ type: 'error', message: `✗ ${e?.message || 'Error guardando cambios'}` });
    }
  }, [hayCambios, editsProductos, editsPresentaciones, addNotification, cargarProductos, setProductoEdit, setPresentacionEdit]);

  useEffect(() => {
    if (!copyMenuOpen) return;
    const onMouseDown = (e) => {
      if (!copyMenuRef.current) return;
      if (!copyMenuRef.current.contains(e.target)) setCopyMenuOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [copyMenuOpen]);

  useEffect(() => {
    if (!searchMenuOpen) return;
    const onMouseDown = (e) => {
      if (!searchMenuRef.current) return;
      if (!searchMenuRef.current.contains(e.target)) setSearchMenuOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [searchMenuOpen]);

  useEffect(() => {
    if (!columnsMenuOpen) return;
    const onMouseDown = (e) => {
      if (!columnsMenuRef.current) return;
      if (!columnsMenuRef.current.contains(e.target)) setColumnsMenuOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [columnsMenuOpen]);

  const productoPorId = useMemo(() => {
    const map = new Map();
    for (const p of productos) map.set(p.id, p);
    return map;
  }, [productos]);

  const handleEliminarProducto = async (producto) => {
    console.log('[CLIENTE] userName:', userName);
    await alertaBorrarProducto(producto, async () => {
      console.log('[CLIENTE] Antes de eliminar, userName:', userName);
      const resultado = await eliminarProductoConPreciosPorId(producto.id, userName);
      console.log('[CLIENTE] Resultado:', resultado);
      
      if (!resultado.error && resultado.undoData) {
        addNotification({
          type: 'success',
          message: `✓ ${producto.nombre} eliminado`,
          action: {
            label: '↶ Deshacer',
            onClick: async () => {
              const undoResult = await restaurarProducto(resultado.undoData);
              if (undoResult.success) {
                addNotification({
                  type: 'success',
                  message: `✓ ${resultado.undoData.nombre} restaurado`,
                });
                cargarProductos({ force: true });
              } else {
                addNotification({
                  type: 'error',
                  message: `✗ Error al restaurar: ${undoResult.error}`,
                });
              }
            }
          }
        });
      }
    });
    cargarProductos({ force: true });
  };

  const handleSearchFilterNavigateNext = () => {
    categoryFilterRef.current?.focus();
  };

  const limpiarSeleccion = () => {
    setProductosSeleccionados([]);
  };

  const toggleCampoCopiado = (campo) => {
    setSearchFields_local((prev) => {
      const next = { ...prev, [campo]: !prev[campo] };
      const algunoSeleccionado = Object.values(next).some(Boolean);
      if (!algunoSeleccionado) return { ...next, nombre: true };
      return next;
    });
  };

  const formatearLineaCopiado = (prod) => {
    if (!prod) return '';

    const partes = [];
    if (searchFields_local.nombre) partes.push(prod.nombre);
    if (searchFields_local.codigoBarra) partes.push(prod.codigoBarra ? `(${prod.codigoBarra})` : '');
    if (searchFields_local.precio) {
      const precio = prod.precios?.[0]?.precio;
      partes.push(typeof precio === 'number' ? `$${precio.toLocaleString()}` : '');
    }
    if (searchFields_local.categoria) partes.push(prod.categorias?.[0]?.nombre);
    if (searchFields_local.tamano) partes.push((prod.size ?? 0).toString());
    if (searchFields_local.unidad) partes.push(prod.unidad);
    if (searchFields_local.descripcion) partes.push(prod.descripcion);

    return partes
      .map((p) => (p ?? '').toString().trim())
      .filter(Boolean)
      .join(' ');
  };

  const copiarSeleccionados = () => {
    const datos = productosSeleccionados
      .map((id) => formatearLineaCopiado(productos.find((p) => p.id === id)))
      .filter(Boolean)
      .join('\n');
    navigator.clipboard.writeText(datos)
      .then(() => {
        showError('Productos copiados al portapapeles');
      })
      .catch(() => {
        showError('No se pudo copiar al portapapeles');
      });
  };

  const filasEnPagina = useMemo(() => {
    const list = Array.isArray(productosEnPagina) ? productosEnPagina : [];
    const rows = [];
    for (const p of list) {
      if (!p?.id) continue;
      rows.push({ id: p.id, selectId: p.id, tipo: 'producto', productoId: p.id });
      const presentaciones = Array.isArray(p?.presentaciones) ? p.presentaciones : [];
      for (const pres of presentaciones) {
        if (!pres?.id) continue;
        if (pres?.esUnidadBase) continue; // obviar base en navegación/lista
        rows.push({
          id: `${p.id}::pres::${pres.id}`,
          selectId: p.id,
          tipo: 'presentacion',
          productoId: p.id,
          presentacionId: pres.id,
        });
      }
    }
    return rows;
  }, [productosEnPagina]);

  const {
    productoFocused,
    setProductoFocused,
    productosSeleccionados,
    setProductosSeleccionados,
    toggleProductoSeleccionado,
    handleInputKeyDown,
    handleProductoKeyDown,
    handleTableWheel,
  } = useKeyboard({
    itemsOrdenados: filasEnPagina,
    pagina,
    perPageEsAll: perPage === 'all',
    perPageNum: perPage === 'all' ? Math.max(totalFiltrados, 1) : Number(perPage) || 5,
    totalPaginas,
    setPagina,
    inputBusquedaRef,
    categoryFilterRef,
    filaProductoRef,
    tablaRef,
    onCopySelected: () => {
      copiarSeleccionados();
    },
    scopeRef,
  });

  const todosSeleccionados = useMemo(() => {
    if (productosFiltrados.length === 0) return false;
    return productosFiltrados.every((p) => productosSeleccionados.includes(p.id));
  }, [productosFiltrados, productosSeleccionados]);

  const idsDeTodosLosProductos = useMemo(
    () => productosFiltrados.map((p) => p.id).filter(Boolean),
    [productosFiltrados]
  );

  const agregarNuevoProductoEnTabla = useCallback(() => {
    const tempId = `__new__${Date.now()}`;
    const nuevo = {
      id: tempId,
      nombre: '',
      codigoBarra: '',
      descripcion: '',
      size: '',
      unidad: '',
      stockSuelto: 0,
      marcaId: '',
      marca: null,
      categorias: [],
      precios: [{ precio: 0 }],
      presentaciones: [],
      proveedores: [],
    };

    setProductos((prev) => [nuevo, ...(Array.isArray(prev) ? prev : [])]);
    setModoEdicionManual(true);
    setFilaEditandoId(tempId);
    setProductoFocused(tempId);
    setProductoEdit((prev) => ({
      ...(prev || {}),
      [tempId]: {
        nombre: '',
        codigoBarra: '',
        descripcion: '',
        size: '',
        unidad: '',
        stockSuelto: 0,
        marcaId: null,
        categoriaId: null,
        precio: 0,
      },
    }));
  }, [setModoEdicionManual, setProductoEdit, setProductoFocused]);

  const agregarPresentacionInline = useCallback(async ({ productoId, nombre, tipoPresentacionId, cantidad, unidadMedida }) => {
    if (!productoId) return;
    try {
      const res = await guardarPresentacion({
        id: '',
        productoId,
        nombre: (nombre ?? '').toString().trim(),
        tipoPresentacionId: String(tipoPresentacionId || ''),
        cantidad: Number(cantidad) || 1,
        unidadMedida: (unidadMedida ?? '').toString().trim(),
        contenidoPorUnidad: null,
        unidadContenido: null,
      });
      if (res?.error) throw new Error(res?.msg || 'No se pudo crear la presentación');
      addNotification({ type: 'success', message: '✓ Presentación agregada' });
      await cargarProductos({ force: true });
    } catch (e) {
      addNotification({ type: 'error', message: `✗ ${e?.message || 'Error agregando presentación'}` });
    }
  }, [addNotification, cargarProductos]);

  const eliminarPresentacionInline = useCallback(async (presentacionId) => {
    if (!presentacionId) return;
    const confirmado = await confirmarEliminacion('¿Eliminar esta presentación?');
    if (!confirmado) return;
    try {
      const res = await eliminarPresentacion(presentacionId);
      if (res?.error) throw new Error(res?.msg || 'No se pudo eliminar la presentación');
      addNotification({ type: 'success', message: '✓ Presentación eliminada' });
      await cargarProductos({ force: true });
    } catch (e) {
      addNotification({ type: 'error', message: `✗ ${e?.message || 'Error eliminando presentación'}` });
    }
  }, [addNotification, cargarProductos]);

  const abrirCajaInline = useCallback(async (presentacionId) => {
    if (!presentacionId) return;
    try {
      const res = await abrirPresentacion({ presentacionId, cantidad: 1 });
      if (res?.error) throw new Error(res?.msg || 'No se pudo abrir la caja');
      addNotification({ type: 'success', message: `✓ Caja abierta` });
      await cargarProductos({ force: true });
    } catch (e) {
      addNotification({ type: 'error', message: `✗ ${e?.message || 'Error abriendo caja'}` });
    }
  }, [addNotification, cargarProductos]);

  const cerrarCajaInline = useCallback(async (presentacionId) => {
    if (!presentacionId) return;
    try {
      // Importación dinámica para evitar aumentar bundle inicial
      const { cerrarPresentacion } = await import('@/prisma/serverActions/stock');
      const res = await cerrarPresentacion({ presentacionId, cantidad: 1 });
      if (res?.error) throw new Error(res?.msg || 'No se pudo cerrar la caja');
      addNotification({ type: 'success', message: `✓ Caja cerrada` });
      await cargarProductos({ force: true });
    } catch (e) {
      addNotification({ type: 'error', message: `✗ ${e?.message || 'Error cerrando caja'}` });
    }
  }, [addNotification, cargarProductos]);

  const cancelarEdicion = useCallback(() => {
    setModoEdicionManual(false);
    setProductoEdit({});
    setPresentacionEdit({});
    setFilaEditandoId(null);
  }, [setModoEdicionManual, setProductoEdit, setPresentacionEdit]);

  const handlePerPageChange = (nuevoPerPage) => {
    setPerPage(nuevoPerPage);
  };

  const goToNextPage = () => {
    if (pagina < totalPaginas) {
      setPagina(pagina + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPrevPage = () => {
    if (pagina > 1) {
      setPagina(pagina - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToFirstPage = () => {
    setPagina(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToLastPage = () => {
    setPagina(totalPaginas);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const numerosPagina = useMemo(() => {
    if (totalPaginas <= 5) return Array.from({ length: totalPaginas }, (_, i) => i + 1);
    const inicio = Math.max(1, pagina - 2);
    const fin = Math.min(totalPaginas, pagina + 2);
    return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
  }, [pagina, totalPaginas]);


  // (UX nueva) Se dejó de usar el expand/celdas editables por click.

  const HeaderConPaginacion = ({ icono, titulo }) => (
    <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        {/* Izquierda: Título */}
        <div className="flex items-center whitespace-nowrap gap-2">
          <Icon icono={icono} className="text-gray-600 text-base" />
          <h2 className="text-base font-medium text-gray-900">{titulo}</h2>
        </div>

        {/* Derecha: Paginación */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Botones de navegación */}
          <div className="flex items-center gap-1">
            <button
              onClick={goToFirstPage}
              disabled={pagina === 1}
              className="px-2 py-1 text-sm font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Primera página"
            >
              ⏮
            </button>
            <button
              onClick={goToPrevPage}
              disabled={pagina === 1}
              className="px-2 py-1 text-sm font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Página anterior"
            >
              ←
            </button>
          </div>

          {/* Números de página */}
          <div className="flex items-center gap-1">
            {numerosPagina.map(num => (
              <button
                key={num}
                onClick={() => setPagina(num)}
                className={`px-2.5 py-1 text-sm font-medium rounded border ${
                  pagina === num
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {num}
              </button>
            ))}
          </div>

          {/* Botones de navegación (siguiente/última) */}
          <div className="flex items-center gap-1">
            <button
              onClick={goToNextPage}
              disabled={pagina === totalPaginas}
              className="px-2 py-1 text-sm font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Página siguiente"
            >
              →
            </button>
            <button
              onClick={goToLastPage}
              disabled={pagina === totalPaginas}
              className="px-2 py-1 text-sm font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Última página"
            >
              ⏭
            </button>
          </div>

          {/* Indicador de página */}
          <span className="text-sm text-gray-600 whitespace-nowrap">
            {pagina}/{totalPaginas}
          </span>

          {/* Selector de cantidad */}
          <select
            value={perPage}
            onChange={(e) => handlePerPageChange(e.target.value)}
            className="px-2 py-1 text-sm border border-gray-300 rounded text-gray-900 bg-white hover:bg-gray-50"
          >
            {['5', '10', '25', '50', '100', 'all'].map((v) => (
              <option key={v} value={v}>{v === 'all' ? 'Todos' : v}</option>
            ))}
          </select>

          {/* Contador */}
          <span className="text-sm text-gray-600 whitespace-nowrap">
            {productosEnPagina.length} de {totalFiltrados}
          </span>

          {/* Toggle de vista */}
          <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg p-1">
            <button
              onClick={() => setVistaTipo('lista')}
              className={`px-2.5 py-1 rounded text-sm font-medium transition-colors ${
                vistaTipo === 'lista'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              title="Vista de lista"
            >
              <Icon icono="list" className="text-base" />
            </button>
            <button
              onClick={() => setVistaTipo('cuadricula')}
              className={`px-2.5 py-1 rounded text-sm font-medium transition-colors ${
                vistaTipo === 'cuadricula'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              title="Vista de cuadrícula"
            >
              <Icon icono="th" className="text-base" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Componente para vista de lista moderna
  const VistaLista = () => {
    // Función auxiliar para renderizar header con ordenamiento
    const HeaderColumna = ({ columna, children }) => {
      const esActivo = ordenamiento.columna === columna;
      return (
        <th 
          onClick={() => handleOrdenar(columna)}
          className="px-3 py-2 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
        >
          <div className="flex items-center gap-1 whitespace-nowrap">
            {children}
            {esActivo && (
              <span className="text-gray-900 font-bold text-lg">
                {ordenamiento.direccion === 'asc' ? '▲' : '▼'}
              </span>
            )}
          </div>
        </th>
      );
    };

    return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="sticky top-0 z-30 bg-white">
        {/* Header con paginación */}
        <HeaderConPaginacion icono="list" titulo="Vista de Lista" />

        {/* Alta rápida en tabla */}
        <div className="px-4 py-2 border-b border-gray-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={agregarNuevoProductoEnTabla}
                className="px-3 py-2 text-sm font-medium rounded bg-gray-800 text-white hover:bg-gray-900"
                title="Crear producto nuevo como renglón editable"
              >
                Nuevo producto
              </button>
            </div>
            <div className="text-xs text-gray-500">
              Completá el renglón nuevo y tocá Guardar cambios.
            </div>
          </div>
        </div>

        {/* Modo + Guardar general */}
        <div className="px-4 py-2 border-b border-gray-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {productosSeleccionados.length > 0 && (
              <>
                <div className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  {productosSeleccionados.length} seleccionado{productosSeleccionados.length !== 1 ? 's' : ''}
                </div>
                <div ref={copyMenuRef} className="relative">
                  <div className="flex">
                    <button
                      onClick={copiarSeleccionados}
                      className="px-3 py-2 text-sm font-medium rounded-l bg-gray-200 text-gray-900 hover:bg-gray-300 transition-colors flex items-center gap-1"
                      title="Copiar selección"
                    >
                      <Icon icono="copy" className="text-sm" />
                      Copiar
                    </button>
                    <button
                      onClick={() => setCopyMenuOpen((v) => !v)}
                      className="px-2 py-2 text-sm font-medium rounded-r bg-gray-200 text-gray-900 hover:bg-gray-300 transition-colors border-l border-gray-300"
                      title="Opciones de copia"
                      aria-expanded={copyMenuOpen}
                    >
                      ▾
                    </button>
                    <button
                      onClick={limpiarSeleccion}
                      className="ml-2 px-3 py-2 text-sm font-medium rounded bg-gray-200 text-gray-900 hover:bg-gray-300 transition-colors flex items-center gap-1"
                      title="Limpiar selección"
                    >
                      <Icon icono="times" className="text-sm" />
                      Limpiar
                    </button>
                  </div>

                  {copyMenuOpen && (
                    <div className="absolute left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-sm p-2 z-20">
                      <div className="text-sm font-medium text-gray-700 px-1 pb-2">
                        Campos a copiar
                      </div>

                      <div className="space-y-2">
                        {[
                          { key: 'nombre', label: 'Nombre' },
                          { key: 'codigoBarra', label: 'Código de barras' },
                          { key: 'precio', label: 'Precio' },
                          { key: 'categoria', label: 'Categoría' },
                          { key: 'tamano', label: 'Tamaño' },
                          { key: 'unidad', label: 'Unidad' },
                          { key: 'descripcion', label: 'Descripción' },
                        ].map(({ key, label }) => (
                          <label key={key} className="flex items-center gap-2 text-sm text-gray-700 px-1 select-none">
                            <input
                              type="checkbox"
                              checked={!!searchFields_local[key]}
                              onChange={() => toggleCampoCopiado(key)}
                              className="w-4 h-4"
                            />
                            {label}
                          </label>
                        ))}
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => {
                            copiarSeleccionados();
                            setCopyMenuOpen(false);
                          }}
                          className="px-3 py-1 text-sm font-medium rounded bg-gray-800 text-white hover:bg-gray-900 transition-colors"
                          title="Copiar con estos campos"
                        >
                          Copiar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div ref={columnsMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setColumnsMenuOpen((v) => !v)}
                className="px-3 py-2 text-sm font-medium rounded border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
                title="Elegir columnas"
                aria-expanded={columnsMenuOpen}
              >
                Columnas ▾
              </button>
              {columnsMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-sm p-2 z-20">
                  <div className="text-sm font-medium text-gray-700 px-1 pb-2">Mostrar</div>
                  {(
                    [
                      { key: 'codigo', label: 'Código' },
                      { key: 'categoria', label: 'Categoría' },
                      { key: 'tamano', label: 'Tamaño' },
                      { key: 'precio', label: 'Precio' },
                      { key: 'stock', label: 'Stock' },
                    ]
                  ).map((c) => {
                    const disabled = c.key === 'codigo' && !mostrarCodigo;
                    const checked = Boolean(columnasVisibles?.[c.key]) && !disabled;
                    return (
                      <label
                        key={c.key}
                        className={`flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={(e) => {
                            const next = e.target.checked;
                            setColumnasVisibles((prev) => ({ ...(prev || {}), [c.key]: next }));
                          }}
                        />
                        <span className="text-sm text-gray-700">{c.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (!modoEdicionManual) {
                  setModoEdicionManual(true);
                  return;
                }
                if (!hayCambios) {
                  cancelarEdicion();
                  return;
                }
                guardarCambios();
              }}
              disabled={guardandoCambios}
              className="px-3 py-2 text-sm font-medium rounded bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!modoEdicionManual ? 'Entrar en modo edición' : (!hayCambios ? 'Cancelar edición' : 'Guardar')}
            >
              {guardandoCambios
                ? 'Guardando…'
                : (!modoEdicionManual ? 'Editar' : (hayCambios ? 'Guardar' : 'Cancelar'))}
            </button>

            {modoEdicionManual && hayCambios && (
              <button
                type="button"
                onClick={cancelarEdicion}
                className="px-3 py-2 text-sm font-medium rounded border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
                title="Descartar cambios y salir"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table ref={tablaRef} onWheel={handleTableWheel} className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 w-12 sticky left-0 bg-gray-50 z-10">
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={todosSeleccionados}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setProductosSeleccionados(idsDeTodosLosProductos);
                      } else {
                        setProductosSeleccionados([]);
                      }
                    }}
                    className="w-4 h-4 cursor-pointer"
                    title="Seleccionar todos"
                  />
                </div>
              </th>
              <HeaderColumna columna="nombre">
                <span className="min-w-0 flex-1">Producto</span>
              </HeaderColumna>
              {mostrarCodigo && columnasVisibles.codigo && (
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 w-32">
                  Código
                </th>
              )}
              {columnasVisibles.categoria && (
                <HeaderColumna columna="categoria">
                  <span className="w-40">Categoría</span>
                </HeaderColumna>
              )}
              {columnasVisibles.tamano && (
                <HeaderColumna columna="tamaño">
                  <span className="w-32">Tamaño</span>
                </HeaderColumna>
              )}
              {columnasVisibles.precio && (
                <HeaderColumna columna="precio">
                  <span className="w-32">Precio</span>
                </HeaderColumna>
              )}
              {columnasVisibles.stock && (
                <HeaderColumna columna="stock">
                  <span className="w-24 text-center">Stock</span>
                </HeaderColumna>
              )}
              <th className="px-3 py-2 text-center text-sm font-semibold text-gray-700 w-40 sticky right-0 bg-gray-50 z-10">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {productosEnPagina.map((producto) => (
              <ProductoFila
                key={producto.id}
                producto={producto}
                editable={modoEdicionManual}
                activeRowId={filaEditandoId}
                onSetActiveRowId={setFilaEditandoId}
                marcasOptions={marcasOptions}
                categoriasOptions={categoriasOptions}
                tiposPresentacionOptions={tiposPresentacionOptions}
                editsProductos={editsProductos}
                editsPresentaciones={editsPresentaciones}
                searchFields={searchFields}
                mostrarCodigo={mostrarCodigo}
                columnasVisibles={columnasVisibles}
                onSetProductoEdit={setProductoEdit}
                onSetPresentacionEdit={setPresentacionEdit}
                onAgregarPresentacion={agregarPresentacionInline}
                onEliminarPresentacion={eliminarPresentacionInline}
                onAbrirCaja={abrirCajaInline}
                onCerrarCaja={cerrarCajaInline}
                onEliminarProducto={handleEliminarProducto}
                onToggleSeleccion={toggleProductoSeleccionado}
                esSeleccionado={productosSeleccionados.includes(producto.id)}
                focusedRowId={productoFocused}
                onSetFocused={setProductoFocused}
                filaProductoRef={filaProductoRef}
                onKeyDown={handleProductoKeyDown}
                calcularStockEquivalente={calcularStockEquivalente}
                presentacionSeleccionadaPorProducto={presentacionSeleccionadaPorProducto}
                onSetPresentacionSeleccionada={(id, presentacionId) => {
                  setPresentacionSeleccionadaPorProducto((prev) => ({ ...prev, [id]: presentacionId }));
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
    );
  };

  // Componente para vista de cuadrícula
  const VistaCuadricula = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header con paginación */}
      <HeaderConPaginacion icono="th" titulo="Vista de Cuadrícula" />

      {/* Grid de productos */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {productosEnPagina.map((producto) => {
            const { stockSuelto, equivalenteDesdePresentaciones, totalEquivalente, baseId } = calcularStockEquivalente(producto);
            const presentacionesNoBase = (producto.presentaciones || []).filter((p) => p?.id && p.id !== baseId);
            const basePresentacion = (producto.presentaciones || []).find((p) => p?.id === baseId);

            return (
            <div key={producto.id} className="bg-gray-50 rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
              {/* Imagen del producto */}
              <div className="bg-gray-200 relative w-full h-48">
                <ImageWithFallback
                  src={producto.imagen}
                  alt={producto.nombre}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Contenido del producto */}
              <div className="p-4">
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <h3 className="text-base font-semibold text-gray-900 line-clamp-2">
                      {searchFields.nombre ? (
                        <HighlightMatch text={producto.nombre} filter={busquedaInput} highlightClass="bg-green-200 rounded px-0.5" />
                      ) : (
                        producto.nombre
                      )}
                    </h3>
                    <span className="bg-gray-100 text-gray-800 text-sm font-medium px-1.5 py-0.5 rounded flex-shrink-0">
                      {searchFields.codigoBarra ? (
                        <HighlightMatch text={producto.codigoBarra} filter={busquedaInput} highlightClass="bg-green-200 rounded px-0.5" />
                      ) : (
                        producto.codigoBarra
                      )}
                    </span>
                  </div>

                  {producto.descripcion && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {searchFields.descripcion ? (
                        <HighlightMatch text={producto.descripcion} filter={busquedaInput} highlightClass="bg-green-200 rounded px-0.5" />
                      ) : (
                        producto.descripcion
                      )}
                    </p>
                  )}

                  {/* Información técnica */}
                  <div className="space-y-1 mb-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Tamaño:</span>
                      <span className="font-medium">{producto.size || 0} {producto.unidad}</span>
                    </div>

                    {producto.precios && producto.precios[0] && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Precio:</span>
                        <span className="font-bold text-green-600">
                          ${producto.precios[0].precio.toLocaleString()}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Stock:</span>
                      <span className="flex items-center">
                        <span className={`font-medium ${totalEquivalente < 10 ? 'text-red-600' : 'text-gray-900'}`}>
                          {totalEquivalente}
                        </span>
                        {totalEquivalente < 10 && (
                          <Icon icono="exclamation-triangle" className="text-red-600 ml-1 text-sm" />
                        )}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center justify-between">
                      <span>Suelto: {stockSuelto}</span>
                      <span>Pres.: +{equivalenteDesdePresentaciones}</span>
                    </div>
                  </div>

                  {Boolean(CONTROL_PANEL?.productos?.listado?.presentacionesAbiertasPorDefecto) && (
                    <div className="mt-3 border-t border-gray-200 pt-3">
                      <div className="text-xs font-medium text-gray-700 mb-2">
                        Presentaciones
                        {basePresentacion?.nombre ? (
                          <span className="text-gray-500 font-normal"> · Base: {basePresentacion.nombre}</span>
                        ) : (
                          <span className="text-red-600 font-normal"> · Falta base</span>
                        )}
                      </div>
                      {presentacionesNoBase.length === 0 ? (
                        <div className="text-xs text-gray-500">Sin presentaciones adicionales</div>
                      ) : (
                        <div className="space-y-1">
                          {presentacionesNoBase.slice(0, 4).map((p) => {
                            const stockCerrado = getStockCerradoPresentacion(p);
                            const factor = baseId ? calcularFactorAUnidadBase(producto, p.id, baseId) : null;
                            const eq = Number.isFinite(factor) && factor != null ? Math.round(stockCerrado * factor) : null;
                            return (
                              <div key={p.id} className="flex items-center justify-between text-xs">
                                <span className="text-gray-700 truncate pr-2">{p.nombre}</span>
                                <span className="text-gray-600">{stockCerrado} ({eq == null ? '—' : eq})</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Categorías */}
                  {producto.categorias && producto.categorias.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {producto.categorias.slice(0, 2).map((categoria) => (
                        <span
                          key={categoria.id}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-sm font-medium bg-gray-200 text-gray-800"
                        >
                          {categoria.nombre}
                        </span>
                      ))}
                      {producto.categorias.length > 2 && (
                        <span className="text-sm text-gray-500">+{producto.categorias.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex gap-1.5">
                  <BotonAgregarPedido
                    producto={producto}
                    variant="outline"
                    size="xs"
                    onSuccess={() => {}}
                  />

                  <Link
                    href={`/cargarProductos?edit=${producto.id}`}
                    className="flex-1 p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded text-center text-sm transition-colors"
                    title="Editar producto"
                  >
                    <Icon icono="editar" className="text-base" />
                  </Link>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEliminarProducto(producto);
                    }}
                    className="flex-1 p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded text-center text-sm transition-colors"
                    title="Eliminar producto"
                  >
                    <Icon icono="trash-can" className="text-base" />
                  </button>
                </div>
              </div>
            </div>
          );
          })}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={`${modoCompacto ? 'bg-gray-50 pt-2 pb-6' : 'min-h-screen bg-gray-50 pt-4 pb-12'}`}>
        <div className="container mx-auto max-w-7xl px-2">
          {!modoCompacto && (
            <div className="mb-4">
              <div className="h-10 w-48 bg-gray-300 rounded animate-pulse mb-4"></div>
              <div className="h-5 w-64 bg-gray-200 rounded animate-pulse mb-4"></div>
            </div>
          )}
          <div className="mb-4">
            <div className="h-16 bg-gray-200 rounded animate-pulse"></div>
          </div>
          {vistaTipo === 'cuadricula' ? <ProductGridPlaceholder count={8} /> : <ProductListPlaceholder count={5} />}
        </div>
      </div>
    );
  }

  return (
    <div ref={scopeRef} className={`${modoCompacto ? 'bg-gray-50 pt-2 pb-6' : 'min-h-screen bg-gray-50 pt-4 pb-12'}`}>
      <div className="container mx-auto max-w-7xl px-2">
        {/* Header */}
        <div className={`${modoCompacto ? 'mb-3' : 'mb-4'}`}>
          {!modoCompacto && (
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <Icon icono="box" className="text-gray-600 mr-3 text-3xl" />
                  Catálogo de Productos
                </h1>
                <p className="text-gray-600 mt-2">
                  {totalFiltrados} de {productos.length} productos
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setVistaTipo('lista');
                    agregarNuevoProductoEnTabla();
                  }}
                  className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors flex items-center"
                  title="Crear producto nuevo como renglón editable"
                >
                  <Icon icono="plus" className="mr-2" />
                  Nuevo Producto
                </button>
                <Link
                  href="/"
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  ← Volver al Dashboard
                </Link>
              </div>
            </div>
          )}

          <div className={`flex ${modoCompacto ? 'justify-end' : 'items-center justify-between'}`}>
            {!modoCompacto && (
              <div className="text-sm text-gray-600">
                {totalFiltrados} producto{totalFiltrados !== 1 ? 's' : ''} encontrado{totalFiltrados !== 1 ? 's' : ''}
              </div>
            )}
            <div className="flex items-center space-x-3">
              {/* Toggle Vista */}
              <div className="bg-white border border-gray-300 rounded-lg p-1 flex">
                <button
                  onClick={() => setVistaTipo('lista')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                    vistaTipo === 'lista'
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon icono="list" className="mr-2 text-sm" />
                  Lista
                </button>
                <button
                  onClick={() => setVistaTipo('cuadricula')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                    vistaTipo === 'cuadricula'
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon icono="th" className="mr-2 text-sm" />
                  Cuadrícula
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <input
                ref={inputBusquedaRef}
                type="text"
                autoFocus
                placeholder="Buscar en campos seleccionados... (↓ para navegar)"
                value={busquedaInput}
                onChange={(e) => {
                  setBusquedaInput(e.target.value);
                  setPagina(1);
                }}
                onKeyDown={(e) => {
                  handleInputKeyDown(e);
                  if (e.key === 'Escape') {
                    setBusquedaInput('');
                    e.currentTarget.blur();
                    setPagina(1);
                  }
                }}
                className="
                  appearance-none
                  text-left
                  text-lg
                  text-gray-900
                  block w-full
                  px-2.5 pt-5 pb-2 pr-10
                  h-[56px]
                  border-0 border-b-2 border-gray-300
                  bg-transparent
                  focus:outline-none focus:ring-0
                  focus:border-slate-400 peer
                  transition-all duration-500 ease-in-out
                  placeholder:text-gray-500
                "
                title="Teclas: ↓ para navegar, Esc para limpiar"
              />

              <button
                type="button"
                onClick={() => setSearchMenuOpen((v) => !v)}
                className="absolute right-2 top-4 px-2 py-1 text-sm font-medium rounded bg-gray-200 text-gray-900 hover:bg-gray-300 transition-colors"
                title="Opciones de búsqueda"
                aria-expanded={searchMenuOpen}
              >
                ▾
              </button>

              {searchMenuOpen && (
                <div
                  ref={searchMenuRef}
                  className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-sm p-2 z-20"
                >
                  <div className="text-sm font-medium text-gray-700 px-1 pb-2">
                    Campos incluidos en la búsqueda
                  </div>

                  <div className="space-y-2">
                    {[
                      { key: 'nombre', label: 'Nombre' },
                      { key: 'marca', label: 'Marca' },
                      { key: 'codigoBarra', label: 'Código' },
                      { key: 'descripcion', label: 'Descripción' },
                      { key: 'categoria', label: 'Categoría' },
                      { key: 'tamano', label: 'Tamaño' },
                      { key: 'unidad', label: 'Unidad' },
                      { key: 'precio', label: 'Precio' },
                      { key: 'stock', label: 'Stock' },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 text-sm text-gray-700 px-1 select-none">
                        <input
                          type="checkbox"
                          checked={!!searchFields[key]}
                          onChange={() => toggleCampoBusqueda(key)}
                          className="w-4 h-4"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <label className="
                absolute left-0 transition-all duration-500 ease-in-out px-2.5
                text-base font-medium top-0.5 text-black
              ">
                Buscar producto
              </label>
            </div>
            <div>
              <FilterSelect
                ref={categoryFilterRef}
                size="kiosk"
                options={Array.from(new Set(
                  productos.flatMap((p) => p.categorias?.map((c) => c.nombre) || [])
                )).filter(Boolean).sort((a, b) => a.localeCompare(b, 'es')).map((cat) => ({ id: cat, nombre: cat }))}
                value={categoriaFiltro}
                valueField="id"
                textField="nombre"
                label="Filtrar por categoría"
                placeholder="Todas las categorías"
                onChange={(e) => {
                  setCategoriaFiltro(e?.value || '');
                  setPagina(1);
                }}
                onClear={() => {
                  setCategoriaFiltro('');
                  setPagina(1);
                }}
                onNavigateNext={handleSearchFilterNavigateNext}
                onNavigatePrev={() => {}}
              />
            </div>
          </div>
        </div>

        {/* Lista de productos */}
        {productosFiltrados.length > 0 ? (
          vistaTipo === 'cuadricula' ? <VistaCuadricula /> : <VistaLista />
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Icon icono="search" className="text-6xl mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No se encontraron productos
            </h3>
            <p className="text-gray-600 mb-6">
              No hay productos que coincidan con tu búsqueda.
            </p>
            <button
              onClick={() => {
                setBusquedaInput('');
                setCategoriaFiltro('');
                setPagina(1);
              }}
              className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              <Icon icono="times" className="mr-2" />
              Limpiar filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListadoProductosModerno;
