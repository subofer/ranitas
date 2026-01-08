"use client"
import { useState, useEffect, useCallback, useRef } from 'react';
import { getProductos } from '@/prisma/consultas/productos';
import { eliminarProductoConPreciosPorId } from '@/prisma/serverActions/productos';
import { alertaBorrarProducto } from '../alertas/alertaBorrarProducto';
import Link from 'next/link';
import Icon from '../formComponents/Icon';
import FilterSelect from '../formComponents/FilterSelect';
import BotonAgregarPedido from '../pedidos/BotonAgregarPedido';
import ImageWithFallback from '../ui/ImageWithFallback';
import { useErrorNotification } from '@/hooks/useErrorNotification';
import ProductListPlaceholder from './ProductListPlaceholder';
import ProductGridPlaceholder from './ProductGridPlaceholder';

const ListadoProductosModerno = ({ mostrarCodigo = true, modoCompacto = false }) => {
  const { showError } = useErrorNotification();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [vistaTipo, setVistaTipo] = useState('lista');
  const [pagina, setPagina] = useState(1);
  const [perPage, setPerPage] = useState(5);
  const [total, setTotal] = useState(0);
  const [categoriasUnicas, setCategoriasUnicas] = useState([]);
  const [ordenamiento, setOrdenamiento] = useState({ columna: null, direccion: 'asc' });
  
  // Estados para navegación por teclado
  const [productoFocused, setProductoFocused] = useState(null);
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);
  const inputBusquedaRef = useRef(null);
  const filaProductoRef = useRef({});

  const cargarProductos = useCallback(async () => {
    try {
      setLoading(true);
      const { productos: productosData = [] } = await getProductos({ take: 10000 }) || {};
      setProductos(Array.isArray(productosData) ? productosData : []);
      setTotal(Array.isArray(productosData) ? productosData.length : 0);
    } catch (error) {
      console.error('Error cargando productos:', error);
      setProductos([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (productoFocused) {
      setTimeout(() => {
        filaProductoRef.current[productoFocused]?.focus();
        filaProductoRef.current[productoFocused]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
    }
  }, [productoFocused]);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  // Cargar todas las categorías únicas para el dropdown
  useEffect(() => {
    const cargarCategorias = async () => {
      try {
        const { productos: todos = [] } = await getProductos({ take: 10000 }) || {};
        const cats = [...new Set(
          todos.flatMap(p => p.categorias?.map(c => c.nombre) || [])
        )].filter(Boolean).sort();
        setCategoriasUnicas(cats);
      } catch (error) {
        console.error('Error obteniendo categorías:', error);
      }
    };
    cargarCategorias();
  }, []);

  // Filtrar productos según búsqueda de texto y categoría
  const productosFiltrados = productos.filter(producto => {
    // Búsqueda de texto en nombre, descripción y código
    const coincideBusqueda = !busquedaProducto || 
      producto.nombre.toLowerCase().includes(busquedaProducto.toLowerCase()) ||
      producto.descripcion?.toLowerCase().includes(busquedaProducto.toLowerCase()) ||
      producto.codigoBarra?.toLowerCase().includes(busquedaProducto.toLowerCase());
    
    const coincideCategoria = !categoriaFiltro ||
      producto.categorias?.some(c => c.nombre === categoriaFiltro);
    
    return coincideBusqueda && coincideCategoria;
  });

  // Función para ordenar productos
  const ordenarProductos = (productos, columna) => {
    let nuevaDireccion = 'asc';
    if (ordenamiento.columna === columna && ordenamiento.direccion === 'asc') {
      nuevaDireccion = 'desc';
    }
    setOrdenamiento({ columna, direccion: nuevaDireccion });
    setPagina(1);

    return [...productos].sort((a, b) => {
      let valorA, valorB;

      switch (columna) {
        case 'nombre':
          valorA = a.nombre.toLowerCase();
          valorB = b.nombre.toLowerCase();
          break;
        case 'categoria':
          valorA = (a.categorias?.[0]?.nombre || '').toLowerCase();
          valorB = (b.categorias?.[0]?.nombre || '').toLowerCase();
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
          valorA = a.size || 0;
          valorB = b.size || 0;
          break;
        default:
          return 0;
      }

      if (valorA < valorB) return nuevaDireccion === 'asc' ? -1 : 1;
      if (valorA > valorB) return nuevaDireccion === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Aplicar ordenamiento a los productos filtrados
  const productosOrdenados = ordenamiento.columna 
    ? ordenarProductos(productosFiltrados, ordenamiento.columna) 
    : productosFiltrados;

  // Cálculo de paginación (basado en productos filtrados)
  const totalFiltrados = productosOrdenados.length;
  const totalPaginas = perPage === 'all' ? 1 : Math.ceil(totalFiltrados / perPage);

  // Calcular productos para la página actual
  const productosEnPagina = perPage === 'all' 
    ? productosOrdenados 
    : productosOrdenados.slice((pagina - 1) * perPage, pagina * perPage);

  const handlePerPageChange = (nuevoPerPage) => {
    setPerPage(nuevoPerPage === 'all' ? 'all' : Number(nuevoPerPage));
    setPagina(1);
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

  // Generar números de página a mostrar (máximo 5)
  const generarNumerosPagina = () => {
    if (totalPaginas <= 5) {
      return Array.from({ length: totalPaginas }, (_, i) => i + 1);
    }
    
    const numeros = [];
    const inicio = Math.max(1, pagina - 2);
    const fin = Math.min(totalPaginas, pagina + 2);
    
    for (let i = inicio; i <= fin; i++) {
      numeros.push(i);
    }
    
    return numeros;
  };

  const numerosPagina = generarNumerosPagina();

  const handleEliminarProducto = async (producto) => {
    const confirmado = await alertaBorrarProducto(producto.nombre);
    if (confirmado) {
      try {
        await eliminarProductoConPreciosPorId(producto.id);
        cargarProductos(); // Recargar la lista después de eliminar
      } catch (error) {
        console.error('Error eliminando producto:', error);
        showError('Error al eliminar el producto: ' + error.message);
      }
    }
  };

  // Handlers para navegación por teclado
  const handleInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (productosEnPagina.length > 0) {
        const primerProducto = productosEnPagina[0];
        setProductoFocused(primerProducto.id);
        // Dar foco a la primera fila
        setTimeout(() => {
          filaProductoRef.current[primerProducto.id]?.focus();
        }, 0);
      }
    }
  };

  const toggleProductoSeleccionado = (productoId) => {
    setProductosSeleccionados(prev => 
      prev.includes(productoId) 
        ? prev.filter(id => id !== productoId)
        : [...prev, productoId]
    );
  };

  const handleProductoKeyDown = (e, producto, indexEnPagina) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (indexEnPagina < productosEnPagina.length - 1) {
          const siguienteProducto = productosEnPagina[indexEnPagina + 1];
          setProductoFocused(siguienteProducto.id);
          setTimeout(() => {
            filaProductoRef.current[siguienteProducto.id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 0);
        } else if (pagina < totalPaginas) {
          // Ir a la siguiente página y enfocar el primer producto
          setPagina(pagina + 1);
          setTimeout(() => {
            const proximoPrimerProducto = productosOrdenados[(pagina) * perPage];
            if (proximoPrimerProducto) {
              setProductoFocused(proximoPrimerProducto.id);
              filaProductoRef.current[proximoPrimerProducto.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 0);
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (indexEnPagina > 0) {
          const productoAnterior = productosEnPagina[indexEnPagina - 1];
          setProductoFocused(productoAnterior.id);
          setTimeout(() => {
            filaProductoRef.current[productoAnterior.id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 0);
        } else if (pagina > 1) {
          // Ir a la página anterior y enfocar el último producto
          setPagina(pagina - 1);
          setTimeout(() => {
            const proximoUltimoProducto = productosOrdenados[(pagina - 2) * perPage + (perPage - 1)];
            if (proximoUltimoProducto) {
              setProductoFocused(proximoUltimoProducto.id);
              filaProductoRef.current[proximoUltimoProducto.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 0);
        }
        break;

      case 'ArrowLeft':
        e.preventDefault();
        if (pagina > 1) {
          setPagina(pagina - 1);
          const ultimoProductoAnterior = productosOrdenados[(pagina - 2) * perPage];
          if (ultimoProductoAnterior) {
            setProductoFocused(ultimoProductoAnterior.id);
            setTimeout(() => {
              filaProductoRef.current[ultimoProductoAnterior.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 0);
          }
        }
        break;

      case 'ArrowRight':
        e.preventDefault();
        if (pagina < totalPaginas) {
          setPagina(pagina + 1);
          const primerProductoSiguiente = productosOrdenados[pagina * perPage];
          if (primerProductoSiguiente) {
            setProductoFocused(primerProductoSiguiente.id);
            setTimeout(() => {
              filaProductoRef.current[primerProductoSiguiente.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 0);
          }
        }
        break;

      case ' ':
        e.preventDefault();
        toggleProductoSeleccionado(producto.id);
        break;

      case 'Escape':
        e.preventDefault();
        setProductoFocused(null);
        inputBusquedaRef.current?.focus();
        break;

      default:
        break;
    }
  };

  const limpiarSeleccion = () => {
    setProductosSeleccionados([]);
  };

  const copiarSeleccionados = () => {
    const datos = productosSeleccionados.map(id => {
      const prod = productos.find(p => p.id === id);
      return prod ? `${prod.nombre} (${prod.codigoBarra})` : '';
    }).join('\n');
    navigator.clipboard.writeText(datos).then(() => {
      showError('Productos copiados al portapapeles');
    });
  };

  // Componente para vista de lista moderna
  const VistaLista = () => {
    // Función auxiliar para renderizar header con ordenamiento
    const HeaderColumna = ({ columna, children }) => {
      const esActivo = ordenamiento.columna === columna;
      return (
        <th 
          onClick={() => ordenarProductos(productosOrdenados, columna)}
          className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
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
            <button
              onClick={copiarSeleccionados}
              className="px-3 py-1 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1"
              title="Copiar al portapapeles"
            >
              <Icon icono="copy" className="text-xs" />
              Copiar
            </button>
            <button
              onClick={limpiarSeleccion}
              className="px-3 py-1 text-xs font-medium rounded bg-gray-300 text-gray-900 hover:bg-gray-400 transition-colors flex items-center gap-1"
              title="Limpiar selección"
            >
              <Icon icono="times" className="text-xs" />
              Limpiar
            </button>
          </div>
        </div>
      )}
      {/* Header con paginación */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Izquierda: Título */}
          <div className="flex items-center whitespace-nowrap gap-2">
            <Icon icono="list" className="text-gray-600 text-base" />
            <h2 className="text-sm font-medium text-gray-900">Vista de Lista</h2>
          </div>

          {/* Derecha: Paginación */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Botones de navegación */}
            <div className="flex items-center gap-1">
              <button
                onClick={goToFirstPage}
                disabled={pagina === 1}
                className="px-2 py-1 text-xs font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Primera página"
              >
                ⏮
              </button>
              <button
                onClick={goToPrevPage}
                disabled={pagina === 1}
                className="px-2 py-1 text-xs font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className={`px-2.5 py-1 text-xs font-medium rounded border ${
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
                className="px-2 py-1 text-xs font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Página siguiente"
              >
                →
              </button>
              <button
                onClick={goToLastPage}
                disabled={pagina === totalPaginas}
                className="px-2 py-1 text-xs font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Última página"
              >
                ⏭
              </button>
            </div>

            {/* Indicador de página */}
            <span className="text-xs text-gray-600 whitespace-nowrap">
              {pagina}/{totalPaginas}
            </span>

            {/* Selector de cantidad */}
            <select
              value={perPage}
              onChange={(e) => handlePerPageChange(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 rounded text-gray-900 bg-white hover:bg-gray-50"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="all">Todos</option>
            </select>

            {/* Contador */}
            <span className="text-xs text-gray-600 whitespace-nowrap">
              {productosEnPagina.length} de {totalFiltrados}
            </span>

            {/* Toggle de vista */}
            <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg p-1">
              <button
                onClick={() => setVistaTipo('lista')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  vistaTipo === 'lista'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                title="Vista de lista"
              >
                <Icon icono="list" className="text-sm" />
              </button>
              <button
                onClick={() => setVistaTipo('cuadricula')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  vistaTipo === 'cuadricula'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                title="Vista de cuadrícula"
              >
                <Icon icono="th" className="text-sm" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={productosSeleccionados.length === productosEnPagina.length && productosEnPagina.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setProductosSeleccionados([...productosSeleccionados, ...productosEnPagina.map(p => p.id).filter(id => !productosSeleccionados.includes(id))]);
                      } else {
                        setProductosSeleccionados(productosSeleccionados.filter(id => !productosEnPagina.map(p => p.id).includes(id)));
                      }
                    }}
                    className="w-4 h-4 cursor-pointer"
                    title="Seleccionar todos en esta página"
                  />
                </div>
              </th>
              <HeaderColumna columna="nombre">
                <span className="min-w-0 flex-1">Producto</span>
              </HeaderColumna>
              {mostrarCodigo && (
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
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
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
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
                onKeyDown={(e) => handleProductoKeyDown(e, producto, indexEnPagina)}
                onFocus={() => setProductoFocused(producto.id)}
                className={`transition-colors cursor-pointer outline-none focus:outline-blue-400 focus:outline-2 ${
                  productoFocused === producto.id
                    ? 'bg-blue-100 border-l-4 border-l-blue-500'
                    : 'hover:bg-gray-50 focus:bg-blue-50'
                } ${productosSeleccionados.includes(producto.id) ? 'bg-green-50' : ''}`}
                onClick={() => {
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
                      <div className="text-sm font-medium text-gray-900 line-clamp-1">
                        {producto.nombre}
                      </div>
                      {producto.descripcion && (
                        <div className="text-sm text-gray-500 line-clamp-1">
                          {producto.descripcion}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                {mostrarCodigo && (
                  <td className="px-3 py-3">
                    <div className="text-xs text-gray-600 font-mono truncate">
                      {producto.codigoBarra}
                    </div>
                  </td>
                )}
                <td className="px-3 py-3">
                  <div className="text-xs text-gray-600 truncate">
                    {producto.categorias?.[0]?.nombre || '-'}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="text-xs text-gray-600">
                    {producto.size || 0} {producto.unidad}
                  </div>
                </td>
                <td className="px-3 py-3">
                  {producto.precios && producto.precios[0] ? (
                    <div className="text-sm font-medium text-green-600">
                      ${producto.precios[0].precio.toLocaleString()}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">-</div>
                  )}
                </td>
                <td className="px-3 py-3 text-center">
                  <div className="flex items-center justify-center">
                    <span className={`text-sm font-medium ${
                      producto.size < 10 ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {producto.size || 0}
                    </span>
                    {producto.size < 10 && (
                      <Icon icono="exclamation-triangle" className="text-red-600 ml-1 text-xs" />
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
                      <Icon icono="editar" className="text-xs" />
                    </Link>
                    <button
                      onClick={() => handleEliminarProducto(producto)}
                      className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Eliminar producto"
                    >
                      <Icon icono="trash-can" className="text-xs" />
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
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Izquierda: Título */}
          <div className="flex items-center whitespace-nowrap gap-2">
            <Icon icono="th" className="text-gray-600 text-base" />
            <h2 className="text-sm font-medium text-gray-900">Vista de Cuadrícula</h2>
          </div>

          {/* Derecha: Paginación */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Botones de navegación */}
            <div className="flex items-center gap-1">
              <button
                onClick={goToFirstPage}
                disabled={pagina === 1}
                className="px-2 py-1 text-xs font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Primera página"
              >
                ⏮
              </button>
              <button
                onClick={goToPrevPage}
                disabled={pagina === 1}
                className="px-2 py-1 text-xs font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className={`px-2.5 py-1 text-xs font-medium rounded border ${
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
                className="px-2 py-1 text-xs font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Página siguiente"
              >
                →
              </button>
              <button
                onClick={goToLastPage}
                disabled={pagina === totalPaginas}
                className="px-2 py-1 text-xs font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Última página"
              >
                ⏭
              </button>
            </div>

            {/* Indicador de página */}
            <span className="text-xs text-gray-600 whitespace-nowrap">
              {pagina}/{totalPaginas}
            </span>

            {/* Selector de cantidad */}
            <select
              value={perPage}
              onChange={(e) => handlePerPageChange(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 rounded text-gray-900 bg-white hover:bg-gray-50"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="all">Todos</option>
            </select>

            {/* Contador */}
            <span className="text-xs text-gray-600 whitespace-nowrap">
              {productosEnPagina.length} de {totalFiltrados}
            </span>

            {/* Toggle de vista */}
            <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg p-1">
              <button
                onClick={() => setVistaTipo('lista')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  vistaTipo === 'lista'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                title="Vista de lista"
              >
                <Icon icono="list" className="text-sm" />
              </button>
              <button
                onClick={() => setVistaTipo('cuadricula')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  vistaTipo === 'cuadricula'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                title="Vista de cuadrícula"
              >
                <Icon icono="th" className="text-sm" />
              </button>
            </div>
          </div>
        </div>
      </div>

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
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
                      {producto.nombre}
                    </h3>
                    <span className="bg-gray-100 text-gray-800 text-xs font-medium px-1.5 py-0.5 rounded flex-shrink-0">
                      {producto.codigoBarra}
                    </span>
                  </div>

                  {producto.descripcion && (
                    <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                      {producto.descripcion}
                    </p>
                  )}

                  {/* Información técnica */}
                  <div className="space-y-1 mb-3 text-xs">
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
                          <Icon icono="exclamation-triangle" className="text-red-600 ml-1 text-xs" />
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
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-800"
                        >
                          {categoria.nombre}
                        </span>
                      ))}
                      {producto.categorias.length > 2 && (
                        <span className="text-xs text-gray-500">+{producto.categorias.length - 2}</span>
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
                    className="flex-1 p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded text-center text-xs transition-colors"
                    title="Editar producto"
                  >
                    <Icon icono="editar" className="text-sm" />
                  </Link>

                  <button
                    onClick={() => handleEliminarProducto(producto)}
                    className="flex-1 p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded text-center text-xs transition-colors"
                    title="Eliminar producto"
                  >
                    <Icon icono="trash-can" className="text-sm" />
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
      <div className={`${modoCompacto ? 'bg-gray-50 py-2' : 'min-h-screen bg-gray-50 py-4'}`}>
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
    <div className={`${modoCompacto ? 'bg-gray-50 py-2' : 'min-h-screen bg-gray-50 py-4'}`}>
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
                placeholder="Buscar por nombre, código o descripción... (↓ para navegar)"
                value={busquedaProducto}
                onChange={(e) => {
                  setBusquedaProducto(e.target.value);
                  setPagina(1);
                }}
                onKeyDown={(e) => {
                  handleInputKeyDown(e);
                  if (e.key === 'Escape') {
                    setBusquedaProducto('');
                    e.currentTarget.blur();
                    setPagina(1);
                  }
                }}
                className="
                  appearance-none
                  text-left
                  text-gray-900
                  block w-full
                  px-2.5 pt-5 pb-2 pr-10
                  h-[46px]
                  border-0 border-b-2 border-gray-300
                  bg-transparent
                  focus:outline-none focus:ring-0
                  focus:border-slate-400 peer
                  transition-all duration-500 ease-in-out
                  placeholder:text-gray-500
                "
                title="Teclas: ↓ para navegar, Esc para limpiar"
              />
              <label className="
                absolute left-0 transition-all duration-500 ease-in-out px-2.5
                text-sm font-medium top-0.5 text-black
              ">
                Buscar producto
              </label>
            </div>
            <div>
              <FilterSelect
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
