"use client";
import { obtenerProductosPorProveedor } from "@/prisma/serverActions/proveedores";
import EditarCodigoForm from "../formComponents/EditarCodigoForm"; // Importamos el formulario cliente
import { useCallback, useEffect, useState } from "react";
import Icon from "../formComponents/Icon";
import ProductGridPlaceholder from "./ProductGridPlaceholder";

export default function ProductosPorProveedorServer({ proveedorId }) {
  const [productos, setProductos] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [perPage, setPerPage] = useState(50); // Nuevo estado para ítems por página
  const [nextPageProducts, setNextPageProducts] = useState(null); // Para precarga
  const [nextPageLoading, setNextPageLoading] = useState(false); // Para precarga

  const fetchProducts = useCallback( async (p, pp) => {
    try {
      setLoading(true);
      const skip = (p - 1) * pp;
      const { productosRelacionados, total: totalCount } = await obtenerProductosPorProveedor(proveedorId, { skip, take: pp === 'all' ? undefined : pp });
      setProductos(productosRelacionados || []);
      setTotal(totalCount || 0);
    } catch (error) {
      console.error("Error cargando productos del proveedor:", error);
    } finally {
      setLoading(false);
    }
  },[proveedorId])

  const preloadNextPage = useCallback(async (p, pp) => {
    if (pp === 'all') return; // No precargar si se muestran todos
    const nextPageNum = p + 1;
    const totalP = Math.ceil(total / pp);
    if (nextPageNum <= totalP) {
      setNextPageLoading(true);
      try {
        const skip = (nextPageNum - 1) * pp;
        const { productosRelacionados: productsData } = await obtenerProductosPorProveedor(proveedorId, { skip, take: pp });
        setNextPageProducts(productsData || []);
      } catch (error) {
        console.error("Error precargando página siguiente del proveedor:", error);
      } finally {
        setNextPageLoading(false);
      }
    } else {
      setNextPageProducts(null);
    }
  }, [total, proveedorId]);

  useEffect(() => {
    fetchProducts(pagina, perPage);
    preloadNextPage(pagina, perPage);
  },[fetchProducts, pagina, perPage, preloadNextPage])

  const handlePerPageChange = (e) => {
    setPerPage(e.target.value === 'all' ? 'all' : Number(e.target.value));
    setPagina(1); // Reset a la primera página al cambiar la cantidad por página
  };

  const totalPaginas = perPage === 'all' ? 1 : Math.ceil(total / perPage);

  const goToNextPage = () => {
    if (pagina < totalPaginas) {
      if (nextPageProducts) {
        setProductos(nextPageProducts);
        setPagina(p => p + 1);
        setNextPageProducts(null);
      } else {
        setPagina(p => p + 1);
      }
    }
  };

  const goToPrevPage = () => {
    if (pagina > 1) {
      setPagina(p => p - 1);
    }
  };

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Productos del Proveedor</h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">Total: {total}</span>
          <div className="flex items-center space-x-2">
            <label htmlFor="perPageProvider" className="text-sm text-gray-600">Mostrar:</label>
            <select
              id="perPageProvider"
              value={perPage}
              onChange={handlePerPageChange}
              className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="all">Todos</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <ProductGridPlaceholder count={perPage} />
      ) : total > 0 ? (
        <>
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {productos.map(({ codigo, producto }) => (
              <li key={producto.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="font-medium text-gray-900 mb-1">{producto.nombre}</div>
                <div className="text-sm text-gray-600 mb-3">Ref: {codigo}</div>
                <EditarCodigoForm 
                  after={() => fetchProducts(pagina, perPage)}
                  codigo={codigo}
                  proveedorId={proveedorId}
                  producto={producto}
                  />
              </li>
            ))}
          </ul>

          {/* Paginación Simple */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between mt-6 px-4 py-3 bg-white border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-700">
                Página <span className="font-medium">{pagina}</span> de <span className="font-medium">{totalPaginas}</span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={goToPrevPage}
                  disabled={pagina === 1}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  <Icon icono="angle-left" />
                </button>
                <button
                  onClick={goToNextPage}
                  disabled={pagina === totalPaginas}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  <Icon icono="angle-right" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center p-8 bg-gray-50 rounded-lg text-gray-600">
          No hay productos vinculados a este proveedor.
        </div>
      )}
    </div>
  );
}
