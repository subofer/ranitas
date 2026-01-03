"use client"
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { getCategoriasConteo } from "@/prisma/consultas/categorias";
import { fechas } from "@/lib/manipularTextos";
import Icon from "../formComponents/Icon";
import EditarCategoriaModal from "./EditarCategoriaModal";
import { alertaBorrarCategoria } from "../alertas/alertaBorrarCategoria";
import { borrarCategoria } from "@/prisma/serverActions/categorias";

const ListadoCategorias = forwardRef((props, ref) => {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriaEditando, setCategoriaEditando] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    cargarCategorias();
  }, []);

  const cargarCategorias = async () => {
    try {
      setLoading(true);
      const data = await getCategoriasConteo();
      setCategorias(data || []);
    } catch (error) {
      console.error("Error cargando categorías:", error);
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    cargarCategorias
  }));

  const handleEditar = (categoria) => {
    setCategoriaEditando(categoria);
    setModalOpen(true);
  };

  const handleEliminar = (categoria) => {
    alertaBorrarCategoria(categoria, async () => {
      try {
        await borrarCategoria(categoria.id);
        await cargarCategorias(); // Recargar la lista
      } catch (error) {
        console.error("Error eliminando categoría:", error);
      }
    });
  };

  const handleSaveEdit = () => {
    cargarCategorias(); // Recargar la lista después de editar
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando categorías...</p>
      </div>
    );
  }

  if (!categorias || categorias.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
        <div className="text-gray-400 mb-4">
          <Icon icono="tag" className="text-4xl mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay categorías</h3>
        <p className="text-gray-600">Aún no se han creado categorías en el sistema.</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Icon icono="tag" className="text-gray-600 text-lg mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Categorías</h2>
            </div>
            <span className="text-sm text-gray-500">
              {categorias.length} {categorias.length === 1 ? 'categoría' : 'categorías'}
            </span>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {categorias.map((categoria, index) => (
            <div key={categoria.id} className="p-4 hover:bg-gray-50 transition-colors duration-150">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Icon icono="tag" className="text-blue-600 text-sm" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {categoria.nombre}
                      </h3>
                      <div className="flex items-center mt-1">
                        <span className="text-xs text-gray-500">
                          Creada: {fechas.fecha(categoria.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {categoria._count?.products || 0}
                    </div>
                    <div className="text-xs text-gray-500">
                      productos
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleEditar(categoria)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-150"
                    title="Editar categoría"
                  >
                    <Icon icono="editar" />
                  </button>
                    <button
                      onClick={() => handleEliminar(categoria)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150"
                      title="Eliminar categoría"
                    >
                      <Icon icono="eliminar" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <EditarCategoriaModal
        categoria={categoriaEditando}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setCategoriaEditando(null);
        }}
        onSave={handleSaveEdit}
      />
    </>
  );
});

ListadoCategorias.displayName = "ListadoCategorias";

export default ListadoCategorias;
