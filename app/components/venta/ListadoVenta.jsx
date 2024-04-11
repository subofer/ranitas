"use client"
import { useState, useEffect, useRef, useCallback } from 'react';
import { getProductoPorCodigoBarra } from '@/prisma/consultas/productos';
import Button from '@/app/components/formComponents/Button';
import { calculosFinancieros } from '@/lib/contarObjetos';
import TablaListaProductos from '@/app/components/productos/TablaListaProductos';
import { useKeyDown } from '@/app/hooks/useKeyDown';
import { textos } from '@/lib/manipularTextos';
import Input from '@/app/components/formComponents/Input';
import { alertaTotalCompra } from '@/app/components/alertas/alertaTotalCompra';
import { guardarVentaConStock } from '@/prisma/serverActions/venta';


const ListadoVenta = ({ultimaVenta}) => {
  const inputRef = useRef(null)
  const [productosEncontrados, setProductosEncontrados] = useState([])
  const [trigger, setTrigger] = useState(true);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState({});
  const [total, setTotal] = useState(0)
  const [productoLocal, setProductoLocal] = useState({error: true});
  const [yaSeBusco, setYaSeBusco] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleTerminarVenta = () => {
    console.log(ultimaVenta)
    const detalle = Object.values(productosEncontrados)
    console.log(detalle)
    const venta = {
      detalle,
      total,
    }
    alertaTotalCompra(guardarVentaConStock, venta)
  }

  const handleSearch = useCallback(async (code) => {
    setError({})
    setLoading(true)
    if(code.length >= 8){
      const productoEncontrado = await getProductoPorCodigoBarra(code)
      if(!productoEncontrado.error) {
        setProductoLocal(productoEncontrado)
      }else{
        setError(productoEncontrado)
      }
    } else {
      setYaSeBusco(true)
      setError((prev) => ({
        ...prev,
        codigoErroneo: true,
        msg: code == "" ? "No ingreso ningun Codigo" :`${code} <- Formato de codigo incorrecto`,
      }))
    }
    setLoading(false)
  },[])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      setYaSeBusco(true)
      handleSearch(codigo)
    } else {
      if("1234567890".includes(e.key)){
        if(inputRef.current && inputRef.current === document.activeElement) {
          e.preventDefault();
        }
        setCodigo((prev) => yaSeBusco ? e.key : prev + e.key);
        yaSeBusco && setYaSeBusco(false)
      }
    }
  },[codigo, yaSeBusco, handleSearch]);
  useKeyDown(handleKeyDown);

  const handleReset = useCallback(async () => {
    setLoading(true)
    setProductoLocal([])
    setProductosEncontrados([])
    setCodigo("")
    setError("")
    setTotal(0)
    setLoading(false)
  },[])

  const cacularParciales = () => {
    setProductosEncontrados((prev) => {
      const productos = prev.map(item => (item.cantidad > 0 ? {...item, sumaVenta: item.cantidad * item.precioActual} : null)).filter(Boolean)
      setTotal(calculosFinancieros(productos, "sumaVenta", "total")?.total || 0)
      return productos;
    })
  }

  const agregarProductoLocal = (localNuevo) => {
    if (!localNuevo.error) {
      setProductosEncontrados((prev) => {
        const iEncontrado = prev.findIndex(({codigoBarra}) => codigoBarra === localNuevo.codigoBarra);
        return (
          iEncontrado !== -1
            ? prev.map((p, i) => i === iEncontrado ? { ...p, cantidad: p.cantidad + 1} : p)
            : [...prev, { ...localNuevo, cantidad: 1 }]
        )
      });
    }
  }
  const restarProductoLocal = (localNuevo) => {
    if (!localNuevo.error) {
      setProductosEncontrados((prev) => {
        const iEncontrado = prev.findIndex(({codigoBarra}) => codigoBarra === localNuevo.codigoBarra);
        return prev.map((p, i) => i === iEncontrado ? { ...p, cantidad: p.cantidad - 1} : p).map(item => (item.cantidad > 0 ? {...item, sumaVenta: item.cantidad * item.precioActual} : null)).filter(Boolean)
      });
    }
  }
  const setearCantidadProductoLocal = (localNuevo, nuevaCantidad) => {
      if (!localNuevo.error) {
        setProductosEncontrados((prev) => {
          const iEncontrado = prev.findIndex(({codigoBarra}) => codigoBarra === localNuevo.codigoBarra);
          return prev.map((p, i) => {
            if (i === iEncontrado) {
              const cantidadActualizada = Math.max(0, nuevaCantidad); // Asegura que la cantidad no sea negativa
              return {
                ...p,
                cantidad: cantidadActualizada,
                sumaVenta: cantidadActualizada * p.precioActual
              };
            }
            return p;
          });
        });
      }
    };

  useEffect(() => {
    agregarProductoLocal(productoLocal);
  }, [productoLocal]);

  useEffect(cacularParciales, [trigger, productoLocal]);

  const ComponenteTituloTotales = () => {
    return(
      <div className="px-2 pt-2 flex flex-row align-middle bg-lime-300">
        <div className="mb-4 w-56 mr-4">
          <Input
            type="text"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Escanee código de barras"
            ref={inputRef}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />

          <div className="flex items-center text-red-700 h-4 mt-1 ml-1">
            {
              error?.error && <span>{error?.msg}</span>
            }
          </div>
        </div>
        <div>
          <div className='flex flex-row gap-4'>
            <Button tipo="azul" className=""
              onClick={() => handleSearch(codigo)}
              loading={loading}
            >
              Buscar
            </Button>
            <div className='flex flex-row text-center justify-center align-middle'>
        {/*
            */}
        <Input
            type="text"
            label="Total"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Ingrese código de barras"
            value={textos.monedaDecimales(total)}
            onChange={(e) => {}}
          />
        </div>
            <Button tipo="rojo" className=""
              onClick={handleReset}
            >
              Eliminar
            </Button>
            <Button tipo="azul" className=""
              onClick={handleTerminarVenta}
            >
              Cobrar
            </Button>
          </div>
        </div>
      </div>
      )
  }
  const columnas = ['codigoBarra', 'cat', 'nombre', 'precioActual', 'cantidad','precioTotal', 'imagen', 'eliminarLocal']

  return (
    <main className='container mx-auto p-4 overflow-hidden'>
      <TablaListaProductos
        trigger={() => setTrigger(!trigger)}
        columnas={columnas}
        titulo={total != 0 ? `Venta Total: ${total}`: "Venta, comienze a escanear"}
        ComponenteTituloProp={ComponenteTituloTotales}
        productos={productosEncontrados}
        especialCounter={{
          sumarProducto: agregarProductoLocal,
          restarProducto: restarProductoLocal,
          setearCantidadProducto: setearCantidadProductoLocal,
        }}
        tipo='totales'
        />
    </main>
  );
}

export default ListadoVenta;