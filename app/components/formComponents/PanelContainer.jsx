"use client"
import Icon from './Icon';

/**
 * Contenedor de panel reutilizable con título, contador y contenido
 */
export default function PanelContainer({
  title,
  count,
  countLabel,
  children,
  loading = false,
  loadingMessage = "Cargando...",
  emptyMessage,
  isEmpty = false,
  emptyIcon = "package",
  className = ""
}) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        {count !== undefined && (
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {count} {countLabel}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Icon icono="spinner" className="animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">{loadingMessage}</span>
        </div>
      ) : isEmpty ? (
        <div className="text-center py-8 text-gray-500">
          <Icon icono={emptyIcon} className="mx-auto mb-2 text-gray-300" size="large" />
          <p>{emptyMessage}</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
