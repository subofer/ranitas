"use client"
import { useState } from 'react';
import Image from 'next/image';
import { imagenRanita } from '@/lib/imagenTransparente';

const ImageWithFallback = ({
  src,
  alt,
  fallbackSrc = imagenRanita.imagen.src,
  className = '',
  width,
  height,
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError && imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
      setHasError(true);
    }
  };

  // Si no tenemos width/height, usar Image con fill
  if (!width || !height) {
    return (
      <Image
        src={imgSrc}
        alt={alt}
        fill
        onError={handleError}
        className={className}
        {...props}
      />
    );
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      onError={handleError}
      className={className}
      {...props}
    />
  );
};

export default ImageWithFallback;
