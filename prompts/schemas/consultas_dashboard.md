PROMPT IDEAL PARA CONSULTAS DE DASHBOARD (dashboard.js)

## PROPÓSITO GENERAL
Funciones server-side para obtener datos agregados para el dashboard principal.

## FUNCIONES PRINCIPALES

### getDashboardStats()
- Obtiene todas las estadísticas del dashboard
- Retorna objeto con:
  ```
  {
    totalVentas: Float,
    totalCompras: Float,
    caja: Float,
    margen: Float,
    stockValor: Float,
    facturasEmitidas: Int,
    proveedores: Int,
    periodoDias: Int (7, 30, 90)
  }
  ```

### getTotalVentas(desde?, hasta?)
- Suma documentos tipo SALIDA en rango
- Default: últimos 30 días
- Retorna: Float (total)

### getTotalCompras(desde?, hasta?)
- Suma documentos tipo ENTRADA en rango
- Default: últimos 30 días
- Retorna: Float (total)

### getCaja()
- Calcula diferencia: Ventas - Compras
- Últimos 30 días
- Retorna: Float

### getMargen()
- Calcula: (Ventas - Compras) / Ventas * 100
- Retorna: Float (porcentaje)

### getValorStockTotal()
- Suma: cada producto × cantidad × último precio
- Retorna: Float (valor total del inventario)

### getProductosConStockBajo()
- Cuenta productos donde stock < mínimo
- Retorna: Int (cantidad)

### getFacturasEmitidas(mes?, año?)
- Cuenta facturas emitidas en período
- Default: mes actual
- Retorna: Int

### getProveedoresActivos()
- Cuenta proveedores con pedidos en últimos 90 días
- Retorna: Int

### getPedidosPendientes()
- Cuenta pedidos con estado PENDIENTE
- Retorna: Int

### getMetricCard(tipo)
- Obtiene datos para una métrica específica
- Tipos: ventas, compras, caja, margen, stock, facturas, proveedores
- Retorna: {valor, variacion, icono}

## VARIACIONES

### getVariacionPorcentual(valorActual, valorAnterior)
- Calcula: ((actual - anterior) / anterior) * 100
- Retorna: Float (%)

### getTrendLine(metrica, dias)
- Obtiene datos diarios para graficar trend
- Parámetros: metrica (ventas, compras, stock), dias (7, 30, 90)
- Retorna: [{fecha, valor}]

## CASH FLOW

### getCashFlow(desde?, hasta?)
- Obtiene flujo de caja diario
- Retorna: {fecha, entrada, salida, balance}

## PERFORMANCE

### getTopProductos(limite, periodo)
- Productos más vendidos en período
- Parámetros: limite (10), periodo (30 días)
- Retorna: [{producto, cantidad, monto}]

### getTopProveedores(limite, periodo)
- Proveedores con más compras
- Retorna: [{proveedor, cantidad, monto}]

## ALERTAS

### getProductosAlerta()
- Productos con: stock bajo, vencimiento cercano
- Retorna: array de alertas

---

## NUEVAS CARACTERÍSTICAS

- [ ] Gráficos interactivos
- [ ] Predicciones ML
- [ ] Comparativa mes anterior
- [ ] Forecasting de stock
- [ ] Análisis de rentabilidad
- [ ] KPIs personalizables
