"use client"
import { useState, useEffect, useRef, useCallback } from 'react';
import { getProductoPorCodigoBarra } from '@/prisma/consultas/productos';
import Button from '@/app/components/formComponents/Button';
import TablaListaVenta from '@/app/components/productos/TablaListaVenta';
import { calculosFinancieros } from '@/lib/contarObjetos';

export default function Home() {
  const inputRef = useRef(null)
  const [productosEncontrados, setProductosEncontrados] = useState([])
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState({});
  const [total, setTotal] = useState(0)
  const [productoLocal, setProductoLocal] = useState({});
  const [yaSeBusco, setYaSeBusco] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async (code) => {
    setError({})
    setLoading(true)
    if(code.length >= 8){
      setProductoLocal(await getProductoPorCodigoBarra(code))
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

  const handleReset = useCallback(async () => {
    setLoading(true)
    setProductoLocal([])
    setProductosEncontrados([])
    setCodigo("")
    setError("")
    setTotal(0)
    setLoading(false)
  },[])

  useEffect(() => {
    window.removeEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    Object.keys(productoLocal).length > 1 &&
    setProductosEncontrados((productos) => [
      ...productos,
      productoLocal,
    ])

  }, [productoLocal]);

  useEffect(() => {
    setTotal(calculosFinancieros(productosEncontrados, "precioActual", "total").total)
  }, [productosEncontrados]);

  return (
    <main className='container mx-auto p-4'>

      <div className="flex flex-row align-middle">
        <div className="mb-4 w-56 mr-4">
          <input
            type="text"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Ingrese código de barras"
            ref={inputRef}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />

          <div className="flex items-center text-red-700 h-4 mt-1">
            {
              error?.codigoErroneo && <span>{error?.msg}</span>
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

            <Button tipo="rojo" className=""
              onClick={() => handleReset()}
            >
              Borrar
            </Button>
          </div>
        </div>
      </div>
      {total}
        <TablaListaVenta
          titulo={"Ventas"}
          productos={productosEncontrados}
          className='w-full mt-6'
        />
    </main>
  );
}