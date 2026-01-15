"use client"
import { useState, useEffect } from "react";
import { guardarCategoria } from "@/prisma/serverActions/categorias";
import Input from "../formComponents/Input";
import Button from "../formComponents/Button";
import Icon from "../formComponents/Icon";
import { useErrorNotification } from '@/hooks/useErrorNotification';

const EditarCategoriaModal = ({ categoria, isOpen, onClose, onSave }) => {
  const { showError, showSuccess } = useErrorNotification();
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);

  // Determinar si estamos creando o editando
  const isEditing = categoria && categoria.id;
  const isCreating = !isEditing;

  useEffect(() => {
    if (categoria && isEditing) {
      setNombre(categoria.nombre || "");
    } else if (isCreating) {
      setNombre("");
    }
  }, [categoria, isEditing, isCreating]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nombre.trim()) {
      showError("El nombre de la categoría no puede estar vacío");
      return;
    }

    setLoading(true);
    try {
      const data = isEditing
        ? { id: categoria.id, nombre: nombre.trim() }
        : { nombre: nombre.trim() };

      const result = await guardarCategoria(data);

      if (result?.error) {
        showError(result.msg || `Error al ${isEditing ? 'actualizar' : 'crear'} la categoría`);
      } else {
        showSuccess(`Categoría ${isEditing ? 'actualizada' : 'creada'} exitosamente`, 3000);
        onSave && onSave(result);
        onClose();
      }
    } catch (error) {
      console.error("Error:", error);
      showError(`Error inesperado al ${isEditing ? 'actualizar' : 'crear'} la categoría: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className={`bg-blue-100 p-2 rounded-lg mr-3`}>
              <Icon icono={isEditing ? "editar" : "plus"} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditing ? "Editar Categoría" : "Nueva Categoría"}
              </h2>
              <p className="text-sm text-gray-600">
                {isEditing ? "Modifica el nombre de la categoría" : "Crea una nueva categoría"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icon icono="times" className="text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <Input
              name="nombre"
              label="Nombre de la categoría"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ingresa el nombre de la categoría"
              required
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                tipo="neutro"
                type="button"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                tipo="enviar"
                type="submit"
                loading={loading}
              >
                <Icon icono={isEditing ? "salvar" : "plus"} className="mr-2" />
                {isEditing ? "Guardar Cambios" : "Crear Categoría"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarCategoriaModal;
