/**
 * Encabezado de factura con documento y emisor
 */
export function EncabezadoFactura({ documento, emisor, proveedorEncontrado, CampoEditable }) {
  const revisar = documento?.revisar || emisor?.revisar
  
  return (
    <div className={`rounded-xl p-6 mb-4 text-white shadow-lg border-4 ${
      revisar ? 'bg-orange-600 border-orange-400' : 'bg-indigo-700 border-indigo-500'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-indigo-600 px-3 py-2 rounded-lg text-sm font-medium">
              📝 <CampoEditable 
                valor={documento?.tipo || 'Tipo desconocido'}
                path="documento.tipo"
                className="inline"
              />
            </span>
            <span className="bg-indigo-600 px-3 py-2 rounded-lg text-sm font-medium">
              📅 <CampoEditable 
                valor={documento?.fecha || 'Sin fecha'}
                path="documento.fecha"
                tipo="date"
                className="inline"
              />
            </span>
            {revisar && (
              <span className="bg-orange-500 px-3 py-1 rounded-lg text-xs font-bold">⚠️ Revisar datos</span>
            )}
          </div>
          <div className="text-xs text-indigo-200 mb-1">Número de comprobante</div>
          <CampoEditable 
            valor={documento?.numero || 'No detectado'}
            path="documento.numero"
            className="text-4xl font-black text-white"
          />
        </div>
        <div className="text-7xl opacity-30">🧾</div>
      </div>
      
      <div className="border-t-2 border-indigo-500 pt-4">
        <div className="text-xs text-indigo-200 mb-2">🏪 Emisor (Proveedor)</div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-indigo-300 mb-1">Nombre inferido:</div>
            <CampoEditable 
              valor={emisor?.nombre || 'No detectado'}
              path="emisor.nombre"
              className="font-bold text-lg text-white"
            />
            <div className="text-xs text-indigo-300 mt-1">
              CUIT: <CampoEditable 
                valor={emisor?.cuit || 'No detectado'}
                path="emisor.cuit"
                className="inline text-indigo-100"
              />
            </div>
          </div>
          
          <div>
            <div className="text-xs text-indigo-300 mb-1">Proveedor identificado:</div>
            {proveedorEncontrado?.proveedor ? (
              <div className="bg-green-600 rounded-lg p-3">
                <div className="font-bold text-white text-sm">✅ {proveedorEncontrado.proveedor.nombre}</div>
                <div className="text-xs text-green-100">CUIT: {proveedorEncontrado.proveedor.cuit}</div>
                <div className="text-xs text-green-200 mt-1">
                  {proveedorEncontrado.metodo === 'cuit' ? 'Match por CUIT' : 'Match por nombre'} • 
                  Confianza: {proveedorEncontrado.confianza}
                </div>
              </div>
            ) : (
              <div className="bg-yellow-600 rounded-lg p-3">
                <div className="text-yellow-100 text-xs">⚠️ Proveedor no encontrado en BD</div>
                <button className="mt-2 px-3 py-1 bg-yellow-700 hover:bg-yellow-800 rounded text-xs font-medium w-full">
                  + Crear proveedor
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
