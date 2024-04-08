"use client"
import { imagenRanita } from '@/lib/imagenTransparente';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import ImageToBase64Uploader from '../LoadImage64';
import CameraCaptureModal from './CameraCapture';

const Chevron = ({direccion, onClick}) => {
  const n = direccion == "left" ? -1 : 1;
  return(
    <button
        onClick={() => onClick(n)}
        className={`absolute ${direccion}-0 top-1/2 transform -translate-y-1/2 bg-slate-500 text-white rounded-r-sm text-4xl`}
    >
      <i className={`fa-solid fa-chevron-${direccion}`}/>
    </button>
  )
}

const SelectorImagenes = ({ imagenes: imagenesProp, proceder, ...props}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imagenes, setImagenes] = useState(imagenesProp)
  const [img, setImg] = useState({})

  useEffect(() => {
    setImg(imagenes[currentIndex % imagenes.length])
    proceder(imagenes[currentIndex % imagenes.length]?.imagen.src)
  },[currentIndex, imagenes, proceder])

  const cambiarImagen = (direccion) => {
    setCurrentIndex((prev) => (prev + direccion) % imagenes.length)
  };

  const addImageToGallery = (base64Image) => {
    const newImage = {
      imagen: { src: base64Image, alt: "Imagen Cargada" }
    };
    setImagenes(prevImages => [...prevImages, newImage]);
    setCurrentIndex(imagenes.length); // Cambia a la nueva imagen agregada
  };

  const deleteCurrentImage = () => {
    if(imagenes.length == 1){
      setImagenes([]);
    } else{
      setImagenes(prevImages => [...prevImages.filter((img, index) => index != currentIndex)]);
      setCurrentIndex(prev => prev === 0 ? 0 : prev - 1);
    }
  };
  return (
    <div className='relative bg-slate-200 rounded h-full w-full'>
      <Image
        src={img?.imagen?.src || imagenRanita.imagen.src}
        alt={img?.imagen?.alt || imagenRanita.imagen.alt}
        fill
        quality={100}
        className={"rounded-2xl p-1"}
      />
      {imagenes.length > 1 ?
      <>
        <Chevron onClick={cambiarImagen} direccion={"left"}/>
        <Chevron onClick={cambiarImagen} direccion={"right"}/>
      </>
      :null}
      <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-36'>
        <ImageToBase64Uploader onImageUpload={addImageToGallery} />
      </div>
      {imagenes.length > 0 &&
      <div className='absolute top-4 right-3 text-lg text-white bg-slate-500 px-2 rounded-full'>
        <Icon onClick={deleteCurrentImage} regular icono={"trash-can"} />
      </div>
      }
      <div className='absolute top-4 left-3 text-lg text-white bg-slate-500 px-2 py-1 rounded-full'>
        <CameraCaptureModal onCapture={addImageToGallery} />
      </div>
    </div>
  );
}

export default SelectorImagenes;
