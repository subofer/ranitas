"use client"

/**
 * Componente de acciones de imagen avanzadas
 * Opciones para auto-enfoque, deshacer y recortar
 */
export function AdvancedImageActions({ 
  loading,
  autoEnfoqueAplicado, 
  deshacerAutoEnfoque, 
  imagenOriginal,
  autoEnfocar,
  file,
  preview,
  previewOriginal,
  setFile,
  setPreview,
  setAutoEnfoqueAplicado,
  abrirCropper
}) {
  return (
    <details className="text-sm" open={!loading}>
      <summary className="cursor-pointer text-gray-600 hover:text-gray-900 font-medium">
        ⚙️ Opciones avanzadas
      </summary>
      <div className="mt-3 space-y-2">
        {autoEnfoqueAplicado && (
          <button
            onClick={deshacerAutoEnfoque}
            disabled={loading || !imagenOriginal}
            className="w-full px-4 py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 border border-orange-200 font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>↩️</span>
            <span>Deshacer auto-enfoque</span>
          </button>
        )}
        <button
          onClick={() => {
            const fileToUse = imagenOriginal || file
            const previewToUse = previewOriginal || preview
            autoEnfocar(fileToUse, previewToUse, setFile, setPreview, preview)
            setAutoEnfoqueAplicado(true)
          }}
          disabled={loading || !file}
          className="w-full px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 border border-purple-200 font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span>🎯</span>
          <span>{autoEnfoqueAplicado ? 'Re-aplicar' : 'Aplicar'} auto-enfoque</span>
        </button>
        <button
          onClick={abrirCropper}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200 font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span>✂️</span>
          <span>Recortar manualmente</span>
        </button>
        <div className="text-xs text-gray-500 mt-2 flex items-start gap-2">
          <span>💡</span>
          <span>El auto-enfoque detecta y recorta el documento automáticamente. Puedes deshacerlo en cualquier momento.</span>
        </div>
      </div>
    </details>
  )
}
