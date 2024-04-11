"use client"
import { imagenRanita, imagenTransparente } from '@/lib/imagenTransparente';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import ImageToBase64Uploader from '../LoadImage64';
import CameraCaptureModal from './CameraCapture';
import { ChevronPair } from './Chevron';

const SelectorImagenes = ({ imagenes: imagenesProp, proceder, ...props}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imagenes, setImagenes] = useState([])

  useEffect(() => {
    if(imagenes[currentIndex]?.imagen?.src){
      proceder(imagenes[currentIndex]?.imagen.src)
    }else{
      proceder(imagenTransparente.imagen.src)
    }
  },[currentIndex, imagenes, proceder])

  useEffect(() => {
    setImagenes(imagenesProp)
    imagenesProp.length == 0
      && setCurrentIndex(0)
  },[imagenesProp])

  const cambiarImagen = (valor) => {
    setCurrentIndex((actual) => {
      const nuevo = actual + valor
      return nuevo > imagenes.length-1 ? 0 : nuevo < 0 ? imagenes.length-1 : nuevo
    })
  };

  const addImageToGallery = (base64Image) => {
    setImagenes(prevImages => [...prevImages, { imagen: { src: base64Image, alt: "Imagen Cargada" } } ]);
    setCurrentIndex(imagenes.length);
  };

  const deleteCurrentImage = () => {
    if(imagenes.length == 1) {
      setImagenes([]);
    } else {
      setImagenes(prevImages => [...prevImages.filter((_, index) => index != currentIndex)]);
      setCurrentIndex(prev => {
       const nuevo = prev - 1;
       return nuevo < 0 ? 0 : nuevo
      });
    }
  };

  return (
    <div className='relative h-full w-full bg-slate-300 rounded-2xl overflow-hidden'>
      <div className='flex w-[400px] h-[400px]'>
        <div className='block w-full h-full relative'>
          <Image
            src={imagenes[currentIndex]?.imagen?.src || imagenRanita.imagen.src}
            alt={imagenes[currentIndex]?.imagen?.alt || imagenRanita.imagen.alt}
            fill
            //width={400}
            //height={400}
            quality={100}
            className='object-cover rounded-2xl p-1'
          />
        </div>
      </div>
      <div className='absolute inset-0 flex flex-col justify-between p-4
        group opacity-30 delay-[200ms] hover:delay-75 hover:opacity-100
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
