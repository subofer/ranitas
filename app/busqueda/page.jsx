"use client"
import { useState, useEffect, useRef, useCallback } from 'react';
import buscarPorCodigoDeBarras from '@/lib/buscarPorCodigoDeBarras';
import buscarPorCodigoDeBarrasEnGoogle from '@/lib/fetchGoogleResults';
import ResultadoBusqueda from '../components/productos/ResultadoBusqueda';
import { closeBrowserInstance } from '@/lib/puppeteerSession';
import Button from '../components/formComponents/Button';


export default function Home() {
  const inputRef = useRef(null)
  const [codigo, setCodigo] = useState('');
  const [precodigo, setPrecodigo] = useState('');
  const [html, setHtml] = useState('');
  const [productos, setProductos] = useState([]);
  const [yaSeBusco, setYaSeBusco] = useState(false);

  const handleSearch = useCallback(async () => {
    const { resultadosDeLaBusqueda, html: htmlText }  = await buscarPorCodigoDeBarras(codigo)
    setProductos(resultadosDeLaBusqueda)
    setHtml(htmlText)
    setYaSeBusco(true)
  },[codigo])

  const handleSearchCherrio = useCallback(async () => {
    const { resultadosDeLaBusqueda, html: htmlText } = await buscarPorCodigoDeBarrasEnGoogle(codigo)
    setProductos(resultadosDeLaBusqueda)
    setHtml(htmlText)
    setYaSeBusco(true)
  },[codigo])


  useEffect(() => {
    const handleKeyDown = async (e) => {
      if ("0123456789".includes(e.key)) {
        setPrecodigo(yaSeBusco ? e.key : (prev) => prev + e.key);
        setYaSeBusco(false)
      } else if (e.key === 'Enter') {
        setCodigo(precodigo)
        await handleSearch()
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
        <div className='flex flex-row gap-4'>
          <Button tipo="azul" className="mt-2"
            onClick={() => handleSearch()}
          >
            Buscar
          </Button>

          <Button tipo="azul" className="mt-2"
            onClick={() => handleSearchCherrio()}
          >
            Buscar con Cherio
          </Button>

          <Button tipo="rojo" className="mt-2"
            onClick={() => closeBrowserInstance()}
          >
            Reiniciar motor
          </Button>
        </div>
      </div>
      {
        productos?.map((producto, index) => (
          <ResultadoBusqueda key={index} resultado={producto} />
        ))
      }
      {codigo !="" && productos.length == 0 &&
        "Buscando"
      }
    </main>
  );
}

  //<div dangerouslySetInnerHTML={{ __html: html }}></div>