"use client"
import { useState, useEffect, useCallback, useRef } from 'react';
import Image from "next/image";
import buscarPorCodigoDeBarras from '@/lib/buscarPorCodigoDeBarras';
import { closeBrowserInstance, getBrowserInstance } from '@/lib/puppeteerSession';
import { buscarPorCodigoDeBarrasEnGoogle } from '@/lib/fetchGoogleResults';

function Producto({
  titulo,
  descripcion,
  imagen,
  hasImagen,
  precio,
  incidencia,
  nombreLocal,
  url,
}) {

  return (
    <div className="w-full flex flex-row justify-between rounded overflow-hidden shadow-lg mb-4">
      <div className="w-4/5 px-6 py-4">
        <div className='flex flex-row gap-4'>
          <div className="font-bold text-xl mb-2">
          <a target="_blank" href={url} rel="noopener noreferrer">
            {incidencia} - {nombreLocal}
          </a>
          </div>
        </div>
        <div className='flex flex-row gap-4'>
          <div className="font-bold text-xl mb-2">${precio}</div>
          <div className="font-bold text-xl mb-2"> - </div>
          <div className="font-bold text-xl mb-2">{titulo}</div>
        </div>
        <p className="text-gray-700 text-base">{descripcion}</p>
      </div>
      <div className="w-24 h-24 relative">
        {
          hasImagen
            ? <Image src={imagen} alt={titulo} width={94} height={94}/>
            : null
        }

      </div>
    </div>
  );
}

export default function Home() {
  const inputRef = useRef(null)
  const [codigo, setCodigo] = useState('');
  const [buscado, setBuscado] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [productos, setProductos] = useState([]);

  const handleSearch = useCallback(async () => {
    if(codigo.trim() === '') return;
    setBuscando(true);
    try {
      const datos = await buscarPorCodigoDeBarras(codigo);
      const datos2 = await buscarPorCodigoDeBarrasEnGoogle(codigo)
      console.log(datos2)
      setProductos(datos || []);
      setBuscado(true);
    } catch (error) {
      console.error('Error en la búsqueda', error);
    } finally {
      setBuscando(false);
    }
  }, [codigo]);


  useEffect(() => {
    const handleKeyDown = (e) => {
      if ("0123456789".includes(e.key)) {
        if (buscado) {
          setCodigo("");
          setBuscado(false);
        } else {
          setCodigo((prev) => prev + e.key);
        }
      } else if (e.key === 'Enter' && !buscado) {
        handleSearch();
        setBuscado(true);
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return async () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSearch]);


  return (
    <main className='container mx-auto p-4'>
      <div className="mb-4">
        <input
          ref={inputRef}
          type="text"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Ingrese código de barras"
        />
        <div className='flex flex-row gap-4'>
          <button
            onClick={handleSearch}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-2"
          >
            Buscar
          </button>
          <button
            onClick={() => closeBrowserInstance()}
            className="bg-red-300 hover:bg-red-400 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-2"
            >
            Reiniciar motor
          </button>
        </div>
      </div>
      {
        productos.map((producto, index) => (
          <Producto key={index} {...producto} />
        ))
      }
      {!buscando && codigo !="" && productos.length == 0 &&
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
      {buscando &&
        <Producto
        titulo={"Buscando"}
        descripcion={"1"}
        hasImagen={false}
        precio={0}
        incidencia={0}
        nombreLocal={"1"}
        url={"1"}
        />
      }
    </main>
  );
}
