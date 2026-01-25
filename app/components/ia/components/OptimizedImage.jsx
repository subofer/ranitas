import Image from 'next/image'

/**
 * Componente de imagen optimizado que usa Next.js Image
 * con soporte para imágenes de blob URLs y data URLs
 */
export default function OptimizedImage({ 
  src, 
  alt, 
  className = '', 
  width,
  height,
  priority = false,
  ...props 
}) {
  // Si es una URL de blob o data, usar img normal
  const isBlobOrData = src?.startsWith('blob:') || src?.startsWith('data:')
  
  if (isBlobOrData) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img 
        src={src} 
        alt={alt} 
        className={className}
        {...props}
      />
    )
  }
  
  // Para URLs normales, usar Next.js Image con optimización
  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      width={width || 800}
      height={height || 600}
      priority={priority}
      unoptimized={!width || !height}
      {...props}
    />
  )
}
