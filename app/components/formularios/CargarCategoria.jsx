"use client"
import { useState } from "react";
import { guardarCategoria } from "@/prisma/serverActions/categorias";
import Input from "../formComponents/Input";
import Button from "../formComponents/Button";
import Icon from "../formComponents/Icon";
import { useErrorNotification } from '@/hooks/useErrorNotification';

export const CargarCategoria = ({ onCategoriaCreated }) => {
  const { showError } = useErrorNotification();
  const [categoriaNombre, setCategoriaNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!categoriaNombre.trim()) {
      showError("Por favor ingresa un nombre para la categoría");
      return;
    }

    setLoading(true);
    try {
      const result = await guardarCategoria({ nombre: categoriaNombre.trim() });

      if (result?.error) {
        showError(result.msg || "Error al guardar la categoría");
      } else {
        showError("Categoría creada exitosamente", 3000);
        setCategoriaNombre("");
        onCategoriaCreated && onCategoriaCreated();
      }
    } catch (error) {
      console.error("Error:", error);
      showError("Error inesperado al guardar la categoría: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-center mb-4">
        <div className="bg-blue-100 p-2 rounded-lg mr-3">
          <Icon icono="tag" className="text-blue-600 text-lg" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Nueva Categoría</h2>
          <p className="text-sm text-gray-600">Agrega una nueva categoría al sistema</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              name="nombre"
              label="Nombre de la categoría"
              placeholder="Ej: Cereales y granos, Snacks saludables..."
              value={categoriaNombre}
              onChange={(e) => setCategoriaNombre(e.target.value)}
              className="w-full"
              required
            />
          </div>
          <div className="flex items-end">
            <Button
              tipo="enviar"
              loading={loading}
              type="submit"
              className="px-6 py-2.5 h-[46px]"
            >
              <Icon icono="plus" className="mr-2 text-sm" />
              Crear Categoría
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};