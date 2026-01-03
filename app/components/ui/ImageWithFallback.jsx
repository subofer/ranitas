"use client"
import { useState } from 'react';
import { imagenRanita } from '@/lib/imagenTransparente';

const ImageWithFallback = ({
  src,
  alt,
  fallbackSrc = imagenRanita.imagen.src, // Imagen de ranita por defecto
  className = '',
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError) {
      setImgSrc(fallbackSrc);
      setHasError(true);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      onError={handleError}
      className={className}
      {...props}
    />
  );
};

export default ImageWithFallback;
