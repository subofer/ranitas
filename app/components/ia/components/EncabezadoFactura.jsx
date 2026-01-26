/**
 * Encabezado de factura con documento y emisor
 */
export function EncabezadoFactura({ documento, emisor, proveedorEncontrado, CampoEditable, onCrearProveedor }) {
  const revisar = documento?.revisar || emisor?.revisar
  
  return (
    <div className={`rounded-xl p-6 mb-4 text-white shadow-lg border-4 ${
      revisar ? 'bg-orange-600 border-orange-400' : 'bg-indigo-700 border-indigo-500'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
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
            {documento?.estado_pago && (
              <span className={`px-3 py-2 rounded-lg text-xs font-bold ${
                /PAGAD/i.test(documento.estado_pago) ? 'bg-green-500' : 
                /PARCIAL/i.test(documento.estado_pago) ? 'bg-yellow-500' : 
                'bg-red-500'
              }`}>
                💳 {documento.estado_pago}
              </span>
            )}
            {typeof documento?.monto_pagado === 'number' && documento.monto_pagado > 0 && (
              <span className="bg-blue-500 px-3 py-1 rounded-lg text-xs font-medium">
                💵 Pagado: ${documento.monto_pagado.toFixed(2)}
              </span>
            )}
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

          {/* Notas / anotaciones marginales */}
          {documento?.anotaciones_marginales && (
            <div className="mt-2 text-xs text-indigo-200 whitespace-pre-line">{documento.anotaciones_marginales}</div>
          )}
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

            {/* Campos del membrete y datos adicionales */}
            {emisor?.direccion_completa_manual && (
              <div className="text-xs text-indigo-200 mt-2">Domicilio detectado: <span className="text-white font-medium">{emisor.direccion_completa_manual}</span></div>
            )}
            {emisor?.telefono && (
              <div className="text-xs text-indigo-200">Teléfono: <span className="text-white font-medium">{emisor.telefono}</span></div>
            )}
            {emisor?.emails && emisor.emails.length > 0 && (
              <div className="text-xs text-indigo-200">Email(s): <span className="text-white font-medium">{emisor.emails.join(', ')}</span></div>
            )}
            {emisor?.iva && (
              <div className="text-xs text-indigo-200">IVA: <span className="text-white font-medium">{emisor.iva}</span></div>
            )}
            {emisor?.inicio_actividades && (
              <div className="text-xs text-indigo-200">Inicio de actividades: <span className="text-white font-medium">{emisor.inicio_actividades}</span></div>
            )}
            {emisor?.datos_bancarios && (
              <div className="text-xs text-indigo-200 mt-1">Cuenta bancaria: <span className="text-white font-medium">{emisor.datos_bancarios.banco || ''} {emisor.datos_bancarios.cbu ? '• CBU: ' + emisor.datos_bancarios.cbu : ''} {emisor.datos_bancarios.alias ? '• Alias: ' + emisor.datos_bancarios.alias : ''}</span></div>
            )}
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
                <button
                  onClick={() => onCrearProveedor && onCrearProveedor()}
                  className="mt-2 px-3 py-1 bg-yellow-700 hover:bg-yellow-800 rounded text-xs font-medium w-full"
                  type="button"
                >
                  + Crear proveedor
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Información adicional de cuenta corriente y anotaciones */}
        {(documento?.cuenta_corriente || documento?.anotaciones_marginales) && (
          <div className="border-t-2 border-indigo-500 pt-3 mt-3">
            {documento?.cuenta_corriente && (
              <div className="bg-indigo-600 bg-opacity-50 rounded-lg p-2 mb-2">
                <div className="text-xs text-indigo-200 font-medium mb-1">📊 Cuenta Corriente</div>
                <div className="text-sm">
                  {documento.cuenta_corriente.estado && (
                    <span className="text-white font-medium mr-2">
                      Estado: {documento.cuenta_corriente.estado}
                    </span>
                  )}
                  {documento.cuenta_corriente.saldo_encontrado !== undefined && documento.cuenta_corriente.saldo_encontrado !== 0 && (
                    <span className="text-white font-mono">
                      Saldo: ${documento.cuenta_corriente.saldo_encontrado.toFixed(2)}
                    </span>
                  )}
                  {documento.cuenta_corriente.notas && (
                    <div className="text-xs text-indigo-200 mt-1">{documento.cuenta_corriente.notas}</div>
                  )}
                </div>
              </div>
            )}
            {documento?.anotaciones_marginales && (
              <div className="bg-indigo-600 bg-opacity-50 rounded-lg p-2 text-xs">
                <span className="text-indigo-200 font-medium">📝 Anotaciones:</span>
                <span className="text-white ml-2">{documento.anotaciones_marginales}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
