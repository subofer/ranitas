"use client"
import { useState, useEffect, useRef, useCallback } from 'react';
import buscarPorCodigoDeBarras from '@/lib/buscarPorCodigoDeBarras';
import Button from '@/app/components/formComponents/Button';
import ResultadoBusqueda from '@/app/components/productos/ResultadoBusqueda';
import { useKeyDown } from '@/app/hooks/useKeyDown';

export default function PageBusquedaProductosEnGoogle() {
  const inputRef = useRef(null)
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState({});
  const [productosGoogle, setProductosGoogle] = useState([]);
  const [yaSeBusco, setYaSeBusco] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async (code) => {
    setError({})
    setLoading(true)
    if(code.length >= 8){
      setProductosGoogle({...(await buscarPorCodigoDeBarras(code))}.mejoresResultados)
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
    setProductosGoogle([])
    setProductoLocal({})
    setCodigo("")
    setLoading(false)
    setError("")
  },[])

  useKeyDown(handleKeyDown)
  
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
            <Button
              tipo="azul"
              onClick={() => handleSearch(codigo)}
              loading={loading}
            >
              Buscar
            </Button>

            <Button tipo="rojo"
              onClick={() => handleReset()}
            >
              Borrar
            </Button>
          </div>
        </div>
      </div>
      <div>
        {
          !loading && productosGoogle[0] && <ResultadoBusqueda resaltado={true} resultado={productosGoogle[0] || {}} />
        }
      </div>
      <div className='grid grid-cols-2'>
      {
        !loading && productosGoogle?.map((producto, index) =>
          <ResultadoBusqueda key={index} resultado={producto} />
        )
      }
      </div>
    </main>
  );
}