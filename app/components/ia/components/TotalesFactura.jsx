import { formatCurrency } from '@/lib/formatters'

/**
 * Sección de totales de factura
 */
export function TotalesFactura({ totales, CampoEditable }) {
  return (
    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4">
      <div className="font-bold text-yellow-900 mb-3 text-lg">💰 Totales</div>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between items-center">
          <span>Subtotal:</span>
          <CampoEditable 
            valor={totales?.neto || 0}
            path="totales.neto"
            tipo="number"
            className="font-mono font-medium"
            formatear={formatCurrency}
          />
        </div>
        <div className="flex justify-between items-center">
          <span>IVA:</span>
          <CampoEditable 
            valor={totales?.iva || 0}
            path="totales.iva"
            tipo="number"
            className="font-mono font-medium"
            formatear={formatCurrency}
          />
        </div>
        <div className="border-t-2 border-yellow-400 pt-2 mt-2">
          <div className="flex justify-between items-center">
            <span className="font-bold text-lg">TOTAL:</span>
            <CampoEditable 
              valor={totales?.total || 0}
              path="totales.total"
              tipo="number"
              className="font-black text-2xl text-yellow-900"
              formatear={formatCurrency}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
