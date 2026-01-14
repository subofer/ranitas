"use client"
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getProductosParaVenta } from '@/prisma/consultas/productos';
import Button from '@/components/formComponents/Button';
import { calculosFinancieros } from '@/lib/contarObjetos';
import TablaListaProductos from '@/components/productos/TablaListaProductos';
import { textos } from '@/lib/manipularTextos';
import Input from '@/components/formComponents/Input';
import { alertaTotalCompra } from '@/components/alertas/alertaTotalCompra';
import { guardarVentaConStock } from '@/prisma/serverActions/venta';
import { CONTROL_PANEL } from '@/lib/controlPanelConfig';
import Swal from 'sweetalert2';
import FilterSelect from '@/components/formComponents/FilterSelect';


const ListadoVenta = ({ultimaVenta}) => {
  const selectorRef = useRef(null)
  const [productosEncontrados, setProductosEncontrados] = useState([])
  const [error, setError] = useState({});
  const [loading, setLoading] = useState(false);
  const [modoVenta, setModoVenta] = useState(CONTROL_PANEL?.venta?.modoPorDefecto || 'minorista');

  const [productosVenta, setProductosVenta] = useState([]);
  const [selectorKey, setSelectorKey] = useState(0);

  const generarLineaId = () => {
    if (typeof crypto !== 'undefined' && crypto?.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const pedirPesoYVariedad = useCallback(async (producto, { pesoInicial, variedadInicial } = {}) => {
    const nombre = producto?.nombre || 'Producto';
    const imagen = producto?.imagen;
    const unidad = producto?.unidad || 'kg';
    const precio = Number(producto?.precios?.[0]?.precio) || 0;
    const presentaciones = Array.isArray(producto?.presentaciones) ? producto.presentaciones : [];

    const tieneOpciones = presentaciones.length > 0;
    const selectHtml = tieneOpciones
      ? `
        <label style="display:block;text-align:left;font-size:12px;margin-top:10px;margin-bottom:6px;color:#374151;">Variedad</label>
        <select id="swal-variedad" class="swal2-input" style="margin:0;width:100%;">
          <option value="">(sin especificar)</option>
          ${presentaciones.map((p) => `<option value="${String(p.nombre || '').replaceAll('"', '&quot;')}">${String(p.nombre || '')}</option>`).join('')}
        </select>
      `
      : `
        <label style="display:block;text-align:left;font-size:12px;margin-top:10px;margin-bottom:6px;color:#374151;">Variedad (opcional)</label>
        <input id="swal-variedad" class="swal2-input" style="margin:0;width:100%;" placeholder="Ej: Suave / Fuerte / Mix" value="${String(variedadInicial || '').replaceAll('"', '&quot;')}" />
      `;

    const { isConfirmed, value } = await Swal.fire({
      title: 'Venta a granel',
      confirmButtonText: 'Agregar',
      cancelButtonText: 'Cancelar',
      showCancelButton: true,
      focusConfirm: false,
      html: `
        <div style="display:flex;gap:12px;align-items:flex-start;">
          ${imagen ? `<img src="${imagen}" alt="" style="width:56px;height:56px;border-radius:12px;object-fit:cover;border:1px solid #e5e7eb;" />` : ''}
          <div style="text-align:left;flex:1;">
            <div style="font-weight:700;color:#111827;">${nombre}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:2px;">Precio: $${precio.toFixed(2)} / ${unidad}</div>
          </div>
        </div>

        <label style="display:block;text-align:left;font-size:12px;margin-top:12px;margin-bottom:6px;color:#374151;">Peso (${unidad})</label>
        <input id="swal-peso" class="swal2-input" style="margin:0;width:100%;" type="number" min="0" step="0.001" value="${pesoInicial ?? ''}" placeholder="0.250" />

        ${selectHtml}
      `,
      didOpen: () => {
        const elPeso = document.getElementById('swal-peso');
        if (elPeso) {
          elPeso.focus();
          elPeso.select?.();
        }
        const elVar = document.getElementById('swal-variedad');
        if (elVar && typeof variedadInicial === 'string' && variedadInicial) {
          try { elVar.value = variedadInicial; } catch {}
        }
      },
      preConfirm: () => {
        const elPeso = document.getElementById('swal-peso');
        const elVar = document.getElementById('swal-variedad');
        const peso = Number(elPeso?.value);
        const variedad = (elVar?.value || '').trim();
        if (!Number.isFinite(peso) || peso <= 0) {
          Swal.showValidationMessage('Ingresá un peso válido (mayor a 0).');
          return;
        }
        return { peso, variedad };
      },
    });

    if (!isConfirmed) return null;
    return value;
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { productos = [] } = await getProductosParaVenta({ take: 5000 });
        if (!alive) return;
        // Precalcular label para dropdown
        const list = productos.map((p) => ({
          ...p,
          labelVenta: `${p.nombre} (${p.codigoBarra})${p.descripcion ? ` — ${p.descripcion}` : ''}`,
        }));
        setProductosVenta(list);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    // Modo POS: dejar el foco siempre en el buscador
    const t = setTimeout(() => selectorRef.current?.focus?.(), 50);
    return () => clearTimeout(t);
  }, [selectorKey]);

  const calcularPrecio = useCallback((producto, modo) => {
    const precioMinorista = Number(producto?.precios?.[0]?.precio) || 0;
    if (modo === 'mayorista') {
      const descuento = Number(CONTROL_PANEL?.venta?.descuentoMayorista) || 0;
      const p = precioMinorista * (1 - descuento);
      return Math.max(0, Math.round(p * 100) / 100);
    }
    return precioMinorista;
  }, []);

  const handleTerminarVenta = () => {
    console.log(ultimaVenta)
    const detalle = Object.values(productosConSuma)
    console.log(detalle)
    const venta = {
      detalle,
      total,
      modoVenta,
    }
    alertaTotalCompra(guardarVentaConStock, venta)
  }

  const agregarProducto = useCallback(async (prod) => {
    if (!prod || prod.error) return;

    const esGranel = prod?.tipoVenta === 'GRANEL';
    let cantidad = 1;
    let variedad = '';
    let unidadVenta = null;

    if (esGranel) {
      const resp = await pedirPesoYVariedad(prod);
      if (!resp) return;
      cantidad = Number(resp.peso) || 0;
      variedad = (resp.variedad || '').trim();
      unidadVenta = prod?.unidad || 'kg';
    }

    const precioActual = calcularPrecio(prod, modoVenta);
    const idProducto = prod?.idProducto ?? prod?.id;
    const criterioVar = esGranel ? `::${variedad.toLowerCase()}` : '';

    setProductosEncontrados((prev) => {
      const iEncontrado = prev.findIndex((p) => (p.idProducto || p.id) === idProducto && (esGranel ? (String(p.variedad || '').toLowerCase() === variedad.toLowerCase()) : p.tipoVenta !== 'GRANEL'));

      if (iEncontrado !== -1) {
        const next = [...prev];
        const actual = next[iEncontrado];
        const nuevaCantidad = (Number(actual.cantidad) || 0) + cantidad;
        next[iEncontrado] = { ...actual, cantidad: nuevaCantidad, precioActual, unidadVenta: actual.unidadVenta || unidadVenta, variedad: actual.variedad || variedad };
        return next;
      }

      return [
        ...prev,
        {
          ...prod,
          id: `${idProducto}${criterioVar}::${generarLineaId()}`,
          idProducto,
          cantidad,
          precioActual,
          unidadVenta,
          variedad,
        },
      ];
    });
  }, [calcularPrecio, modoVenta, pedirPesoYVariedad]);

  const handleEliminarVenta = useCallback((item) => {
    setProductosEncontrados((prev) => prev.filter((p) => p.id !== item?.id));
  }, []);

  const handleReset = useCallback(async () => {
    setProductosEncontrados([])
    setError({})
    setSelectorKey((k) => k + 1)
    selectorRef.current?.focus?.();
  },[])

  const agregarProductoLocal = useCallback((localNuevo) => {
    if (!localNuevo?.error) {
      agregarProducto(localNuevo);
    }
  }, [agregarProducto]);
  const restarProductoLocal = (localNuevo) => {
    if (!localNuevo.error) {
      setProductosEncontrados((prev) => {
        const iEncontrado = prev.findIndex(({id}) => id === localNuevo.id);
        return prev.map((p, i) => i === iEncontrado ? { ...p, cantidad: (Number(p.cantidad) || 0) - 1} : p).filter((item) => (Number(item.cantidad) || 0) > 0)
      });
    }
  }
  const setearCantidadProductoLocal = (localNuevo, nuevaCantidad, extra = {}) => {
      if (!localNuevo.error) {
        setProductosEncontrados((prev) => {
          const iEncontrado = prev.findIndex(({id}) => id === localNuevo.id);
          return prev.map((p, i) => {
            if (i === iEncontrado) {
              const cantidadActualizada = Math.max(0, Number(nuevaCantidad)); // Asegura que la cantidad no sea negativa
              return {
                ...p,
                cantidad: cantidadActualizada,
                
                ...extra,
              };
            }
            return p;
          });
        });
      }
    };

  const handleEditarGranel = useCallback(async (item) => {
    const resp = await pedirPesoYVariedad(item, { pesoInicial: item?.cantidad, variedadInicial: item?.variedad });
    if (!resp) return;
    const nuevaCantidad = Number(resp.peso) || 0;
    const nuevaVariedad = (resp.variedad || '').trim();

    // Si cambió la variedad y ya existe otra línea igual, mergear.
    setProductosEncontrados((prev) => {
      const idx = prev.findIndex((p) => p.id === item.id);
      if (idx === -1) return prev;

      const idProducto = prev[idx].idProducto || prev[idx].id;
      const idxMerge = prev.findIndex((p, i) => i !== idx && (p.idProducto || p.id) === idProducto && String(p.variedad || '').toLowerCase() === nuevaVariedad.toLowerCase());

      const next = [...prev];
      if (idxMerge !== -1) {
        const sum = (Number(next[idxMerge].cantidad) || 0) + nuevaCantidad;
        next[idxMerge] = { ...next[idxMerge], cantidad: sum };
        next.splice(idx, 1);
        return next;
      }
      next[idx] = { ...next[idx], cantidad: nuevaCantidad, variedad: nuevaVariedad, unidadVenta: next[idx].unidadVenta || (next[idx].unidad || 'kg') };
      return next;
    });
  }, [pedirPesoYVariedad]);

  const productosConSuma = useMemo(() => {
    return (productosEncontrados || [])
      .map((p) => {
        const cant = Number(p?.cantidad) || 0;
        const precio = Number(p?.precioActual) || 0;
        return cant > 0 ? { ...p, sumaVenta: cant * precio } : null;
      })
      .filter(Boolean);
  }, [productosEncontrados]);

  const total = useMemo(() => {
    return calculosFinancieros(productosConSuma, "sumaVenta", "total")?.total || 0;
  }, [productosConSuma]);

  // Si cambia el modo, recalcular precioActual de todos los renglones
  useEffect(() => {
    setProductosEncontrados((prev) => prev.map((p) => ({
      ...p,
      precioActual: calcularPrecio(p, modoVenta),
    })));
  }, [modoVenta, calcularPrecio]);

  const ComponenteTituloTotales = () => {
    return(
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-visible">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-[260px] flex-1">
              <div className="text-sm font-medium text-gray-900 mb-2">Punto de venta</div>
              <FilterSelect
                key={selectorKey}
                ref={selectorRef}
                name="productoVenta"
                label="Buscar producto"
                placeholder="Escriba para filtrar (Enter agrega el primero)"
                value={null}
                options={productosVenta}
                valueField="id"
                textField="labelVenta"
                busy={loading}
                size="kiosk"
                acceptFirstOnEnter
                disableMouseSelect
                onChange={async ({ option }) => {
                  if (!option) return;
                  await agregarProducto(option);
                  setSelectorKey((k) => k + 1);
                  selectorRef.current?.focus?.();
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Modo</span>
              <Button
                tipo={modoVenta === 'minorista' ? 'inline' : 'neutro'}
                onClick={() => setModoVenta('minorista')}
                className="px-5 py-3 text-base"
              >
                Minorista
              </Button>
              <Button
                tipo={modoVenta === 'mayorista' ? 'inline' : 'neutro'}
                onClick={() => setModoVenta('mayorista')}
                className="px-5 py-3 text-base"
              >
                Mayorista
              </Button>
            </div>

            <div className="min-w-[260px]">
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                <div className="text-sm font-medium text-gray-700">Total</div>
                <div className="text-3xl font-bold text-gray-900 tabular-nums leading-none mt-1">
                  {textos.monedaDecimales(total)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button tipo="borrar" onClick={handleReset} className="px-5 py-3 text-base">
                Limpiar
              </Button>
              <Button tipo="enviar" onClick={handleTerminarVenta} className="px-5 py-3 text-base">
                Cobrar
              </Button>
            </div>
          </div>
        </div>
      </div>
      )
  }
  const columnas = ['codigoBarra', 'cat', 'nombre', 'precioActual', 'cantidadVenta','precioTotal', 'imagen', 'eliminarVenta']

  return (
    <main className='container mx-auto p-4 overflow-visible'>
      <TablaListaProductos
        size="kiosk"
        columnas={columnas}
        titulo={total != 0 ? `Venta Total: ${total}`: "Venta, comienze a escanear"}
        ComponenteTituloProp={ComponenteTituloTotales}
        productos={productosConSuma}
        especialCounter={{
          sumarProducto: agregarProductoLocal,
          restarProducto: restarProductoLocal,
          setearCantidadProducto: setearCantidadProductoLocal,
        }}
        onEditarGranel={handleEditarGranel}
        onEliminarVenta={handleEliminarVenta}
        tipo='totales'
        />
    </main>
  );
}

export default ListadoVenta;