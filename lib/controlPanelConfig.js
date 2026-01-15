export const CONTROL_PANEL = {
  productos: {
    listado: {
      presentacionesAbiertasPorDefecto: true,
    },
  },
  venta: {
    modoPorDefecto: 'minorista',
    // Descuento aplicado sobre el precio minorista cuando no hay precio mayorista explícito
    descuentoMayorista: 0.1,
  },
  facturas: {
    titulo: 'Gestión de Facturas',
    descripcion: 'Administra tus facturas pagadas e impagas',
    resumen: {
      titulo: 'Resumen',
      totalLabel: 'Total de Facturas'
    },
    filtros: {
      all: { label: 'Todas', value: 'all' },
      pending: { label: 'Pendientes', estado: 'IMPAGA' },
      paid: { label: 'Pagadas', estado: 'PAGA' }
    },
    estados: {
      IMPAGA: { color: 'red', label: 'Impaga' },
      PAGA: { color: 'green', label: 'Paga' },
      PARCIAL: { color: 'yellow', label: 'Parcial' }
    }
  }
};
