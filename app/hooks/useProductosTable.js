import { useState, useCallback, useMemo } from 'react';
import debounce from '@/lib/debounce';

export default function useProductosTable(productos = []) {
  const [pagina, setPagina] = useState(1);
  const [perPage, setPerPage] = useState('10');
  const [busquedaInput, setBusquedaInput] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [ordenamiento, setOrdenamiento] = useState({ columna: 'nombre', direccion: 'asc' });
  const [searchFields, setSearchFields] = useState({
    nombre: true,
    marca: false,
    codigoBarra: true,
    descripcion: false,
    categoria: false,
    tamano: false,
    unidad: false,
    precio: false,
    stock: false,
  });

  const toggleCampoBusqueda = useCallback((campo) => {
    setSearchFields((prev) => {
      const next = { ...prev, [campo]: !prev[campo] };
      const algunoSeleccionado = Object.values(next).some(Boolean);
      if (!algunoSeleccionado) return { ...prev, nombre: true };
      return next;
    });
  }, []);

  const handleOrdenar = useCallback((columna) => {
    setOrdenamiento((prev) => ({
      columna,
      direccion: prev.columna === columna && prev.direccion === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const productosFiltrados = useMemo(() => {
    let filtrados = [...productos];

    // Filtrar por búsqueda
    if (busquedaInput.trim()) {
      const busqueda = busquedaInput.toLowerCase();
      filtrados = filtrados.filter((p) => {
        if (searchFields.nombre && p.nombre?.toLowerCase().includes(busqueda)) return true;
        if (searchFields.marca && p.marca?.nombre?.toLowerCase().includes(busqueda)) return true;
        if (searchFields.codigoBarra && p.codigoBarra?.toLowerCase().includes(busqueda)) return true;
        if (searchFields.descripcion && p.descripcion?.toLowerCase().includes(busqueda)) return true;
        if (searchFields.categoria && p.categorias?.some((c) => c.nombre?.toLowerCase().includes(busqueda))) return true;
        if (searchFields.tamano && String(p.size).includes(busqueda)) return true;
        if (searchFields.unidad && p.unidad?.toLowerCase().includes(busqueda)) return true;
        if (searchFields.precio && p.precios?.some((pr) => String(pr.precio).includes(busqueda))) return true;
        if (searchFields.stock && p.stockSuelto && String(p.stockSuelto).includes(busqueda)) return true;
        return false;
      });
    }

    // Filtrar por categoría
    if (categoriaFiltro) {
      filtrados = filtrados.filter((p) => p.categorias?.some((c) => c.nombre === categoriaFiltro));
    }

    return filtrados;
  }, [productos, busquedaInput, categoriaFiltro, searchFields]);

  const productosOrdenados = useMemo(() => {
    const copia = [...productosFiltrados];
    
    copia.sort((a, b) => {
      let valorA, valorB;

      switch (ordenamiento.columna) {
        case 'nombre':
          valorA = a.nombre?.toLowerCase() || '';
          valorB = b.nombre?.toLowerCase() || '';
          break;
        case 'categoria':
          valorA = a.categorias?.[0]?.nombre?.toLowerCase() || '';
          valorB = b.categorias?.[0]?.nombre?.toLowerCase() || '';
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
          valorA = a.stockSuelto || 0;
          valorB = b.stockSuelto || 0;
          break;
        default:
          return 0;
      }

      if (typeof valorA === 'string') {
        return ordenamiento.direccion === 'asc' 
          ? valorA.localeCompare(valorB, 'es')
          : valorB.localeCompare(valorA, 'es');
      }

      return ordenamiento.direccion === 'asc' ? valorA - valorB : valorB - valorA;
    });

    return copia;
  }, [productosFiltrados, ordenamiento]);

  const totalFiltrados = productosFiltrados.length;
  const perPageNum = perPage === 'all' ? totalFiltrados : parseInt(perPage, 10);
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrados / perPageNum));

  const productosEnPagina = useMemo(() => {
    const inicio = (pagina - 1) * perPageNum;
    const fin = inicio + perPageNum;
    return productosOrdenados.slice(inicio, fin);
  }, [productosOrdenados, pagina, perPageNum]);

  const navegarPagina = useCallback((nuevaPagina) => {
    setPagina(Math.max(1, Math.min(nuevaPagina, totalPaginas)));
  }, [totalPaginas]);

  const cambiarPerPage = useCallback((nuevoPerPage) => {
    const v = (nuevoPerPage ?? '10').toString();
    setPerPage(v);
    setPagina(1);
  }, []);

  return {
    pagina,
    perPage,
    setPerPage: cambiarPerPage,
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
    productosOrdenados,
    navegarPagina,
  };
}
