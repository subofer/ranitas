PROMPT IDEAL PARA REGENERAR DolarHoy.jsx

## PROPÓSITO GENERAL
Componente cliente que obtiene y muestra cotización del dólar en tiempo real.

## FUNCIONALIDADES
- Fetch cotización desde API
- Display de precio actual
- Variación % vs ayer
- Actualización automática
- Loading y error states

## PROPS
- refreshInterval?: number - Intervalo de refresh (ms, default: 600000)
- showVariation?: boolean - Mostrar variación %

## DISPLAY
- Dólar actual: $XXXX
- Variación: +/- X.XX%
- Icono trend (↗↘)
- Hora última actualización

## LÓGICA
- useEffect con fetch
- Debounce de actualizaciones
- Error boundary
- Caché local

---

## NUEVAS CARACTERÍSTICAS

- [ ] Histórico de precios
- [ ] Gráfico de 30 días
- [ ] Alertas de cambio
- [ ] Múltiples monedas
