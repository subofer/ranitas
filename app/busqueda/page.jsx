"use client"
import { useState, useEffect, useRef, useCallback } from 'react';
import buscarPorCodigoDeBarras from '@/lib/buscarPorCodigoDeBarras';
import Button from '../components/formComponents/Button';
import ResultadoBusqueda from '../components/productos/ResultadoBusqueda';
import { getProductoPorCodigoBarra } from '@/prisma/consultas/productos';

export default function Home() {
  const inputRef = useRef(null)
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState("");
  const [productos, setProductos] = useState([]);
  const [producto, setProducto] = useState({});
  const [yaSeBusco, setYaSeBusco] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async () => {
    setError("")
    if(codigo.length >= 8){
      setLoading(true)
      const producto = await getProductoPorCodigoBarra(codigo)
      setProducto(producto)
      const { resultadosDeLaBusqueda } = await buscarPorCodigoDeBarras(codigo)
      setProductos(resultadosDeLaBusqueda)
      setLoading(false)
    } else {
      setYaSeBusco(true)
      setError(`
        ${codigo == ""
        ? "No ingreso ningun Codigo" :
        `${codigo} <- Formato de codigo incorrecto`}
      `)
    }
  },[codigo])

  const handleReset = useCallback(async () => {
    setLoading(true)
    setProductos([])
    setCodigo("")
    setLoading(false)
    setError("")
  },[])


  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        setYaSeBusco(true)
        handleSearch()
      } else {
        if("1234567890".includes(e.key)){
          setCodigo((prev) => yaSeBusco ? e.key : prev + e.key);
          setYaSeBusco(false)
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return async () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSearch, yaSeBusco]);


  return (
    <main className='container mx-auto p-4'>
      <div className="mb-4">
        <input
          type="text"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Ingrese código de barras"
          ref={inputRef}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
        />

        <div className="flex items-center text-red-700 h-4 mt-1">
          <span>{error}</span>
        </div>

        <div className='flex flex-row gap-4'>
          <Button tipo="azul" className="mt-2"
            onClick={() => handleSearch()}
            loading={loading}
          >
            Buscar
          </Button>

          <Button tipo="rojo" className="mt-2"
            onClick={() => handleReset()}
          >
            Borrar
          </Button>
        </div>
      </div>
      <div className=''>
        {
          !loading && producto && JSON.stringify(producto)
        }
      </div>
      <div className=''>
        {
          !loading && productos[0] && <ResultadoBusqueda resaltado={true} resultado={productos[0] || {}} />
        }
      </div>
      <div className='grid grid-cols-2'>
      {
        !loading && productos?.map((producto, index) =>
          <ResultadoBusqueda key={index} resultado={producto} />
        )
      }
      </div>
    </main>
  );
}