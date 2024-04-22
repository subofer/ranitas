"use client"
import { imagenRanita } from '@/lib/imagenTransparente';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import ImageToBase64Uploader from '../LoadImage64';
import CameraCaptureModal from './CameraCapture';
import { ChevronPair } from './Chevron';
import { showImagenProducto } from '../productos/showImagenProducto';

const SelectorImagenes = ({ imagenes: imagenesProp, proceder, onClick, className, ...props}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imagenes, setImagenes] = useState([])

  useEffect(() => {
    setImagenes(imagenesProp)
    imagenesProp.length == 0 && setCurrentIndex(0)
  },[imagenesProp])

  const cambiarImagen = (v) => {
    setCurrentIndex((n) => n + v > imagenes.length-1 ? 0 : n + v < 0 ? imagenes.length-1 : n + v)
  };

  const addImageToGallery = (base64Image) => {
    setImagenes(prevImages => [...prevImages, { imagen: { src: base64Image, alt: "Imagen Cargada" } } ]);
    setCurrentIndex(imagenes.length);
  };

  const deleteCurrentImage = () => {
    setImagenes(prevImages => [...prevImages.filter((_, index) => index != currentIndex)]);
    setCurrentIndex(prev => prev - 1 < 0 ? 0 : prev - 1);
  };

  return (
    <div
      className={`flex relative w-full lg:w-fit bg-white ${className}`}
        onClick={() => false && showImagenProducto({imagen:imagenes[currentIndex]?.imagen?.src, nombre:props.nombre})}
      >
        <div className="relative w-screen mx-auto h-screen max-w-[300px] max-h-[300px]">
          <Image
            src={imagenes[currentIndex]?.imagen?.src || imagenRanita.imagen.src}
            alt={imagenes[currentIndex]?.imagen?.alt || imagenRanita.imagen.alt}
            fill
            //width={320}
            //height={320}
            quality={100}
            className='relative rounded-2xl p-1'
          />
        </div>

      <div className='absolute inset-0 flex flex-col justify-between p-4
        group opacity-60 hover:opacity-100
        transition-opacity ease-in-out duration-500
        '>

        <div className='flex justify-between items-start'>
          <Icon icono="trash-can" regular
                onClick={deleteCurrentImage}
                className='text-lg text-white bg-slate-500 px-4 py-2 rounded-full'
          />
          <Icon icono="camera"
                onClick={addImageToGallery}
                className='text-lg text-white bg-slate-500 px-3 py-2 rounded-full'
          />
        </div>
        <div className='self-center'>
          <ChevronPair onClick={cambiarImagen}/>
        </div>

        <div className='absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-1/2'>
          <ImageToBase64Uploader onImageUpload={addImageToGallery} />
        </div>
      </div>
    </div>
  );
}

export default SelectorImagenes;
