"use client"
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import debounce from '@/lib/debounce';
import { useKeyboard } from '@/hooks/useKeyboard';
import { getProductos } from '@/prisma/consultas/productos';
import { eliminarProductoConPreciosPorId } from '@/prisma/serverActions/productos';
import { restaurarProducto } from '@/prisma/serverActions/undo';
import { alertaBorrarProducto } from '../alertas/alertaBorrarProducto';
import { useNotification } from '@/context/NotificationContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import Link from 'next/link';
import Icon from '../formComponents/Icon';
import FilterSelect from '../formComponents/FilterSelect';
import BotonAgregarPedido from '../pedidos/BotonAgregarPedido';
import ImageWithFallback from '../ui/ImageWithFallback';
import { useErrorNotification } from '@/hooks/useErrorNotification';
import ProductListPlaceholder from './ProductListPlaceholder';
import ProductGridPlaceholder from './ProductGridPlaceholder';
import HighlightMatch from '../HiglightMatch';

const normalizarTexto = (value) => (value ?? '').toString().trim().toLowerCase();

const ListadoProductosModerno = ({ mostrarCodigo = true, modoCompacto = false }) => {
  const { showError } = useErrorNotification();
  const { userName } = useCurrentUser();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busquedaInput, setBusquedaInput] = useState('');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [vistaTipo, setVistaTipo] = useState('lista');
  const [pagina, setPagina] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [categoriasUnicas, setCategoriasUnicas] = useState([]);
  const [ordenamiento, setOrdenamiento] = useState({ columna: null, direccion: 'asc' });

  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const [searchFields, setSearchFields] = useState({
    nombre: true,
    codigoBarra: true,
    descripcion: true,
    categoria: true,
    tamano: true,
    unidad: true,
    precio: true,
    stock: true,
  });

  const [copyMenuOpen, setCopyMenuOpen] = useState(false);
  const [copyFields, setCopyFields] = useState({
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
  const scopeRef = useRef(null);

  const cargarProductos = useCallback(async () => {
    try {
      setLoading(true);
      const { productos: productosData = [] } = await getProductos({ take: 10000 }) || {};
      const lista = Array.isArray(productosData) ? productosData : [];
      setProductos(lista);
      setTotal(lista.length);

      // Derivar categorías desde el mismo fetch (evita duplicar requests)
      const cats = [...new Set(
        lista.flatMap((p) => p.categorias?.map((c) => c.nombre) || [])
      )]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'es'));
      setCategoriasUnicas(cats);
    } catch (error) {
      console.error('Error cargando productos:', error);
      setProductos([]);
      setTotal(0);
      setCategoriasUnicas([]);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const toggleCampoBusqueda = useCallback((key) => {
    setSearchFields((prev) => ({ ...prev, [key]: !prev[key] }));
    setPagina(1);
  }, []);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  // Debounce de búsqueda (evita recalcular filtros/orden en cada tecla)
  useEffect(() => {
    const debounced = debounce((value) => {
      setBusquedaProducto(value);
    }, 250);

    debounced(busquedaInput);

    return () => {
      debounced.cancel?.();
    };
  }, [busquedaInput]);

  const handleOrdenar = useCallback((columna) => {
    setOrdenamiento((prev) => {
      const direccion = prev.columna === columna && prev.direccion === 'asc' ? 'desc' : 'asc';
      return { columna, direccion };
    });
    setPagina(1);
  }, []);

  const productosFiltrados = useMemo(() => {
    const q = normalizarTexto(busquedaProducto);
    const tokens = q.split(/\s+/).filter(Boolean);
    if (tokens.length === 0 && !categoriaFiltro) return productos;

    return productos.filter((producto) => {
      const coincideCategoria = !categoriaFiltro || producto.categorias?.some((c) => c.nombre === categoriaFiltro);
      if (!coincideCategoria) return false;
      if (tokens.length === 0) return true;

      const nombre = normalizarTexto(producto.nombre);
      const descripcion = normalizarTexto(producto.descripcion);
      const codigo = normalizarTexto(producto.codigoBarra);

      const categorias = Array.isArray(producto.categorias)
        ? producto.categorias.map((c) => normalizarTexto(c?.nombre)).filter(Boolean).join(' ')
        : '';
      const tamano = normalizarTexto(producto.size);
      const unidad = normalizarTexto(producto.unidad);

      const precioRaw = producto.precios?.[0]?.precio;
      const precioNumero = precioRaw == null ? '' : String(precioRaw);
      const precioLocale =
        typeof precioRaw === 'number'
          ? String(precioRaw.toLocaleString()).toLowerCase()
          : '';

      // "Stock" hoy se representa con size.
      const stock = tamano;

      const partes = [];
      if (searchFields.nombre) partes.push(nombre);
      if (searchFields.descripcion) partes.push(descripcion);
      if (searchFields.codigoBarra) partes.push(codigo);
      if (searchFields.categoria) partes.push(categorias);
      if (searchFields.tamano) partes.push(tamano);
      if (searchFields.unidad) partes.push(unidad);
      if (searchFields.precio) partes.push(precioNumero, precioLocale);
      if (searchFields.stock) partes.push(stock);

      const searchable = partes.filter(Boolean).join(' ');
      return tokens.every((t) => searchable.includes(t));
    });
  }, [productos, busquedaProducto, categoriaFiltro, searchFields]);

  const productosOrdenados = useMemo(() => {
    if (!ordenamiento.columna) return productosFiltrados;

    const dir = ordenamiento.direccion === 'asc' ? 1 : -1;
    const col = ordenamiento.columna;
    return [...productosFiltrados].sort((a, b) => {
      let valorA;
      let valorB;

      switch (col) {
        case 'nombre':
          valorA = normalizarTexto(a.nombre);
          valorB = normalizarTexto(b.nombre);
          break;
        case 'categoria':
          valorA = normalizarTexto(a.categorias?.[0]?.nombre);
          valorB = normalizarTexto(b.categorias?.[0]?.nombre);
          break;
        case 'tamaño':
          valorA = a.size || 0;
          valorB = b.size || 0;
          break;
        case 'precio':
          valorA = a.precios?.[0]?.precio || 0;
          valorB = b.precios?.[0]?.precio || 0;
          break;
        case 'stock':
          // En este proyecto hoy se muestra “stock” con size (no hay campo stock en el modelo)
          valorA = a.size || 0;
          valorB = b.size || 0;
          break;
        default:
          return 0;
      }

      if (valorA < valorB) return -1 * dir;
      if (valorA > valorB) return 1 * dir;
      return 0;
    });
  }, [productosFiltrados, ordenamiento]);

  const totalFiltrados = productosOrdenados.length;
  const perPageEsAll = perPage === 'all';
  const perPageNum = perPageEsAll ? Math.max(totalFiltrados, 1) : Number(perPage) || 5;
  const totalPaginas = perPageEsAll ? 1 : Math.max(1, Math.ceil(totalFiltrados / perPageNum));

  const {
    productoFocused,
    setProductoFocused,
    productosSeleccionados,
    setProductosSeleccionados,
    toggleProductoSeleccionado,
    handleInputKeyDown,
    handleCategoryFilterNavigateNext,
    handleCategoryFilterNavigatePrev,
    handleProductoKeyDown,
    handleTableWheel,
  } = useKeyboard({
    itemsOrdenados: productosOrdenados,
    pagina,
    perPageEsAll,
    perPageNum,
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

  const productosEnPagina = useMemo(() => {
    if (perPageEsAll) return productosOrdenados;
    const inicio = (pagina - 1) * perPageNum;
    return productosOrdenados.slice(inicio, inicio + perPageNum);
  }, [productosOrdenados, pagina, perPageEsAll, perPageNum]);

  const todosSeleccionados = useMemo(() => {
    if (productosOrdenados.length === 0) return false;
    return productosOrdenados.every((p) => productosSeleccionados.includes(p.id));
  }, [productosOrdenados, productosSeleccionados]);

  const idsDeTodosLosProductos = useMemo(
    () => productosOrdenados.map((p) => p.id).filter(Boolean),
    [productosOrdenados]
  );

  const handlePerPageChange = (nuevoPerPage) => {
    setPerPage(nuevoPerPage === 'all' ? 'all' : Number(nuevoPerPage));
    setPagina(1);
  };

  // Si cambian filtros/orden/cantidad y la página queda fuera de rango, corregirla
  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
    if (pagina < 1) setPagina(1);
  }, [pagina, totalPaginas]);

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
  const { addNotification } = useNotification();

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

  const handleEliminarProducto = async (producto) => {
    console.log('[CLIENTE] userName:', userName);
    await alertaBorrarProducto(producto, async () => {
      console.log('[CLIENTE] Antes de eliminar, userName:', userName);
      const resultado = await eliminarProductoConPreciosPorId(producto.id, userName);
      console.log('[CLIENTE] Resultado:', resultado);
      
      if (!resultado.error && resultado.undoData) {
        // Mostrar notificación con opción de deshacer
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
                cargarProductos();
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
    cargarProductos(); // Recargar la lista después de eliminar
  };

  const handleSearchFilterNavigateNext = () => {
    // Tab en el FilterSelect de búsqueda - ir a categorías
    categoryFilterRef.current?.focus();
  };

  const limpiarSeleccion = () => {
    setProductosSeleccionados([]);
  };

  const toggleCampoCopiado = (campo) => {
    setCopyFields((prev) => {
      const next = { ...prev, [campo]: !prev[campo] };
      const algunoSeleccionado = Object.values(next).some(Boolean);
      if (!algunoSeleccionado) return { ...next, nombre: true };
      return next;
    });
  };

  const formatearLineaCopiado = (prod) => {
    if (!prod) return '';

    const partes = [];
    if (copyFields.nombre) partes.push(prod.nombre);
    if (copyFields.codigoBarra) partes.push(prod.codigoBarra ? `(${prod.codigoBarra})` : '');
    if (copyFields.precio) {
      const precio = prod.precios?.[0]?.precio;
      partes.push(typeof precio === 'number' ? `$${precio.toLocaleString()}` : '');
    }
    if (copyFields.categoria) partes.push(prod.categorias?.[0]?.nombre);
    if (copyFields.tamano) partes.push((prod.size ?? 0).toString());
    if (copyFields.unidad) partes.push(prod.unidad);
    if (copyFields.descripcion) partes.push(prod.descripcion);

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

  // Componente para vista de lista moderna
  const VistaLista = () => {
    // Función auxiliar para renderizar header con ordenamiento
    const HeaderColumna = ({ columna, children }) => {
      const esActivo = ordenamiento.columna === columna;
      return (
        <th 
          onClick={() => handleOrdenar(columna)}
          className="px-3 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-1 whitespace-nowrap">
            {children}
            {esActivo && (
              <span className="text-gray-700 font-bold">
                {ordenamiento.direccion === 'asc' ? '▲' : '▼'}
              </span>
            )}
          </div>
        </th>
      );
    };

    return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Barra de selección múltiple */}
      {productosSeleccionados.length > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-blue-900">
              {productosSeleccionados.length} producto{productosSeleccionados.length !== 1 ? 's' : ''} seleccionado{productosSeleccionados.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div ref={copyMenuRef} className="relative">
              <div className="flex">
                <button
                  onClick={copiarSeleccionados}
                  className="px-3 py-1 text-sm font-medium rounded-l bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1"
                  title="Copiar al portapapeles"
                >
                  <Icon icono="copy" className="text-sm" />
                  Copiar
                </button>
                <button
                  onClick={() => setCopyMenuOpen((v) => !v)}
                  className="px-2 py-1 text-sm font-medium rounded-r bg-blue-600 text-white hover:bg-blue-700 transition-colors border-l border-blue-700"
                  title="Opciones de copia"
                  aria-expanded={copyMenuOpen}
                >
                  ▾
                </button>
              </div>

              {copyMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-sm p-2 z-20">
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
                          checked={!!copyFields[key]}
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
            <button
              onClick={limpiarSeleccion}
              className="px-3 py-1 text-sm font-medium rounded bg-gray-300 text-gray-900 hover:bg-gray-400 transition-colors flex items-center gap-1"
              title="Limpiar selección"
            >
              <Icon icono="times" className="text-sm" />
              Limpiar
            </button>
          </div>
        </div>
      )}
      {/* Header con paginación */}
      <HeaderConPaginacion icono="list" titulo="Vista de Lista" />

      {/* Tabla */}
      <div className="overflow-hidden">
        <table ref={tablaRef} onWheel={handleTableWheel} className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider w-12">
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={todosSeleccionados}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // TODO absoluto: seleccionar todos los productos del listado (no solo la página)
                        setProductosSeleccionados(idsDeTodosLosProductos);
                      } else {
                        // TODO absoluto: limpiar toda la selección
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
              {mostrarCodigo && (
                <th className="px-3 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider w-24">
                  Código
                </th>
              )}
              <HeaderColumna columna="categoria">
                <span className="w-32">Categoría</span>
              </HeaderColumna>
              <HeaderColumna columna="tamaño">
                <span className="w-24">Tamaño</span>
              </HeaderColumna>
              <HeaderColumna columna="precio">
                <span className="w-28">Precio</span>
              </HeaderColumna>
              <HeaderColumna columna="stock">
                <span className="w-24 text-center">Stock</span>
              </HeaderColumna>
              <th className="px-3 py-3 text-center text-sm font-medium text-gray-500 uppercase tracking-wider w-36">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {productosEnPagina.map((producto, indexEnPagina) => (
              <tr
                key={producto.id}
                ref={(el) => { if (el) filaProductoRef.current[producto.id] = el; }}
                tabIndex={0}
                onKeyDown={handleProductoKeyDown}
                onFocus={(e) => {
                  // En React, onFocus burbujea: si el foco es un hijo (checkbox/botón), no queremos "robar" el click.
                  if (e.target !== e.currentTarget) return;
                  setProductoFocused(producto.id);
                }}
                className={`transition-colors cursor-pointer outline-none focus:outline-blue-400 focus:outline-2 ${
                  productoFocused === producto.id
                    ? 'bg-blue-100 border-l-4 border-l-blue-500'
                    : 'hover:bg-gray-50 focus:bg-blue-50'
                } ${productosSeleccionados.includes(producto.id) ? 'bg-green-50' : ''}`}
                onClick={(e) => {
                  // Ignorar clicks en botones, links y otros elementos interactivos
                  const isInteractive = e.target.closest('button, a, input[type="checkbox"]');
                  if (isInteractive) return;
                  
                  setProductoFocused(producto.id);
                  filaProductoRef.current[producto.id]?.focus();
                }}
              >
                <td className="px-3 py-3">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={productosSeleccionados.includes(producto.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleProductoSeleccionado(producto.id);
                      }}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 relative">
                      <ImageWithFallback
                        src={producto.imagen}
                        alt={producto.nombre}
                        fill
                        className="rounded object-cover"
                      />
                    </div>
                    <div className="ml-3">
                      <div className="text-base font-medium text-gray-900 line-clamp-1">
                        {searchFields.nombre ? (
                          <HighlightMatch text={producto.nombre} filter={busquedaProducto} highlightClass="bg-yellow-100 rounded px-0.5" />
                        ) : (
                          producto.nombre
                        )}
                      </div>
                      {producto.descripcion && (
                        <div className="text-base text-gray-500 line-clamp-1">
                          {searchFields.descripcion ? (
                            <HighlightMatch text={producto.descripcion} filter={busquedaProducto} highlightClass="bg-yellow-100 rounded px-0.5" />
                          ) : (
                            producto.descripcion
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                {mostrarCodigo && (
                  <td className="px-3 py-3">
                    <div className="text-sm text-gray-600 font-mono truncate">
                      {searchFields.codigoBarra ? (
                        <HighlightMatch text={producto.codigoBarra} filter={busquedaProducto} highlightClass="bg-yellow-100 rounded px-0.5" />
                      ) : (
                        producto.codigoBarra
                      )}
                    </div>
                  </td>
                )}
                <td className="px-3 py-3">
                  <div className="text-sm text-gray-600 truncate">
                    {producto.categorias?.[0]?.nombre || '-'}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="text-sm text-gray-600">
                    {producto.size || 0} {producto.unidad}
                  </div>
                </td>
                <td className="px-3 py-3">
                  {producto.precios && producto.precios[0] ? (
                    <div className="text-base font-medium text-green-600">
                      ${producto.precios[0].precio.toLocaleString()}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">-</div>
                  )}
                </td>
                <td className="px-3 py-3 text-center">
                  <div className="flex items-center justify-center">
                    <span className={`text-base font-medium ${
                      producto.size < 10 ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {producto.size || 0}
                    </span>
                    {producto.size < 10 && (
                      <Icon icono="exclamation-triangle" className="text-red-600 ml-1 text-sm" />
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 w-36">
                  <div className="flex items-center justify-end space-x-1">
                    <BotonAgregarPedido
                      producto={producto}
                      variant="outline"
                      size="xs"
                      onSuccess={() => {
                        // Podríamos mostrar una notificación aquí
                      }}
                    />
                    <Link
                      href={`/cargarProductos?edit=${producto.id}`}
                      className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors"
                      title="Editar producto"
                    >
                      <Icon icono="editar" className="text-sm" />
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEliminarProducto(producto);
                      }}
                      className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Eliminar producto"
                    >
                      <Icon icono="trash-can" className="text-sm" />
                    </button>
                  </div>
                </td>
              </tr>
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
          {productosEnPagina.map((producto) => (
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
                        <HighlightMatch text={producto.nombre} filter={busquedaProducto} highlightClass="bg-yellow-100 rounded px-0.5" />
                      ) : (
                        producto.nombre
                      )}
                    </h3>
                    <span className="bg-gray-100 text-gray-800 text-sm font-medium px-1.5 py-0.5 rounded flex-shrink-0">
                      {searchFields.codigoBarra ? (
                        <HighlightMatch text={producto.codigoBarra} filter={busquedaProducto} highlightClass="bg-yellow-100 rounded px-0.5" />
                      ) : (
                        producto.codigoBarra
                      )}
                    </span>
                  </div>

                  {producto.descripcion && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {searchFields.descripcion ? (
                        <HighlightMatch text={producto.descripcion} filter={busquedaProducto} highlightClass="bg-yellow-100 rounded px-0.5" />
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
                        <span className={`font-medium ${producto.size < 10 ? 'text-red-600' : 'text-gray-900'}`}>
                          {producto.size || 0}
                        </span>
                        {producto.size < 10 && (
                          <Icon icono="exclamation-triangle" className="text-red-600 ml-1 text-sm" />
                        )}
                      </span>
                    </div>
                  </div>

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
          ))}
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
                  {productosOrdenados.length} de {productos.length} productos
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Link
                  href="/cargarProductos"
                  className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors flex items-center"
                >
                  <Icon icono="plus" className="mr-2" />
                  Nuevo Producto
                </Link>
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
                {productosOrdenados.length} producto{productosOrdenados.length !== 1 ? 's' : ''} encontrado{productosOrdenados.length !== 1 ? 's' : ''}
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
                    setBusquedaProducto('');
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
                options={categoriasUnicas.map((cat) => ({ id: cat, nombre: cat }))}
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
                onNavigateNext={handleCategoryFilterNavigateNext}
                onNavigatePrev={handleCategoryFilterNavigatePrev}
              />
            </div>
          </div>
        </div>

        {/* Lista de productos */}
        {productosOrdenados.length > 0 ? (
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
                setBusquedaProducto('');
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
