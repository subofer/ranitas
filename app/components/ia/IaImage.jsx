"use client";
import React, { useState, useEffect, useRef } from "react";
import NextImage from "next/image";
import { useVisionStatusContext } from "@/context/VisionStatusContext";
import logger from '@/lib/logger'
// ImageCropper modal moved to 'cementerio' — preserved as commented JSX below
// import ImageCropper from './ImageCropper'
import FilterSelect from "../formComponents/FilterSelect";
import {
  buscarProveedor,
  buscarProducto,
  buscarPedidosRelacionados,
  verificarFacturaDuplicada,
  guardarAuditoriaEdicion,
} from "@/prisma/serverActions/facturaActions";
import { buscarAliasesPorItems } from "@/prisma/serverActions/buscarAliases";
import { guardarFacturaCompra } from "@/prisma/serverActions/documentos";

// Importar utilidades compartidas
import { DEFAULT_ADJUSTMENTS, MODES } from "@/lib/ia/constants";
import { useImageAutoFocus, useImageTransformations } from "@/lib/ia/hooks";

// Importar componentes modulares
import {
  CampoEditable,
  ImageControlsOverlay,
  AlertaFacturaDuplicada,
  ResultadoBusquedaProveedor,
  PedidosRelacionados,
  EncabezadoFactura,
  TotalesFactura,
  ListaProductos,
  LoadingSkeletons,
  OptimizedImage,
  ImageColumn,
  ModalMapeoAlias,
  ModalCrearProveedor,
} from "./components";
import FacturaResumenFooter from "./components/FacturaResumenFooter";
import SelectorProveedorSimilar from "./SelectorProveedorSimilar";
import CameraCaptureModal from "@/components/formComponents/CameraCapture";
// Eliminado: ManualVertexCropper ya no se usa
// import ManualVertexCropper from "./ManualVertexCropper";

// ========== COMPONENTE PRINCIPAL ==========
export default function IaImage({ model }) {
  // Estados
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("factura");
  const [metadata, setMetadata] = useState(null);
  // showCropper modal retired (moved to cementerio). Use inline manual cropper instead.
  // const [showCropper, setShowCropper] = useState(false)
  // const [tempFile, setTempFile] = useState(null)
  // const [tempPreview, setTempPreview] = useState(null)

  // Streaming preview removed — was unreliable. Kept code history in 'cementerio' if needed.
  const [streaming, setStreaming] = useState(false);
  const [streamCrop, setStreamCrop] = useState(null);
  const [streamCropPoints, setStreamCropPoints] = useState(null);
  const [streamRestored, setStreamRestored] = useState(null);
  const [streamInferPreview, setStreamInferPreview] = useState(null);
  const [streamInferMeta, setStreamInferMeta] = useState(null);
  const [streamOcr, setStreamOcr] = useState(null);
  const [streamItems, setStreamItems] = useState(null);
  const [streamError, setStreamError] = useState(null);

  const [proveedorEncontrado, setProveedorEncontrado] = useState(null);
  const [productosBuscados, setProductosBuscados] = useState({});
  const [pedidosRelacionados, setPedidosRelacionados] = useState([]);
  const [facturaDuplicada, setFacturaDuplicada] = useState(null);
  const [aliasesPorItem, setAliasesPorItem] = useState([]);
  const [buscandoDatos, setBuscandoDatos] = useState(false);

  // Modal de selector de proveedor
  const [modalProveedor, setModalProveedor] = useState(false);
  const [modalCrearProveedor, setModalCrearProveedor] = useState(false);

  // Modal de mapeo
  const [modalMapeo, setModalMapeo] = useState({
    open: false,
    alias: null,
    itemIndex: null,
  });
  const [productosParaMapeo, setProductosParaMapeo] = useState([]);
  const [guardandoFactura, setGuardandoFactura] = useState(false);

  // Estado para el modal de cámara
  const [cameraOpen, setCameraOpen] = useState(false);

  const [mostrarControles, setMostrarControles] = useState(false);
  const [ajustes, setAjustes] = useState(DEFAULT_ADJUSTMENTS);

  // Estados para zoom y pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Estados para permitir deshacer auto-enfoque
  const [imagenOriginal, setImagenOriginal] = useState(null);
  const [imagenMejorada, setImagenMejorada] = useState(null); // archivo mejorado (si aplica)
  const [previewOriginal, setPreviewOriginal] = useState(null);
  const [imageBlobs, setImageBlobs] = useState({}); // { url: blob }
  const [autoEnfoqueAplicado, setAutoEnfoqueAplicado] = useState(false);
  // Estado para indicar si la imagen que se muestra es la original, mejorada o recortada
  const [imagenStatus, setImagenStatus] = useState("original"); // 'original' | 'mejorada' | 'recortada'
  // Estado para drag & drop
  const [dragActive, setDragActive] = useState(false);

  // Estado para crop manual
  const [cropMode, setCropMode] = useState(false);

  // Refs
  const canvasRef = useRef(null);
  const imgOriginalRef = useRef(null);
  // Abort controller for in-flight analysis request (so user can cancel)
  const analysisControllerRef = useRef(null);

  // Hooks personalizados
  const autoEnfocar = useImageAutoFocus();
  const aplicarTransformaciones = useImageTransformations(
    preview,
    imgOriginalRef,
    canvasRef,
    ajustes,
    zoom,
    pan,
  );

  // Estado de IA local (para saber si el modelo está cargado)
  const { getModelStatus } = useVisionStatusContext();

  // Efectos
  useEffect(() => {
    if (mostrarControles) {
      aplicarTransformaciones();
    }
  }, [ajustes, mostrarControles, aplicarTransformaciones]);

  // Handlers
  const onFile = (f) => {
    if (!f) return;

    try {
      // Crear URL para preview
      const previewUrl = URL.createObjectURL(f);

      // Guardar imagen original
      setImagenOriginal(f);
      // No configurar previewOriginal aquí - solo se configura después del primer crop
      setPreviewOriginal(null);
      setShowOriginalPreview(false); // Reset para mostrar la nueva imagen como original
      setImagenMejorada(null);
      setImagenStatus('original');
      setFile(f);
      setPreview(previewUrl);
      setImageBlobs({ [previewUrl]: f });
      // No saved points to reset (we don't persist previous crop points)
      setResult(null);
      setAutoEnfoqueAplicado(false);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setCropMode(false); // Reset crop mode
      setCropPoints([]); // Limpiar puntos del crop
      setDetectedCropPoints(null); // Limpiar puntos detectados
      setVisionDebug(null); // Limpiar debug de vision
      setMetadata({
        fileName: f.name,
        fileSize: f.size,
        fileType: f.type,
      });

      // No aplicar auto-enfoque automático
    } catch (e) {
      logger.error(`Error procesando archivo: ${e}`, '[IaImage]');
      setErrorMessage(
        "No se pudo procesar la imagen. Intenta subirla nuevamente.",
      );
    }
  };

  const aplicarAjustes = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    aplicarTransformaciones();

    canvas.toBlob(
      (blob) => {
        const nuevoFile = new File([blob], file.name, { type: file.type });
        const nuevoUrl = URL.createObjectURL(blob);

        if (preview) URL.revokeObjectURL(preview);

        setFile(nuevoFile);
        setPreview(nuevoUrl);
        setMostrarControles(false);

        logger.info('Ajustes aplicados a la imagen', '[IaImage]');
      },
      file.type,
      0.95,
    );
  };

  const resetearAjustes = () => {
    setAjustes(DEFAULT_ADJUSTMENTS);
  };

  const deshacerAutoEnfoque = () => {
    if (imagenOriginal && previewOriginal) {
      // Liberar URL actual si existe
      if (preview && preview !== previewOriginal) {
        URL.revokeObjectURL(preview);
      }

      setFile(imagenOriginal);
      setPreview(previewOriginal);
      setAutoEnfoqueAplicado(false);
      setMostrarControles(false); // Cerrar controles si están abiertos

      logger.info('Auto-enfoque deshecho, imagen original restaurada', '[IaImage]');
    }
  };

  // Estado para crop points
  const [cropPoints, setCropPoints] = useState([])
  // Temporary suggestion from auto-detect (not persisted)
  const [detectedCropPoints, setDetectedCropPoints] = useState(null)
  // No saved points stored persistently anymore (we always show current suggestion vs current manual points)

  // Handler compartido para procesamiento de capturas de cámara
  const handleCameraCapture = async (dataUrl) => {
    try {
      // Convertir dataURL a File optimizando tamaño (JPEG 85%)
      const img = new Image();
      img.src = dataUrl;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });

      const maxW = 1200;
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.85),
      );
      const file = new File([blob], `capture-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      // Reutilizar handler existente
      onFile(file);
      setCameraOpen(false);
    } catch (e) {
      logger.error(`Error procesando imagen capturada: ${e}`, '[IaImage]');
      setErrorMessage(
        "No se pudo procesar la foto de la cámara. Intenta nuevamente.",
      );
    }
  };

  // Guardar ambas imágenes (original y recortada/mejorada) y permitir comparar OCR
  const handleCrop = async (images) => {
    // images = { cropped: {file, preview}, original: {file, preview}, enhanced?: {file, preview} }
    // Guardar siempre ambas
    setImagenOriginal(images.original.file);
    setPreviewOriginal(images.original.preview);
    setImagenMejorada(images.enhanced ? images.enhanced.preview : null); // Guardar la URL de preview, no el file
    // Estado para saber cuál se está mostrando
    setImagenStatus(images.enhanced ? "mejorada" : "recortada");

    // Mostrar la recortada/mejorada por defecto
    const prevPreviewUrl = preview;
    const newPreviewUrl = (images.enhanced || images.cropped).preview;

    setFile((images.enhanced || images.cropped).file);
    setPreview(newPreviewUrl);
    // Guardar blob para que el submit incluya correctamente esta imagen (tanto enhanced como cropped)
    setImageBlobs(prev => ({ ...prev, [newPreviewUrl]: (images.enhanced || images.cropped).file }));

    // Ajustar zoom para mantener tamaño visual constante: si la nueva imagen es más pequeña, incrementar zoom en la misma proporción
    try {
      const loadImage = (src) =>
        new Promise((res, rej) => {
          const im = new Image();
          im.onload = () => res(im);
          im.onerror = rej;
          im.src = src;
        });
      Promise.all([loadImage(prevPreviewUrl), loadImage(newPreviewUrl)])
        .then(([oldImg, newImg]) => {
          if (!oldImg.width || !newImg.width) return;
          const oldW = oldImg.width;
          const newW = newImg.width;
          if (oldW > 0 && newW > 0 && newW !== oldW) {
            const oldZoom = zoom;
            const ratio = oldW / newW;
            let newZoom = Math.max(0.2, Math.min(5, oldZoom * ratio));
            // Pan is stored in screen coordinates and CSS handles zoom correction
            setZoom(newZoom);
            // Keep pan unchanged - CSS divides by zoom
          }
        })
        .catch((e) => {
          // ignore load errors
        });
    } catch (e) {
      // noop
    }

    // Auditoría
    try {
      if (images.enhanced) {
        await guardarAuditoriaEdicion({
          campo: "IMAGEN_MEJORADA",
          valorAnterior: null,
          valorNuevo: images.enhanced.file.name,
          contexto: { source: "manual_crop", method: "enhanced" },
        });
      } else {
        await guardarAuditoriaEdicion({
          campo: "IMAGEN_RECORTADA",
          valorAnterior: null,
          valorNuevo: images.cropped.file.name,
          contexto: { source: "manual_crop", method: "crop_only" },
        });
      }
    } catch (e) {
      logger.warn(`No se pudo guardar auditoría de crop/mejora: ${e}`, '[IaImage]');
    }

    setResult(null);
    setMetadata(null);
    setCropMode(false);

    // Re-aplicar auto-enfoque y preprocesamiento sobre la imagen principal (mejorada si existe)
    setTimeout(() => {
      try {
        autoEnfocar(
          (images.enhanced || images.cropped).file,
          (images.enhanced || images.cropped).preview,
          setFile,
          setPreview,
          preview,
        );
        setAutoEnfoqueAplicado(true);
      } catch (e) {
        logger.warn(`No se pudo re-aplicar auto-enfoque en la imagen aceptada: ${e}`, '[IaImage]');
      }
    }, 100);
  };

  // Cancel no longer supports modal flow; close inline cropper instead
  const handleCancelCrop = () => {
    setCropMode(false);
    setShowOriginalPreview(false);
    setCropPoints([]); // Limpiar puntos del polígono
    setDetectedCropPoints(null);
  };

  // Aplicar crop usando los puntos marcados manualmente (siempre via backend warp)
  const handleApplyCrop = async (points, options = { useBackendWarp: true }) => {
    if (!points || points.length < 3) {
      logger.warn('Se necesitan al menos 3 puntos para hacer crop', '[IaImage]');
      return;
    }

    if (!file) {
      logger.warn('No hay archivo de imagen para crop', '[IaImage]');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // Enviar solicitud de warp al backend (siempre)
      const form = new FormData();
      form.append('image', file);
      form.append('action', 'warp');
      // Ensure points are sent as an array of [x,y]
      const ptsToSend = (points || []).map(p => Array.isArray(p) ? p : [p.x, p.y]);
      form.append('points', JSON.stringify(ptsToSend));

      const resp = await fetch('/api/ai/image', { method: 'POST', body: form });
      const data = await resp.json().catch(() => null);

      if (!resp.ok) {
        logger.error('Backend warp returned error', '[IaImage]', resp.status, data);
        setErrorMessage((data && data.error) ? `Warp error: ${data.error}` : 'El servidor no pudo generar el recorte.');
        return;
      }

      if (!data || !data.enhanced) {
        try {
          logger.error('Backend warp did not return enhanced image', '[IaImage]', { status: resp && resp.status, data_preview: data && (data.enhanced ? String(data.enhanced).substring(0,100) : JSON.stringify(data).substring(0,200)), full_data: data });
          console.groupCollapsed('⚠️ Warp response debug');
          console.log('status:', resp && resp.status, 'ok:', resp && resp.ok);
          console.log('data:', data);
          console.groupEnd();
        } catch (e) {}
        setErrorMessage('El servidor no devolvió la imagen recortada. Revisa los logs del servicio.');
        return;
      }

      // Convertir enhanced (data URL o base64) a blob y aplicar
      const dataUrl = data.enhanced.startsWith('data:') ? data.enhanced : `data:image/jpeg;base64,${data.enhanced}`;
      const resFetch = await fetch(dataUrl);
      if (!resFetch.ok) {
        logger.error('Failed to fetch enhanced image from backend', '[IaImage]', resFetch.status);
        setErrorMessage('No se pudo descargar la imagen recortada desde el servidor.');
        return;
      }

      const blob = await resFetch.blob();

      // Usar el blob original sin modificar para mantener compatibilidad
      const croppedFile = new File([blob], `cropped-${file.name}`, { type: blob.type || 'image/jpeg' });
      const croppedUrl = URL.createObjectURL(blob);

        // Guardar original si no existe
        if (!previewOriginal) {
          const originalUrl = URL.createObjectURL(file);
          setPreviewOriginal(originalUrl);
          setImagenOriginal(file);
        }

        if (preview) URL.revokeObjectURL(preview);
        setFile(croppedFile);
        setPreview(croppedUrl);
        setImageBlobs(prev => ({ ...prev, [croppedUrl]: croppedFile }));
        setImagenMejorada(null);
        setImagenStatus('recortada');
        setShowOriginalPreview(true);
        setCropMode(false);
        setCropPoints([]);

        // Auditoría
        try {
          await guardarAuditoriaEdicion({
            campo: 'IMAGEN_RECORTADA',
            valorAnterior: null,
            valorNuevo: croppedFile.name,
            contexto: { source: 'manual_points_crop', pointsCount: points.length },
          });
        } catch (audErr) {
          logger.warn('No se pudo guardar auditoría de crop manual:', audErr);
        }

        // Re-aplicar auto-enfoque
        setTimeout(() => {
          try {
            autoEnfocar(croppedFile, croppedUrl, setFile, setPreview, croppedUrl);
            setAutoEnfoqueAplicado(true);
          } catch (e) {
            logger.warn('No se pudo re-aplicar auto-enfoque en la imagen recortada:', e);
          }
      // Re-aplicar auto-enfoque
      setTimeout(() => {
        try {
          autoEnfocar(croppedFile, croppedUrl, setFile, setPreview, croppedUrl);
          setAutoEnfoqueAplicado(true);
        } catch (e) {
          logger.warn('No se pudo re-aplicar auto-enfoque en la imagen recortada:', e);
        }
      }, 100);

    } catch (error) {
      logger.error('Error aplicando warp en backend:', error);
      setErrorMessage('Error al solicitar el recorte al servidor. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }

  };

  // Flag to avoid double / concurrent auto-detect calls
  const [autoDetectInFlight, setAutoDetectInFlight] = useState(false)

  // Raw debug data returned by vision (boxes, masks, etc.) for inspection
  const [visionDebug, setVisionDebug] = useState(null)

  // Autodetectar puntos de crop usando YOLO
  const handleAutoDetectCrop = async (autoApply = false, silent = false) => {
    if (!file || !preview) {
      if (!silent) setErrorMessage("No hay imagen para procesar");
      return;
    }

    if (autoDetectInFlight) {
      // Ya hay una llamada en curso; evitar duplicados
      if (!silent) setErrorMessage("Auto-detección ya en curso. Espera un momento.");
      return;
    }

    setAutoDetectInFlight(true)

    try {
      if (!silent) {
        setLoading(true);
        setErrorMessage(null);
      }

      // Crear FormData con la imagen actual
      const formData = new FormData();
      formData.append('image', file);
      formData.append('action', 'detect-corners');

      // Llamar a la API de imagen
      const response = await fetch('/api/ai/image', {
        method: 'POST',
        body: formData,
      });

      let result = null;
      try {
        result = await response.json();
      } catch (jsonErr) {
        const text = await response.text().catch(() => null);
        logger.warn('detect-corners returned non-JSON response', { status: response.status, text }, '[IaImage]');
        // Exponer raw payload for debugging
        setVisionDebug(text ? { raw: text } : null);
        if (!silent) setErrorMessage('Error en detección: respuesta inválida del servicio de visión');
        return;
      }

      if (!response.ok || !result.ok) {
        // Prefer vision-specific error payload if present
        const errMsg = (result && (result.error || result.vision?.error)) || `Error detectando esquinas (status ${response.status})`;
        logger.error('detect-corners failed', { status: response.status, errMsg, result }, '[IaImage]');
        setVisionDebug(result || null);
        if (!silent) setErrorMessage(errMsg);
        return;
      }

      // Store any raw vision debug info for inspection
      setVisionDebug(result.debug || result.vision_raw || result.vision || null);
      if (result.received_orig) {
        setVisionDebug(prev => ({ ...(prev || {}), received_orig: result.received_orig }))
      }

      // Debug logging of detected coords
      try {
        logger.info('detect-corners result', { src_preview: (result.src_coords || result.corners) ? (Array.isArray(result.src_coords || result.corners) ? (result.src_coords || result.corners).slice(0,4) : (result.src_coords || result.corners)) : null, coords_are_pixels: result.coords_are_pixels || false }, '[IaImage]');
      } catch (e) {}

      // Procesar los puntos detectados (admitir contratos antiguos y nuevos)
      const srcCoords = result.src_coords || result.corners || null;
      
      // Si el backend ya devolvió la imagen croppeada, usarla directamente
      if (result.image_b64 && autoApply) {
        try {
          // Convertir data URL o base64 a blob
          const dataUrl = result.image_b64.startsWith('data:') ? result.image_b64 : `data:image/jpeg;base64,${result.image_b64}`;
          const resFetch = await fetch(dataUrl);
          const blob = await resFetch.blob();
          const croppedFile = new File([blob], `cropped-${file.name}`, { type: blob.type || 'image/jpeg' });
          const croppedUrl = URL.createObjectURL(blob);
          
          // Guardar original si no existe
          if (!previewOriginal) {
            const originalUrl = URL.createObjectURL(file);
            setPreviewOriginal(originalUrl);
            setImagenOriginal(file);
          }
          
          if (preview) URL.revokeObjectURL(preview);
          setFile(croppedFile);
          setPreview(croppedUrl);
          setImageBlobs(prev => ({ ...prev, [croppedUrl]: croppedFile }));
          setImagenMejorada(null);
          setImagenStatus('recortada');
          setShowOriginalPreview(true);
          setCropMode(false);
          setCropPoints([]);
          
          logger.info('Auto-crop applied from /crop response image_b64', '[IaImage]');
          return;
        } catch (e) {
          logger.warn('Failed to use image_b64 from /crop, falling back to warp', e, '[IaImage]');
        }
      }
      
      if (srcCoords && Array.isArray(srcCoords) && srcCoords.length >= 4) {
        // Normalize points to 0..1 coordinates. If coords_are_pixels is true, convert using image natural size
        let pointsPx = srcCoords.slice(0,4).map(pt => (Array.isArray(pt) ? pt : [pt.x ?? pt[0], pt.y ?? pt[1]]));
        let normalizedPoints;

        if (result.coords_are_pixels) {
          // Need to know the image dimensions for conversion
          try {
            const img = new Image();
            const imgLoad = new Promise((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = reject;
            });
            img.src = preview;
            await imgLoad;
            const imgW = img.naturalWidth || img.width;
            const imgH = img.naturalHeight || img.height;
            normalizedPoints = pointsPx.map(([x, y]) => ({ x: x / imgW, y: y / imgH }));
          } catch (e) {
            console.warn('No se pudo obtener dimensiones de la imagen para normalizar puntos:', e);
            if (!silent) setErrorMessage('No se pudo normalizar puntos detectados');
            normalizedPoints = pointsPx.map(([x, y]) => ({ x, y }));
          }
        } else {
          // Assume coords already normalized 0..1
          normalizedPoints = pointsPx.map(([x, y]) => ({ x, y }));
        }

        // Keep the detected suggestion in temporary state; do not persist historic points
        setDetectedCropPoints(normalizedPoints);

        if (autoApply) {
          // Aplicar crop automáticamente (use warp on backend to generate final image)
          await handleApplyCrop(normalizedPoints, { useBackendWarp: true });
        } else {
          // Mostrar puntos para edición manual and show suggestion preview
          setCropPoints(normalizedPoints);
          setCropMode(true);
        }

        logger.info({ points: normalizedPoints }, '[IaImage:auto-detect]')
      } else {
        logger.warn("No se pudieron detectar esquinas en la imagen", '[IaImage]');
        if (!silent) setErrorMessage("No se pudieron detectar esquinas en la imagen");
      }

    } catch (error) {
      console.error("Error en autodetección con YOLO:", error);
      logger.error(`Error detectando esquinas: ${error.message}`, '[IaImage]');
      if (!silent) setErrorMessage(`Error detectando esquinas: ${error.message}`);
    } finally {
      if (!silent) setLoading(false);
      setAutoDetectInFlight(false)
    }
  };



  // Función auxiliar para ordenar puntos en sentido horario
  const sortPointsClockwise = (points) => {
    if (points.length !== 4) return points;

    // Calcular centroide
    const centerX = points.reduce((sum, p) => sum + p.x, 0) / 4;
    const centerY = points.reduce((sum, p) => sum + p.y, 0) / 4;

    // Ordenar por ángulo desde el centroide
    return points.sort((a, b) => {
      const angleA = Math.atan2(a.y - centerY, a.x - centerX);
      const angleB = Math.atan2(b.y - centerY, b.x - centerX);
      return angleA - angleB;
    });
  };

  // Toggle/comparador y carousel
  const [showOriginalPreview, setShowOriginalPreview] = useState(false);
  const [carouselItems, setCarouselItems] = useState([]); // [{ type: 'original'|'recortada'|'mejorada', url }]
  const [carouselIndex, setCarouselIndex] = useState(0); // index in carouselItems

  // Mantener la lista de previews (carousel) sincronizada con los cambios de imagen
  useEffect(() => {
    const items = [];
    if (previewOriginal) items.push({ type: "original", url: previewOriginal });
    if (preview) {
      // Si hay previewOriginal, entonces preview es recortada, sino es original
      const itemType = previewOriginal ? "recortada" : "original";
      items.push({ 
        type: itemType, 
        url: preview 
      });
    }
    if (imagenMejorada)
      items.push({
        type: "mejorada",
        url:
          imagenMejorada && typeof imagenMejorada === "string"
            ? imagenMejorada
            : null,
      });
    // Filtrar nulos y URLs duplicadas
    const unique = [];
    const seen = new Set();
    for (const it of items) {
      if (it.url && !seen.has(it.url)) {
        unique.push(it);
        seen.add(it.url);
      }
    }
    setCarouselItems(unique);
    // Ajustar índice actual si la URL actual no está en la lista o se perdió
    const currentUrl = preview;
    const idx = unique.findIndex((it) => it.url === currentUrl);
    if (idx >= 0) setCarouselIndex(idx);
    else if (unique.length > 0) {
      // Si la vista actual no está en la lista, preferir la primera (original) si showOriginalPreview está activo
      const preferred = showOriginalPreview ? 0 : 0;
      setCarouselIndex(preferred);
      setPreview(unique[preferred].url);
      setImagenStatus(
        unique[preferred].type === "mejorada"
          ? "mejorada"
          : unique[preferred].type === "recortada"
            ? "recortada"
            : "original",
      );
    } else {
      setCarouselIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewOriginal, preview, imagenMejorada]);

  // Restaurar puntos de crop cuando se entra en modo crop desde la original
  // No persistent saved crop points: do not re-apply on carousel change
  useEffect(() => {
    if (!cropMode) return;
  }, [cropMode, carouselIndex]);

  // Función helper para esperar que un modelo se cargue
  const waitForModelLoad = (modelName, timeout = 300000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        const status = getModelStatus(modelName);
        if (status === "loaded") {
          clearInterval(checkInterval);
          resolve();
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error("Timeout esperando que el modelo se cargue"));
        }
      }, 500); // Chequear cada 500ms
    });
  };

  // Enviar ambas imágenes (original y recortada/mejorada) para comparar OCR
  const submit = async (mantenerResultados = false) => {
    logger.info('Starting submit function', '[IaImage]');
    
    if (!file && !imagenOriginal) {
      logger.warn('No file or imagenOriginal available, returning early', '[IaImage]');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    if (!mantenerResultados) {
      setResult(null);
      setMetadata(null);
      setParsedData(null);
      setProveedorEncontrado(null);
      setProductosBuscados({});
      setPedidosRelacionados([]);
      setFacturaDuplicada(null);
    }

    try {
      // Enviar la imagen actual y la original
      const fd = new FormData();
      const currentUrl = carouselItems && carouselItems.length > 0 ? carouselItems[carouselIndex].url : preview;
      
      // Prefer imageBlobs map entry, then file, then imagenOriginal
      let currentBlob = null;
      if (currentUrl && imageBlobs && imageBlobs[currentUrl]) {
        currentBlob = imageBlobs[currentUrl];
      } else if (currentUrl === previewOriginal && imagenOriginal) {
        currentBlob = imagenOriginal;
      } else if (file) {
        currentBlob = file;
      } else if (imagenOriginal) {
        currentBlob = imagenOriginal;
      }
      
      logger.info(`Submitting image analysis - blob: ${!!currentBlob}, size: ${currentBlob?.size || 'unknown'}, mode: ${mode}, model: ${model}, url: ${currentUrl}, preview: ${preview}, has_file: ${!!file}, has_original: ${!!imagenOriginal}`, '[IaImage]');
      
      if (!currentBlob) {
        logger.error('No image blob available for submission', '[IaImage]');
        setErrorMessage("No hay imagen para analizar. Sube una imagen primero.");
        return;
      }
      
      if (currentBlob) fd.append("image", currentBlob);
      if (imagenOriginal) fd.append("original", imagenOriginal);

      // Include crop points (manual or detected suggestion) if present so the analyze endpoint
      // /vision/analyze can be informed about the region of interest.
      const pointsToSend = (cropPoints && cropPoints.length === 4) ? cropPoints : (detectedCropPoints && detectedCropPoints.length === 4 ? detectedCropPoints : null)
      if (pointsToSend) {
        fd.append('src_coords', JSON.stringify(pointsToSend))
        fd.append('coords_are_pixels', 'false')
      }

      fd.append("model", model || "llava:latest");
      fd.append("mode", mode);

      // Nuevo endpoint que soporta comparar ambas imágenes (ajustar backend si es necesario)
      const controller = new AbortController();
      analysisControllerRef.current = controller;
      const timeoutId = setTimeout(() => {
        logger.warn('Aborting request due to 5min timeout', '[IaImage]');
        controller.abort();
      }, 300000); // 5 minutos timeout (Qwen puede tardar)

      const tReqStart = Date.now();
      logger.debug(`Starting fetch to /api/ai/image at ${new Date().toISOString()}`, '[IaImage]');
      const res = await fetch("/api/ai/image", { 
        method: "POST", 
        body: fd,
        signal: controller.signal
      });
      const tReqEnd = Date.now();
      clearTimeout(timeoutId);
      analysisControllerRef.current = null;
      logger.debug(`Fetch completed in ${tReqEnd - tReqStart}ms, status: ${res.status}`, '[IaImage]');

      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        logger.warn('No se pudo parsear JSON de /api/ai/image', '[IaImage]')
        data = { ok: false, error: 'invalid_json_response' }
      }

      const latencyMs = tReqEnd - tReqStart;
      logger.info({ endpoint: '/api/ai/image', status: res.status, ok: res.ok, latencyMs }, '[IaImage]')
      try {
        const rawText = data.text || (data.vision && data.vision.result) || '';
        logger.debug({ response_preview: rawText ? String(rawText).substring(0, 200) : 'no text', full_response: data }, '[IaImage:api-response]')
      } catch (e) {
        logger.warn('No se pudo serializar respuesta de IA', '[IaImage]')
      }

      // También mostrar en console para facilitar debug manual
      try {
        console.groupCollapsed('🖼️ /api/ai/image response')
        console.log('status:', res.status, 'ok:', res.ok, 'latencyMs:', latencyMs)
        console.log('data:', data)
        console.groupEnd()
      } catch (e) {}

      // Si vision devolvió un error específico, mostrarlo claramente en UI y logs
      if (data && data.vision && data.vision.ok === false) {
        const vmsg = data.vision.error || 'vision_error';
        logger.warn(`Vision microservice reported error: ${vmsg}`, '[IaImage]');
        // Mostrar banner de error para que el usuario lo vea inmediatamente
        setErrorMessage(`Vision error: ${vmsg}`);
        // Guardar payload raw para inspección en el panel de Vision debug
        setVisionDebug(data.vision);
      }

      if (data.ok) {
        // Handle both old format (data.text) and new format (data.vision.result)
        const rawText = data.text || (data.vision && data.vision.result) || '';
        setResult(rawText);
        setMetadata(data.metadata);

        // Try to parse the JSON data from the response
        let parsedJson = null;
        try {
          // Extract JSON from markdown code blocks if present
          let jsonText = rawText;
          if (jsonText.includes('```json')) {
            const match = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
            if (match) jsonText = match[1];
          }
          parsedJson = JSON.parse(jsonText);
          logger.debug('Successfully parsed JSON from AI response', '[IaImage]');
        } catch (e) {
          logger.warn(`Could not parse JSON from AI response: ${e.message}`, '[IaImage]');
          parsedJson = null;
        }

        if (mantenerResultados && parsedData) {
          const merged = mergeParsedDataKeepEdits(parsedData, parsedJson);
          setParsedData(merged);
          console.log(
            "📊 Datos recibidos y mergeados con ediciones locales:",
            merged,
          );
        } else {
          setParsedData(parsedJson);
          logger.debug({ data_preview: parsedJson ? (Array.isArray(parsedJson.items) ? { items: parsedJson.items.length } : {}) : null }, '[IaImage]')
        }

        setErrorMessage(null);

        if (
          mode === "factura" &&
          (mantenerResultados ? parsedData || parsedJson : parsedJson)
        ) {
          buscarDatosRelacionados(
            mantenerResultados && parsedData ? parsedData : parsedJson,
          );
        }
      } else {
        const msg = data.error || "Respuesta inválida";
        logger.error(`Error en respuesta de IA: ${msg}`, '[IaImage]');

        // Si la respuesta incluye información de vision, priorizarla y exponerla para debug
        if (data && data.vision && data.vision.ok === false) {
          const vmsg = data.vision.error || 'vision_error';
          logger.warn(`Vision reported: ${vmsg}`, '[IaImage]');
          setVisionDebug(data.vision);
          setErrorMessage(`Vision: ${vmsg}` + (data.retryable ? " • Puedes reintentar." : ""));
          setResult(null);
          return;
        }
        
        // Improve error messages for better user experience
        let displayMsg = msg;
        if (msg.includes('No hay modelos LLM disponibles') || msg.includes('Ollama no está corriendo')) {
          displayMsg = "No hay modelos de IA disponibles. Ollama no está corriendo en el contenedor. Usa el botón 'Arrancar servicio' para iniciar el microservicio.";
        } else if (msg.includes('microservicio de visión') || msg.includes('ranitas-vision')) {
          displayMsg = "El microservicio de visión no está disponible. Verifica que el contenedor Docker esté corriendo.";
        }
        
        setErrorMessage(displayMsg + (data.retryable ? " • Puedes reintentar." : ""));
        setResult(null);
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        logger.warn('Análisis abortado/timeout esperando respuesta del servicio de IA', '[IaImage]');
        setErrorMessage("Análisis cancelado o timeout. Si el problema persiste, verifica el estado del servicio de IA.");
      } else {
        logger.error(`Error de conexión: ${e.message}`, '[IaImage]');
        setErrorMessage(`Error de conexión: ${e.message}`);
      }
      setResult(null);
    } finally {
      analysisControllerRef.current = null;
      setLoading(false);
    }
  };

  const buscarDatosRelacionados = async (factura) => {
    setBuscandoDatos(true);
    console.log("🔍 Iniciando búsqueda de datos relacionados...");

    try {
      let provResult = null;

      if (factura.emisor) {
        console.log("🏢 Buscando proveedor:", factura.emisor);
        provResult = await buscarProveedor(
          factura.emisor.cuit,
          factura.emisor.nombre,
        );
        setProveedorEncontrado(provResult);
        console.log("✅ Proveedor encontrado:", provResult);

        // Si no se encontró proveedor, mostrar modal para asociar
        if (!provResult?.proveedor) {
          console.log("⚠️ Proveedor no encontrado - mostrando selector");
          setModalProveedor(true);
        }

        if (provResult?.proveedor && factura.documento?.numero) {
          console.log("🔍 Verificando factura duplicada...");
          const duplicada = await verificarFacturaDuplicada(
            factura.documento.numero,
            provResult.proveedor.id,
          );
          setFacturaDuplicada(duplicada);
          if (duplicada)
            console.log("⚠️ Factura duplicada detectada:", duplicada);

          if (factura.documento?.fecha) {
            console.log("📋 Buscando pedidos relacionados...");
            const pedidos = await buscarPedidosRelacionados(
              provResult.proveedor.id,
              factura.documento.numero,
              factura.documento.fecha,
            );
            setPedidosRelacionados(pedidos);
            console.log(`✅ ${pedidos.length} pedidos encontrados`);
          }
        }
      }

      if (factura.items && factura.items.length > 0) {
        const busquedas = {};
        const proveedorId = provResult?.proveedor?.id || null;
        console.log(
          `🔍 Buscando ${factura.items.length} productos...`,
          proveedorId ? `con proveedorId: ${proveedorId}` : "sin proveedor",
        );

        // Buscar aliases existentes (sin crear nada)
        let aliases = [];
        if (proveedorId) {
          console.log(`🔍 Buscando aliases existentes para proveedor...`);
          aliases = await buscarAliasesPorItems({
            proveedorId,
            items: factura.items,
          });
          setAliasesPorItem(aliases);
          console.log(
            `✅ ${aliases.filter((a) => a.tieneAlias).length} aliases encontrados de ${factura.items.length} items`,
          );
        }

        // Buscar productos por nombre (para sugerencias)
        for (const item of factura.items) {
          const nombreProducto =
            item.descripcion || item.detalle || item.producto || item.articulo;
          if (nombreProducto && nombreProducto.trim()) {
            logger.debug({ searching: nombreProducto }, '[IaImage]');
            const productos = await buscarProducto(nombreProducto, proveedorId);
            busquedas[nombreProducto] = productos;
            logger.debug({ results: productos.length, term: nombreProducto }, '[IaImage]');
          }
        }
        setProductosBuscados(busquedas);
        logger.info('Búsqueda de productos completado (sin crear aliases)', '[IaImage]');
      }
    } catch (error) {
      logger.error(`Error buscando datos relacionados: ${error}`, '[IaImage]');
    } finally {
      setBuscandoDatos(false);
    }
  };

  // Cargar productos para el modal de mapeo
  useEffect(() => {
    const cargarProductos = async () => {
      try {
        const response = await fetch("/api/productos/list");
        if (response.ok) {
          const data = await response.json();
          setProductosParaMapeo(data.productos || []);
        }
      } catch (error) {
        console.error("Error cargando productos:", error);
      }
    };
    cargarProductos();
  }, []);

  // Handlers para modal de mapeo
  const abrirModalMapeo = (alias, itemIndex) => {
    setModalMapeo({ open: true, alias, itemIndex });
  };

  const cerrarModalMapeo = () => {
    setModalMapeo({ open: false, alias: null, itemIndex: null });
  };

  const handleMapeoExitoso = (aliasActualizado) => {
    // Actualizar el estado de aliases
    setAliasesPorItem((prevAliases) => {
      const nuevosAliases = [...prevAliases];
      if (
        modalMapeo.itemIndex !== null &&
        nuevosAliases[modalMapeo.itemIndex]
      ) {
        nuevosAliases[modalMapeo.itemIndex] = {
          ...nuevosAliases[modalMapeo.itemIndex],
          alias: aliasActualizado,
          mapeado: true,
          producto: aliasActualizado.producto,
          presentacion: aliasActualizado.presentacion,
        };
      }
      return nuevosAliases;
    });

    // Recargar búsqueda de productos si es necesario
    if (parsedData) {
      buscarDatosRelacionados(parsedData);
    }
  };

  // Handler para asociar proveedor
  const handleAsociarProveedor = async (contacto) => {
    console.log("✅ Proveedor asociado:", contacto);
    setProveedorEncontrado({
      proveedor: contacto,
      confianza: 1.0,
      mensaje: "Proveedor asociado manualmente",
    });
    setModalProveedor(false);

    // Recargar datos relacionados con el nuevo proveedor
    if (parsedData) {
      await buscarDatosRelacionados(parsedData);
    }
  };

  const handleGuardarFactura = async () => {
    if (!parsedData || !proveedorEncontrado?.proveedor) {
      alert("❌ Faltan datos: Asegúrate de tener proveedor y datos de factura");
      return;
    }

    // Confirmar con el usuario
    const itemsSinMapear =
      aliasesPorItem?.filter((a) => a.tieneAlias && !a.mapeado).length || 0;
    const itemsSinAlias =
      parsedData.items.length -
      (aliasesPorItem?.filter((a) => a.tieneAlias).length || 0);

    let mensaje = `¿Guardar factura?\n\n`;
    mensaje += `Proveedor: ${proveedorEncontrado.proveedor.nombre}\n`;
    mensaje += `Número: ${parsedData.documento?.numero || "Sin número"}\n`;
    mensaje += `Total items: ${parsedData.items.length}\n`;

    if (itemsSinMapear > 0 || itemsSinAlias > 0) {
      mensaje += `\n⚠️ Advertencia:\n`;
      if (itemsSinMapear > 0)
        mensaje += `- ${itemsSinMapear} item(s) con alias sin mapear\n`;
      if (itemsSinAlias > 0)
        mensaje += `- ${itemsSinAlias} item(s) sin alias\n`;
      mensaje += `\n✅ Se guardará la factura de todos modos.\n`;
      mensaje += `Podrás crear los productos faltantes después.`;
    }

    if (!confirm(mensaje)) return;

    setGuardandoFactura(true);
    try {
      // Preparar detalles
      const detalles = parsedData.items.map((item, index) => {
        const aliasInfo = aliasesPorItem[index];

        return {
          aliasId: aliasInfo?.alias?.id || null,
          idProducto: aliasInfo?.mapeado ? aliasInfo.producto?.id : null,
          presentacionId: aliasInfo?.mapeado
            ? aliasInfo.presentacion?.id
            : null,
          descripcionPendiente: !aliasInfo?.mapeado
            ? item.descripcion || item.detalle || item.producto
            : null,
          cantidad: parseFloat(item.cantidad) || 1,
          precioUnitario: parseFloat(item.precio_unitario || item.precio) || 0,
          descuento: parseFloat(item.descuento) || 0,
        };
      });

      // Preparar datos de factura
      const datosFactura = {
        idProveedor: proveedorEncontrado.proveedor.id,
        numeroDocumento: parsedData.documento?.numero || "",
        fecha:
          parsedData.documento?.fecha || new Date().toISOString().split("T")[0],
        tipoDocumento: parsedData.documento?.tipo || "FACTURA_A",
        estado: "IMPAGA",
        tieneImpuestos: true,
        detalles,
      };

      // Si tenemos el archivo de la factura en `file`, convertirlo a data URL y adjuntarlo
      // IMPORTANTE: Guardar la imagen ORIGINAL (sin crop ni procesamiento) en la BD
      // Pero si no hay original, usar la procesada (file)
      // Preferir guardar la versión mejorada si existe, sino la original, sino la crop
      const imagenParaGuardar = imagenMejorada || imagenOriginal || file;

      if (imagenParaGuardar) {
        const fileToDataUrl = (f) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(f);
          });

        try {
          const dataUrl = await fileToDataUrl(imagenParaGuardar);
          datosFactura.imagen = dataUrl;
          console.log(
            "💾 Guardando imagen en BD (preferencia aplicada):",
            imagenParaGuardar.name,
          );

          // Adjuntar metadatos de mejora si existieran
          if (
            debugInfo?.restoredModel ||
            debugInfo?.restoredParams ||
            debugInfo?.enhancedSaved
          ) {
            datosFactura.imagen_meta = {
              restoredModel: debugInfo?.restoredModel || null,
              restoredParams: debugInfo?.restoredParams || null,
              enhancedSaved: !!debugInfo?.enhancedSaved,
            };
          }
        } catch (e) {
          console.warn(
            "No se pudo convertir la imagen a base64 para guardar:",
            e.message,
          );
        }
      }

      console.log("📝 Guardando factura:", datosFactura);

      // Guardar factura
      const resultado = await guardarFacturaCompra(datosFactura);

      // Mostrar resultado
      const mapeados = detalles.filter((d) => d.idProducto).length;
      const pendientes = detalles.filter((d) => !d.idProducto).length;

      if (pendientes > 0) {
        const confirmarCrear = confirm(
          `✅ Factura guardada exitosamente\n\n` +
            `📊 Resumen:\n` +
            `- ${mapeados} producto(s) con stock actualizado\n` +
            `- ${pendientes} producto(s) pendientes\n\n` +
            `¿Deseas crear los productos pendientes ahora?`,
        );

        if (confirmarCrear) {
          // Crear productos pendientes uno por uno
          const itemsPendientes = parsedData.items.filter(
            (item, idx) => !detalles[idx].idProducto,
          );
          for (const item of itemsPendientes) {
            const params = new URLSearchParams();
            params.set("nuevo", "true");
            params.set(
              "nombre",
              item.descripcion || item.detalle || item.producto || "",
            );
            if (item.codigo) params.set("codigo", item.codigo);
            if (item.cantidad) params.set("cantidad", item.cantidad.toString());
            if (item.precio_unitario || item.precio)
              params.set(
                "precio",
                (item.precio_unitario || item.precio).toString(),
              );
            params.set("proveedorId", proveedorEncontrado.proveedor.id);

            window.open(`/cargarProductos?${params.toString()}`, "_blank");
          }
          return; // No limpiar la interfaz para poder seguir trabajando
        }
      } else {
        alert(
          `✅ Factura guardada exitosamente\n\n` +
            `📊 Todos los productos (${mapeados}) fueron procesados con éxito.\n\n` +
            `Stock actualizado correctamente.`,
        );
      }

      // Limpiar interfaz
      setFile(null);
      setPreview(null);
      setParsedData(null);
      setProveedorEncontrado(null);
      setAliasesPorItem([]);
      setProductosBuscados({});
    } catch (error) {
      console.error("Error guardando factura:", error);
      alert("❌ Error guardando factura: " + error.message);
    } finally {
      setGuardandoFactura(false);
    }
  };

  // Streaming preview feature retired — implementation removed from active UI (kept in repo history).

  const actualizarCampo = async (path, valorNuevo, valorAnterior) => {
    // Deep copy parsedData to modify
    const newData = JSON.parse(JSON.stringify(parsedData));

    const keys = path.split(".");
    let current = newData;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }

    const lastKey = keys[keys.length - 1];

    // Convert certain fields to numbers when appropriate
    const numericFields = [
      "cantidad_documento",
      "cantidad",
      "precio_unitario",
      "precio",
      "subtotal_calculado",
      "descuento",
      "descuento_total",
      "iva",
      "neto",
      "total",
      "total_impreso",
    ];
    let valorProcesado = valorNuevo;
    if (numericFields.includes(lastKey)) {
      const parsed = parseFloat(String(valorNuevo).replace(",", "."));
      valorProcesado = isNaN(parsed) ? 0 : parsed;
    }

    current[lastKey] = valorProcesado;

    // Mark this path as edited so re-procesamientos no lo overrite
    newData._edited = newData._edited || {};
    newData._edited[path] = true;

    // If we edited an item field, mirror description edits to similar keys so UI shows it consistently
    if (keys[0] === "items" && keys.length >= 3) {
      const itemIndex = parseInt(keys[1], 10);
      const item = newData.items && newData.items[itemIndex];
      if (
        item &&
        lastKey === "descripcion" &&
        typeof valorProcesado === "string"
      ) {
        item.descripcion = valorProcesado;
        item.descripcion_exacta = valorProcesado;
        item.nombre_producto = valorProcesado;
        item.producto = valorProcesado;
        item.detalle = valorProcesado;
      }

      if (item) {
        const unit = Number(item.precio_unitario ?? item.precio ?? 0);
        const qty = Number(item.cantidad_documento ?? item.cantidad ?? 0);

        if (
          [
            "cantidad_documento",
            "cantidad",
            "precio_unitario",
            "precio",
          ].includes(lastKey)
        ) {
          // Recalculate subtotal from unit * qty when quantity/price changed
          item.subtotal_calculado = Number(unit * qty || 0);
        } else if (lastKey === "subtotal_calculado") {
          // Ensure subtotal is numeric when user edits it manually
          item.subtotal_calculado = Number(valorProcesado || 0);
        }
      }
    }

    // Recalculate aggregate totals based on items
    const items = Array.isArray(newData.items) ? newData.items : [];
    const subtotal = items.reduce((s, it) => {
      const unit = Number(it.precio_unitario ?? it.precio ?? 0);
      const qty = Number(it.cantidad_documento ?? it.cantidad ?? 0);
      const lineRaw =
        it.subtotal_calculado ?? it.subtotal_original ?? unit * qty;
      const line = Number(lineRaw || 0);
      return s + (isFinite(line) ? line : 0);
    }, 0);

    // Discounts: prefer overall discount in totales, otherwise sum item discounts
    const discountFromTotales =
      typeof newData.totales?.descuento_total === "number"
        ? newData.totales.descuento_total
        : typeof newData.totales?.descuento === "number"
          ? newData.totales.descuento
          : 0;
    const itemsDiscount = items.reduce(
      (s, it) => s + Number(it.descuento || 0),
      0,
    );
    const totalDescuento = discountFromTotales || itemsDiscount || 0;

    if (!newData.totales) newData.totales = {};
    // Set neto as raw subtotal (before discounts)
    newData.totales.neto = subtotal;

    // Store computed discount if none provided
    if (!newData.totales.descuento_total && totalDescuento > 0) {
      newData.totales.descuento_total = totalDescuento;
    }

    // If IVA is present include it, otherwise assume 0
    const ivaVal =
      typeof newData.totales.iva === "number" ? newData.totales.iva : 0;
    newData.totales.total_calculado = Number(
      subtotal - totalDescuento + ivaVal,
    );

    // Recompute diferencia if total_impreso exists
    if (typeof newData.totales.total_impreso === "number") {
      newData.totales.diferencia = Number(
        newData.totales.total_impreso - newData.totales.total_calculado || 0,
      );
    } else {
      delete newData.totales.diferencia;
    }

    setParsedData(newData);

    await guardarAuditoriaEdicion({
      campo: path,
      valorAnterior,
      valorNuevo: valorProcesado,
      contexto: "Edición manual de factura IA",
    });
  };

  const clear = () => {
    try {
      if (preview) URL.revokeObjectURL(preview);
    } catch (e) {}
    try {
      if (previewOriginal) URL.revokeObjectURL(previewOriginal);
    } catch (e) {}
    try {
      if (imagenMejorada && typeof imagenMejorada === "string")
        URL.revokeObjectURL(imagenMejorada);
    } catch (e) {}

    // Reset all relevant states to initial
    setFile(null);
    setPreview(null);
    setParsedData(null);
    setResult(null);
    setMetadata(null);
    setImagenOriginal(null);
    setImagenMejorada(null);
    setPreviewOriginal(null);
    setImageBlobs({});
    // No saved points to clear
    setAutoEnfoqueAplicado(false);
    setCropMode(false);
    setShowOriginalPreview(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setCarouselItems([]);
    setCarouselIndex(0);
    setImagenStatus("original");
    setMostrarControles(false);
    setAjustes(DEFAULT_ADJUSTMENTS);
    setIsPanning(false);
    setPanStart({ x: 0, y: 0 });

    // Close any modals
    setModalProveedor(false);
    setModalMapeo({ open: false, alias: null, itemIndex: null });
    setModalCrearProveedor(false);

    // Clear errors/results
    setErrorMessage(null);
    setLoading(false);
    setParsedData(null);
  };

  // Wrapper para CampoEditable con contexto
  const CampoEditableWrapper = (props) => (
    <CampoEditable {...props} onUpdate={actualizarCampo} />
  );

  // Helper: merge parsed data preferring user edits recorded in _edited
  const mergeParsedDataKeepEdits = (oldData, newData) => {
    if (!oldData) return newData;
    if (!newData) return oldData;

    const merged = JSON.parse(JSON.stringify(newData));
    merged._edited = merged._edited || {};

    // Preserve top-level editable fields
    if (oldData.totales && oldData._edited) {
      for (const k of Object.keys(oldData.totales)) {
        if (oldData._edited[`totales.${k}`]) {
          merged.totales = merged.totales || {};
          merged.totales[k] = oldData.totales[k];
        }
      }
    }

    // Merge items preserving edited fields per index
    if (Array.isArray(oldData.items) && Array.isArray(newData.items)) {
      merged.items = merged.items || [];
      const maxLen = Math.max(oldData.items.length, newData.items.length);
      for (let i = 0; i < maxLen; i++) {
        const oldItem = oldData.items[i] || {};
        merged.items[i] = merged.items[i] || {};
        const keysToPreserve = [
          "descripcion",
          "cantidad",
          "cantidad_documento",
          "precio_unitario",
          "precio",
          "subtotal_calculado",
          "descuento",
          "es_devolucion",
        ];
        for (const k of keysToPreserve) {
          if (oldData._edited && oldData._edited[`items.${i}.${k}`]) {
            merged.items[i][k] = oldItem[k];
          }
        }
      }
    }

    return merged;
  };

  return (
    <div className="grid gap-4">
      {/* CEMENTERIO: Former modal cropper preserved here for reference; not used in current flow.
      {showCropper && tempPreview && (
        <ImageCropper 
          src={tempPreview}
          mode={mode}
          model={model}
          onCrop={handleCrop}
          onCancel={handleCancelCrop}
        />
      )}
      */}
      {preview && mode === "factura" && (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Columna izquierda: Imagen o Cropper Inline (siempre renderizamos ImageColumn para mantener listeners y layout) */}
          {/* Compute dynamic header based on current carousel item or flags */}
          {(() => {
            const currentItem = carouselItems[carouselIndex] || {
              type: "original",
              url: preview,
            };
            const computedHeaderText = cropMode
              ? "✂️ Recortar imagen"
              : currentItem.type === "mejorada"
                ? "📄 Imagen mejorada"
                : currentItem.type === "recortada"
                  ? "📄 Imagen recortada"
                  : "📄 Imagen original";
            const onPrev = () => {
              if (!carouselItems || carouselItems.length <= 1) return;
              const nextIdx =
                (carouselIndex - 1 + carouselItems.length) %
                carouselItems.length;
              setCarouselIndex(nextIdx);
              const it = carouselItems[nextIdx];
              if (it) {
                setImagenStatus(
                  it.type === "mejorada"
                    ? "mejorada"
                    : it.type === "recortada"
                      ? "recortada"
                      : "original",
                );
              }
            };
            const onNext = () => {
              if (!carouselItems || carouselItems.length <= 1) return;
              const nextIdx = (carouselIndex + 1) % carouselItems.length;
              setCarouselIndex(nextIdx);
              const it = carouselItems[nextIdx];
              if (it) {
                setImagenStatus(
                  it.type === "mejorada"
                    ? "mejorada"
                    : it.type === "recortada"
                      ? "recortada"
                      : "original",
                );
              }
            };
            return (
              <ImageColumn
                preview={preview}
                mostrarControles={mostrarControles}
                setMostrarControles={setMostrarControles}
                clear={clear}
                imgOriginalRef={imgOriginalRef}
                canvasRef={canvasRef}
                ajustes={ajustes}
                setAjustes={setAjustes}
                aplicarAjustes={aplicarAjustes}
                resetearAjustes={resetearAjustes}
                ImageControlsOverlay={ImageControlsOverlay}
                OptimizedImage={OptimizedImage}
                zoom={zoom}
                setZoom={setZoom}
                pan={pan}
                setPan={setPan}
                isPanning={isPanning}
                setIsPanning={setIsPanning}
                panStart={panStart}
                setPanStart={setPanStart}
                cropMode={cropMode}
                setCropMode={setCropMode}
                onCrop={handleCrop}
                onCancelCrop={handleCancelCrop}
                onAutoDetectCrop={handleAutoDetectCrop}
                headerText={computedHeaderText}
                originalPreview={previewOriginal}
                incomingCropPoints={detectedCropPoints}
                incomingPointsAreNormalized={true}
                visionDebug={visionDebug}
                // We no longer persist saved points; ImageViewer will compare current suggestion and current manual points
                extraHeaderButtons={cropMode ? (() => {
                  const manualOk = cropPoints && cropPoints.length >= 3;
                  const detectedOk = detectedCropPoints && detectedCropPoints.length >= 3;
                  const canApply = manualOk || detectedOk;
                  const pointsToApply = manualOk ? cropPoints : (detectedOk ? detectedCropPoints : cropPoints);
                  return (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (!canApply) return;
                          handleApplyCrop(pointsToApply);
                        }}
                        disabled={!canApply}
                        className={`px-3 py-1.5 rounded-lg ${canApply ? 'bg-green-50 text-green-800 hover:bg-green-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'} text-sm`}
                        title={!canApply ? 'Se necesitan al menos 3 puntos para aplicar el recorte' : 'Aplicar recorte usando puntos actuales (manual o detectados)'}
                      >
                        ✅ Aplicar
                      </button>
                      <button
                        onClick={() => {
                          setCropMode(false);
                          setCropPoints([]);
                          setDetectedCropPoints(null); // ensure next time we re-enter crop it will request new detection
                          setVisionDebug(null); // clear vision debug from previous detection
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white text-gray-800 text-sm"
                      >
                        ❌ Cancelar
                      </button>
                    </div>
                  )
                })() : null}
                cropPoints={cropPoints}
                onCropPointsChange={(nextOrUpdater) => {
                  const nextPoints = typeof nextOrUpdater === 'function' ? nextOrUpdater(cropPoints) : nextOrUpdater
                  setCropPoints(nextPoints)
                }}
                showOriginal={showOriginalPreview}
                onToggleShowOriginal={(v) => setShowOriginalPreview(!!v)}
                onImageClick={() => {
                  if (carouselItems && carouselItems.length > 1) {
                    const next = (carouselIndex + 1) % carouselItems.length;
                    setCarouselIndex(next);
                    setPreview(carouselItems[next].url);
                    setImagenStatus(
                      carouselItems[next].type === "mejorada"
                        ? "mejorada"
                        : carouselItems[next].type === "recortada"
                          ? "recortada"
                          : "original",
                    );
                  } else {
                    setShowOriginalPreview((s) => !s);
                  }
                }}
                onPrev={onPrev}
                onNext={onNext}
                onRemoveCroppedImage={() => {
                  // Remove cropped image and revert to original preview
                  try {
                    const croppedUrl = preview;
                    const originalUrl = previewOriginal;
                    const originalFile = imagenOriginal;

                    if (originalFile && originalUrl) {
                      // Revoke the cropped preview URL if it was an object URL and different from original
                      try {
                        if (croppedUrl && croppedUrl !== originalUrl && croppedUrl.startsWith('blob:')) {
                          URL.revokeObjectURL(croppedUrl);
                        }
                      } catch (e) {
                        // ignore revoke errors
                      }

                      // Restore original file and preview so subsequent crops operate on the original
                      setFile(originalFile);
                      setPreview(originalUrl);

                      // Remove cropped entry from imageBlobs map
                      setImageBlobs(prev => {
                        const copy = { ...(prev || {}) };
                        if (croppedUrl && copy[croppedUrl]) delete copy[croppedUrl];
                        return copy;
                      });
                    } else if (originalUrl) {
                      // If we only have the original URL, fall back to using it
                      setPreview(originalUrl);
                    }

                    // Clear stored "original as backup" state and any enhanced preview
                    setPreviewOriginal(null);
                    setImagenOriginal(null);
                    setImagenMejorada(null);
                    setImagenStatus('original');

                    // Clear any saved crop points so they don't persist
                    setCropPoints([]);
                    setDetectedCropPoints(null);

                    // Reset carousel so original becomes the visible item
                    setCarouselItems(prev => prev ? prev.filter(it => it.type !== 'recortada' && it.type !== 'mejorada') : []);
                    setCarouselIndex(0);
                  } catch (err) {
                    logger.warn('Error removing cropped image:', err, '[IaImage]');
                  }
                }}
                carouselCount={carouselItems.length}
                carouselIndex={carouselIndex}
                carouselItems={carouselItems}
              />
            );
          })()}
          {/* Columna derecha: Resultados */}
          <div
            className={`border-2 rounded-xl shadow-xl p-4 ${parsedData ? "bg-white border-green-500" : "bg-gray-50 border-gray-300"}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">
                    {parsedData ? "✅" : loading ? "⏳" : "📋"}
                  </span>
                  {parsedData
                    ? "Factura Procesada"
                    : loading
                      ? "Analizando..."
                      : "Presiona Analizar para comenzar"}
                </h2>

                {metadata?.timing?.totalMs != null && (
                  <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                    <div>
                      ⏱️ Tiempo: {(metadata.timing.totalMs / 1000).toFixed(3)}s
                      ({metadata.timing.totalMs} ms)
                      {metadata.timing.visionMs
                        ? ` • IA: ${metadata.timing.visionMs} ms`
                        : ""}
                    </div>
                    {metadata.image?.reduction && (
                      <div className="text-green-600 font-medium">
                        🎯 Imagen optimizada: {metadata.image.reduction} más
                        ligera
                        {metadata.image.optimized &&
                          metadata.image.original && (
                            <span className="text-gray-400 ml-1">
                              ({metadata.image.optimized.width}×
                              {metadata.image.optimized.height} • escala de
                              grises)
                            </span>
                          )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {parsedData && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => submit(true)}
                    disabled={loading}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium flex items-center gap-1"
                    title="Reprocesar la imagen"
                  >
                    {loading ? "⏳" : "🔄"} Reprocesar
                  </button>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                      🔍 Ver JSON
                    </summary>
                    <div className="absolute right-4 mt-2 bg-gray-900 text-green-400 p-3 rounded-lg shadow-xl max-w-md max-h-96 overflow-auto z-50">
                      <pre className="text-xs">
                        {JSON.stringify(parsedData, null, 2)}
                      </pre>
                    </div>
                  </details>
                </div>
              )}
            </div>

            {parsedData ? (
              <>
                {buscandoDatos && (
                  <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-4 flex items-center gap-3">
                    <div className="animate-spin text-2xl">🔍</div>
                    <div className="text-sm text-blue-900 font-medium">
                      Buscando proveedor, productos y pedidos relacionados...
                    </div>
                  </div>
                )}

                <AlertaFacturaDuplicada factura={facturaDuplicada} />
                <ResultadoBusquedaProveedor
                  proveedorEncontrado={proveedorEncontrado}
                />
                <PedidosRelacionados pedidos={pedidosRelacionados} />

                <EncabezadoFactura
                  documento={parsedData.documento}
                  emisor={parsedData.emisor}
                  proveedorEncontrado={proveedorEncontrado}
                  CampoEditable={CampoEditableWrapper}
                  onCrearProveedor={() => setModalCrearProveedor(true)}
                />

                {/* Modal para crear proveedor directamente desde el encabezado */}
                <ModalCrearProveedor
                  datosFactura={parsedData.emisor}
                  isOpen={modalCrearProveedor}
                  onCancelar={() => setModalCrearProveedor(false)}
                  onCreado={async (nuevo) => {
                    // Asociar proveedor creado y recargar búsquedas
                    await handleAsociarProveedor(nuevo);
                    setModalCrearProveedor(false);
                  }}
                />

                <TotalesFactura
                  totales={parsedData.totales}
                  items={parsedData.items}
                  CampoEditable={CampoEditableWrapper}
                />

                <ListaProductos
                  items={parsedData.items}
                  productosBuscados={productosBuscados}
                  buscandoDatos={buscandoDatos}
                  CampoEditable={CampoEditableWrapper}
                  aliasesPorItem={aliasesPorItem}
                  proveedorId={proveedorEncontrado?.proveedor?.id}
                  onAbrirModalMapeo={abrirModalMapeo}
                />

                {/* Footer resumen con botón de guardar abajo */}
                <FacturaResumenFooter
                  parsedData={parsedData}
                  proveedorEncontrado={proveedorEncontrado}
                  aliasesPorItem={aliasesPorItem}
                  productosBuscados={productosBuscados}
                  onGuardarFactura={handleGuardarFactura}
                  guardando={guardandoFactura}
                />

                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900 font-medium">
                    📄 Ver JSON completo
                  </summary>
                  <pre className="mt-2 bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto border border-gray-700">
                    {JSON.stringify(parsedData, null, 2)}
                  </pre>
                </details>
              </>
            ) : (
              <div className="space-y-4">
                {loading && <LoadingSkeletons />}

                {!loading && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-6xl mb-4">📋</div>
                    <p className="text-lg font-medium mb-2">Imagen cargada</p>
                    <p className="text-sm mb-4">
                      Presiona &quot;Analizar&quot; para procesar la factura
                    </p>
                  </div>
                )}

                {errorMessage && (
                  <div className="mb-4 bg-red-50 border border-red-300 rounded-lg p-3 text-red-800 flex items-start justify-between">
                    <div>
                      <div className="font-medium">
                        Error al analizar la imagen
                      </div>
                      <div className="text-sm mt-1 break-words">
                        {errorMessage}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => submit(false)}
                        disabled={loading}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        🔁 Reintentar
                      </button>
                      <button
                        onClick={() => setErrorMessage(null)}
                        className="text-sm text-gray-600 mt-1"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                )}

                {!loading && (
                  <div className="flex gap-3">
                    <button
                      className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors font-bold text-lg shadow-lg"
                      onClick={submit}
                      disabled={!file}
                    >
                      🚀 Analizar Factura
                    </button>

                    {/* Streaming preview removed — unreliable feature */}
                  </div>
                )}

                {loading && (
                  <div className="text-center py-2 text-blue-600 font-medium animate-pulse">
                    ⏳ Analizando factura, por favor espera...
                  </div>
                )}

                {/* Streaming previews removed — feature was unreliable and rarely used. */}
                <div className="mt-4 grid grid-cols-2 gap-3 items-start">
                  {streamRestored && (
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">
                        ✨ Mejorada (preview)
                      </div>
                      <div
                        className="relative w-full"
                        style={{ minHeight: 120 }}
                      >
                        <NextImage
                          src={`data:image/png;base64,${streamRestored}`}
                          alt="restored preview"
                          unoptimized={true}
                          className="rounded-lg border"
                          width={800}
                          height={600}
                        />
                      </div>
                    </div>
                  )}

                  {streamInferPreview && (
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">
                        🔎 Infer preview (enviado a OCR/LLM)
                      </div>
                      <div
                        className="relative w-full"
                        style={{ minHeight: 120 }}
                      >
                        <NextImage
                          src={`data:image/jpeg;base64,${streamInferPreview}`}
                          alt="infer preview"
                          unoptimized={true}
                          className="rounded-lg border"
                          width={800}
                          height={600}
                        />
                      </div>
                      {streamInferMeta && (
                        <div className="text-xs text-muted mt-1">
                          {streamInferMeta.width}×{streamInferMeta.height} •{" "}
                          {Math.round((streamInferMeta.size_bytes || 0) / 1024)}
                          KB • q{streamInferMeta.quality} •{" "}
                          {streamInferMeta.gray ? "grayscale" : "color"}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="col-span-2 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-2">
                    {streamOcr && (
                      <div className="mb-2">
                        <div className="font-medium text-xs text-gray-600">
                          🔤 OCR (preview)
                        </div>
                        <pre className="text-xs mt-1 max-h-28 overflow-auto bg-white p-2 rounded border">
                          {streamOcr}
                        </pre>
                      </div>
                    )}
                    {streamItems && (
                      <div className="mb-2">
                        <div className="font-medium text-xs text-gray-600">
                          📦 Items (heuristic preview)
                        </div>
                        <ul className="text-xs mt-1 list-disc list-inside max-h-28 overflow-auto">
                          {streamItems.map((it, idx) => (
                            <li key={idx}>
                              {it.descripcion || "(sin descripción)"} —{" "}
                              {it.cantidad ?? "-"} x {it.precio_unitario ?? "-"}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {streamError && (
                      <div className="text-xs text-red-600">
                        Error: {streamError}
                      </div>
                    )}
                  </div>
                </div>

                {/* Advanced options removed: Deshacer auto-enfoque / Re-aplicar auto-enfoque / Recortar manualmente moved to inline workflow.
                    Tips box left for guidance. */}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-gray-700">
                  <div className="font-medium mb-2">💡 Consejos:</div>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Imagen clara y legible</li>
                    <li>Buena iluminación</li>
                    <li>Recorta lo irrelevante</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!preview && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 mb-3">
            📸 Cargar Factura
          </h3>

          <div className="mb-3">
            <FilterSelect
              value={mode}
              save={(val) => setMode(val)}
              options={MODES}
              valueField="value"
              textField="label"
              compact
            />
          </div>

          {!file ? (
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${dragActive ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"}`}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(false);
              }}
              onDrop={(e) => {
                try {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(false);
                  const f = e.dataTransfer?.files?.[0];
                  if (f) onFile(f);
                } catch (dropErr) {
                  console.error(
                    "Error procesando archivo arrastrado:",
                    dropErr,
                  );
                  setErrorMessage(
                    "No se pudo procesar la imagen arrastrada. Intenta subirla mediante el selector.",
                  );
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  document.getElementById("ia-image-input")?.click();
                }
              }}
            >
              <input
                id="ia-image-input"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  try {
                    const f = e.target.files?.[0];
                    if (f) onFile(f);
                  } catch (chgErr) {
                    console.error("Error en input file change:", chgErr);
                    setErrorMessage(
                      "Error al leer el archivo seleccionado. Intenta de nuevo.",
                    );
                  }
                }}
                className="hidden"
              />
              <div className="text-3xl mb-1">📸</div>
              <div className="text-sm text-gray-600 font-medium">
                Arrastra y suelta la imagen aquí o haz click para seleccionar
              </div>
              <div className="text-xs text-gray-400 mt-2">
                Soporta PNG, JPG, WEBP
              </div>

              {/* Botón de cámara para capturar foto (ícono pequeño) */}
              <div className="mt-3 flex justify-center sm:hidden">
                <CameraCaptureModal
                  showTrigger={true}
                  onCapture={handleCameraCapture}
                />
              </div>

              {/* Botón grande y visible para celular */}
              <div className="mt-3 sm:hidden">
                <button
                  onClick={() => setCameraOpen(true)}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-bold text-lg"
                >
                  📷 Tomar foto (cámara)
                </button>

                {cameraOpen && (
                  <CameraCaptureModal
                    showTrigger={false}
                    isOpen={cameraOpen}
                    setIsOpen={setCameraOpen}
                    onCapture={handleCameraCapture}
                    onRequestClose={() => setCameraOpen(false)}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold text-base shadow-lg"
                onClick={submit}
                disabled={loading}
              >
                {loading ? "⏳ Analizando..." : "🚀 Analizar Factura"}
              </button>

              {loading && (
                <button
                  onClick={() => {
                    try {
                      if (analysisControllerRef.current) {
                        analysisControllerRef.current.abort();
                        analysisControllerRef.current = null;
                        logger.info('User cancelled analysis', '[IaImage]');
                        setErrorMessage('Análisis cancelado por usuario');
                        setLoading(false);
                        setResult(null);
                      }
                    } catch (err) {
                      logger.warn(`Error cancelling analysis: ${err}`, '[IaImage]');
                    }
                  }}
                  className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold text-base shadow-lg"
                >
                  ✖ Cancelar
                </button>
              )}
            </div>
          )}

          {file && (
            <details className="text-xs mt-2">
              <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                ⚙️ Opciones avanzadas
              </summary>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => {
                    // Abrir modo crop y forzar una nueva autodetección al tocar el botón
                    setCropMode(true)
                    handleAutoDetectCrop(false, true)
                  }}
                  className="flex-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200 font-medium text-xs"
                >
                  ✂️ Recortar
                </button>
                <button
                  onClick={handleAutoDetectCrop}
                  disabled={loading}
                  className="flex-1 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 border border-purple-200 font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🤖 Auto-detectar
                </button>
              </div>

              <div className="mt-2">
                <button
                  onClick={() => setVisionDebug({
                    boxes_xyxy: [[50,30,300,400],[320,50,600,420]],
                    boxes_cls: ['text','logo'],
                    boxes_conf: [0.95,0.87],
                    masks_present: false,
                    src_coords: [[10,10],[500,10],[500,700],[10,700]],
                    coords_are_pixels: true,
                    image_meta: { original: { w: 600, h: 800 }, warped: { w: 580, h: 780 } }
                  })}
                  className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded text-xs"
                >
                  💉 Inject mock vision
                </button>
              </div>

              {visionDebug && (
                <details className="text-xs mt-2">
                  <summary className="cursor-pointer text-gray-600 hover:text-gray-900">🧪 Vision debug</summary>
                  <pre className="mt-2 bg-gray-900 text-green-300 p-2 rounded text-xs max-h-64 overflow-auto">
                    {JSON.stringify(visionDebug, null, 2)}
                  </pre>
                </details>
              )}

            </details>
          )}
        </div>
      )}

      {!parsedData && !preview && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-gray-700">
          <div className="font-medium mb-1">💡 Cómo usar:</div>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>
              El microservicio `vision` debe estar corriendo (por defecto en el
              contenedor: puerto 8000)
            </li>
            <li>
              Modelo{" "}
              <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono text-purple-600">
                qwen2.5-vl
              </code>{" "}
              recomendado para facturas
            </li>
            <li>Usa el recorte para enfocar el área relevante</li>
            <li>Para mejores resultados: imágenes claras, buena iluminación</li>
          </ul>
        </div>
      )}

      {/* Modal de mapeo de alias */}
      <ModalMapeoAlias
        isOpen={modalMapeo.open}
        onClose={cerrarModalMapeo}
        alias={modalMapeo.alias}
        productosOptions={productosParaMapeo}
        onSuccess={handleMapeoExitoso}
      />

      {/* Modal de selector de proveedor */}
      {parsedData?.emisor && (
        <SelectorProveedorSimilar
          proveedorDetectado={parsedData.emisor}
          onSeleccionar={handleAsociarProveedor}
          onCancelar={() => setModalProveedor(false)}
          isOpen={modalProveedor}
          onCrearProveedor={() => {
            setModalProveedor(false);
            setModalCrearProveedor(true);
          }}
        />
      )}
    </div>
  );
}
