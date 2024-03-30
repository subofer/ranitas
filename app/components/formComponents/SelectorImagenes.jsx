"use client"
import {imagenRanita} from '@/lib/imagenTransparente';
import Image from 'next/image';
import { useEffect, useState } from 'react';

const SelectorImagenes = ({ imagenes, proceder, ...props}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [img, setImg] = useState({})

  useEffect(() => {
    setImg(imagenes[currentIndex % imagenes.length])
    proceder(imagenes[currentIndex % imagenes.length]?.imagen.src)
  },[currentIndex, imagenes, proceder])

  const cambiarImagen = (direccion) => {
    setCurrentIndex((prev) => (prev + direccion) % imagenes.length)
  };
//style={{ height: '320px', width: '320px', position: 'relative' }}
  return (
    <div className='relative bg-slate-200 rounded-2xl h-full w-full'>
      <Image
        src={img?.imagen?.src || imagenRanita.imagen.src}
        alt={img?.imagen?.alt || imagenRanita.imagen.alt}
        fill
        quality={100}
        className={"rounded-2xl p-1"}
      />
      {imagenes.length > 1 ?
      <>
        <button
          onClick={() => cambiarImagen(-1)}
          className='absolute left-0 top-1/2 transform -translate-y-1/2 bg-slate-500 text-white rounded-r-sm text-4xl'
        >
          <i className="fa-solid fa-chevron-left"/>
        </button>
        <button
          onClick={() => cambiarImagen(1)}
          className='absolute right-0 top-1/2 transform -translate-y-1/2 bg-slate-500 text-white rounded-l-sm text-4xl'
        >
          <i class="fa-solid fa-chevron-right"/>
        </button>
      </>
      :null}
    </div>
  );
}

export default SelectorImagenes;
