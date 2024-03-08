"use client"
import { useState, useEffect, useRef, useCallback } from 'react';
import buscarPorCodigoDeBarras from '@/lib/buscarPorCodigoDeBarras';
import { closeBrowserInstance, getBrowserInstance } from '@/lib/puppeteerSession';
import { buscarPorCodigoDeBarrasEnGoogle } from '@/lib/fetchGoogleResults';
import Producto from '../components/productos/DetalleProducto';
import Button from '../components/formComponents/Button';
import getOrganicData from '@/lib/otraGoogle';


export default function Home() {
  const inputRef = useRef(null)
  const [codigo, setCodigo] = useState('');
  const [productos, setProductos] = useState([]);
  const [yaSeBusco, setYaSeBusco] = useState(false);

  const handleSearch = useCallback(async () => {
    //setProductos(await buscarPorCodigoDeBarras(codigo));
    const pepe = await buscarPorCodigoDeBarrasEnGoogle(codigo)
    //const pepes = await getOrganicData(codigo)
    
    setYaSeBusco(true)
  },[codigo])

  useEffect(() => {
    const handleKeyDown = async (e) => {
      if ("0123456789".includes(e.key)) {
        setCodigo(yaSeBusco ? e.key : (prev) => prev + e.key);
        setYaSeBusco(false)
      } else if (e.key === 'Enter') {
        await handleSearch()
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return async () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
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

          <Button tipo="rojo" className="mt-2"
            onClick={() => closeBrowserInstance()}
          >
            Reiniciar motor
          </Button>
        </div>
      </div>
      {
        productos.map((producto, index) => (
          <Producto key={index} {...producto} />
        ))
      }
      {codigo !="" && productos.length == 0 &&
        <Producto
        titulo={"No se encontro ningun producto"}
        descripcion={"sin producto"}
        hasImagen={false}
        precio={0}
        incidencia={0}
        nombreLocal={"No hay"}
        url={""}
        />
      }

    </main>
  );
}
