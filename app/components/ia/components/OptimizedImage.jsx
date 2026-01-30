import Image from "next/image";
import React from "react";

/**
 * Componente de imagen optimizado que usa Next.js Image
 * con soporte para imágenes de blob URLs y data URLs
 * Forwardea ref al elemento <img> o al componente Image para permitir mediciones DOM
 */
const OptimizedImage = React.forwardRef(function OptimizedImage(
  {
    src,
    alt = "",
    className = "",
    width,
    height,
    priority = false,
    style = {},
    onLoad,
    onLoadingComplete,
    draggable = false,
    isPanning = false,
    ...props
  },
  ref,
) {
  // If handler provided in different prop names, unify to a single handler
  const loadHandler = onLoad || onLoadingComplete || undefined;

  // Prepare props copy without load handlers to avoid forwarding unknown DOM props
  const safeProps = { ...props };
  delete safeProps.onLoad;
  delete safeProps.onLoadingComplete;
  // Remove transient props that must not reach DOM elements
  delete safeProps.isPanning;

  // Si es una URL de blob o data, usar img normal
  const isBlobOrData = src?.startsWith("blob:") || src?.startsWith("data:");

  if (isBlobOrData) {
    return (
      <Image
        ref={ref}
        src={src}
        alt={alt || ""}
        className={className}
        width={width || 800}
        height={height || 600}
        unoptimized
        style={{
          userSelect: "none",
          ...(style || {}),
          pointerEvents: isPanning
            ? "none"
            : (style && style.pointerEvents) || "auto",
        }}
        draggable={false}
        onDragStart={(e) => {
          e.preventDefault();
        }}
        onLoadingComplete={loadHandler}
        {...safeProps}
      />
    );
  }

  // Para URLs normales, usar Next.js Image con optimización. Map onLoad -> onLoadingComplete
  const nextProps = {
    ref,
    src,
    alt: alt || "",
    className,
    width: width || 800,
    height: height || 600,
    priority,
    unoptimized: !width || !height,
    style: { userSelect: "none", ...(style || {}) },
    draggable: false,
    onDragStart: (e) => {
      e.preventDefault();
    },
  };
  if (loadHandler) nextProps.onLoadingComplete = loadHandler;

  return <Image alt={alt || ""} {...nextProps} {...safeProps} />;
});

export default OptimizedImage;
