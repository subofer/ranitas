import { NextResponse } from "next/server";
import logger from '@/lib/logger';
import { guardarAuditoriaIaFailure } from "@/prisma/serverActions/facturaActions";
import crypto from 'crypto';

// Prompts específicos por modo
const PROMPTS = {
  factura: `Analiza esta imagen de factura/comprobante de compra y extrae TODA la información visible.
Responde ÚNICAMENTE con un JSON válido (sin texto adicional, sin markdown).

El JSON debe tener esta estructura exacta:
{
  "proveedor": {
    "nombre": "",
    "cuit": "",
    "direccion": "",
    "telefono": "",
    "email": ""
  },
  "documento": {
    "tipo": "FACTURA|REMITO|TICKET|RECIBO|NOTA_CREDITO|NOTA_DEBITO",
    "letra": "A|B|C|X|M",
    "numero": "",
    "fecha": "DD/MM/AAAA",
    "cae": "",
    "vencimiento_cae": ""
  },
  "cliente": {
    "nombre": "",
    "cuit": "",
    "direccion": ""
  },
  "items": [
    {
      "codigo": "",
      "descripcion": "",
      "cantidad": 0,
      "unidad": "",
      "precio_unitario": 0,
      "descuento": 0,
      "iva": 0,
      "subtotal": 0
    }
  ],
  "impuestos": [
    {
      "tipo": "IVA_21|IVA_10_5|IVA_27|PERCEPCION_IIBB|PERCEPCION_IVA|OTRO",
      "descripcion": "",
      "base_imponible": 0,
      "alicuota": 0,
      "monto": 0
    }
  ],
  "descuentos": [
    {
      "descripcion": "",
      "monto": 0
    }
  ],
  "otros_cargos": [
    {
      "tipo": "FLETE|ENVIO|SEGURO|FINANCIACION|OTRO",
      "descripcion": "",
      "monto": 0
    }
  ],
  "totales": {
    "subtotal": 0,
    "descuentos_total": 0,
    "impuestos_total": 0,
    "otros_cargos_total": 0,
    "total": 0
  },
  "observaciones": "",
  "tiene_escrito_a_mano": false,
  "escritos_a_mano": ["]
}

IMPORTANTE:
- Los números deben ser números (no strings)
- Las fechas en formato DD/MM/AAAA
- Si un campo no está visible, dejarlo como "" o 0
- Incluir TODOS los items/productos visibles
- Calcular subtotales si no están explícitos
- Si hay descuentos por item, incluirlos en cada item`,

  producto: `Analiza esta imagen de producto y extrae la información visible.
Responde ÚNICAMENTE con un JSON válido:
{
  "nombre": "",
  "marca": "",
  "descripcion": "",
  "codigo_barras": "",
  "contenido": "",
  "unidad_medida": "",
  "ingredientes": "",
  "informacion_nutricional": {},
  "precio": 0,
  "observaciones": ""
}`,

  general: `Analiza esta imagen y describe su contenido en detalle.
Si es un documento, extrae la información estructurada.
Responde en formato JSON cuando sea posible.`
};

// Minimal proxy to vision microservice
const VISION_HOST = process.env.VISION_HOST || (process.env.NODE_ENV === 'production' ? "http://vision:8000" : "http://localhost:8000");
export const maxDuration = 600; // seconds
export const dynamic = "force-dynamic";

async function forwardToVisionAnalyze(payload) {
  try {
    return await fetch(`${VISION_HOST}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // dev fallback
    if (VISION_HOST && VISION_HOST.includes('vision')) {
      return await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    throw err;
  }
}

export async function POST(req) {
  const tStart = Date.now();
  try {
    logger.info('🖼️ Image proxy (minimal) starting...', '[image-route]');

    const formData = await req.formData();
    const action = String(formData.get('action') || 'process');
    const mode = String(formData.get('mode') || 'general');
    const model = formData.get('model') || undefined;
    const debug = String(formData.get('debug') || '').toLowerCase() === 'true' || String(formData.get('debug') || '') === '1';

    const image = formData.get('image');
    const originalImage = formData.get('original');
    
    // Log what we received
    try {
      logger.info('Received images', { 
        has_image: !!image, 
        image_size: image?.size || 'unknown',
        has_original: !!originalImage,
        original_size: originalImage?.size || 'unknown',
        action
      }, '[image-route]');
    } catch (e) {}
    
    if (!image) {
      const tNow = Date.now();
      return NextResponse.json({ ok: false, error: 'No se recibió imagen', metadata: { timing: { totalMs: tNow - tStart, human: `${tNow - tStart}ms` } } }, { status: 400 });
    }

    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const md5 = crypto.createHash('md5').update(buffer).digest('hex');
    try { logger.info('Image proxy - computed checksums', { bytes: buffer.length, md5, image_type: image?.type }, '[image-route]'); } catch (e) {}

    if (action === 'detect-corners') {
      const form = new FormData();
      // Prefer appending the original File/Blob to avoid any re-encoding/truncation issues.
      try {
        form.append('file', image, image.name || 'upload.jpg');
      } catch (e) {
        // Fallback: rebuild from buffer
        const blob = new Blob([buffer], { type: image.type || 'image/jpeg' });
        form.append('file', blob, image.name || 'upload.jpg');
      }
      // Diagnostic metadata to help detect truncation or transport issues
      form.append('orig_len', String(buffer.length));
      form.append('orig_md5', md5);
      if (debug) form.append('debug', 'true');
      try { logger.info('Forwarding image to vision /crop', { bytes: buffer.length, md5, image_type: image?.type }, '[image-route]'); } catch (e) {}

      const vResp = await fetch(`${VISION_HOST}/crop`, { method: 'POST', body: form });
      const vData = await vResp.json().catch(() => null);
      try { logger.info('Vision /crop response', { status: vResp.status, keys: vData ? Object.keys(vData) : null, src_coords_preview: vData && vData.src_coords ? (Array.isArray(vData.src_coords) ? vData.src_coords.slice(0,4) : vData.src_coords) : null }, '[image-route]'); } catch (e) {}
      if (!vResp.ok) return NextResponse.json({ ok: false, error: vData?.error || 'vision/crop_error', vision_raw: vData }, { status: vResp.status || 500 });

      // detect if returned src_coords are in pixel coordinates (values > 1) so frontend knows to normalize
      let coordsArePixels = false;
      try {
        const sc = vData?.src_coords;
        if (sc && Array.isArray(sc)) {
          coordsArePixels = sc.some(pt => {
            if (Array.isArray(pt)) return (typeof pt[0] === 'number' && pt[0] > 1) || (typeof pt[1] === 'number' && pt[1] > 1);
            if (pt && typeof pt.x === 'number') return pt.x > 1 || pt.y > 1;
            return false;
          });
        }
      } catch (e) {
        coordsArePixels = false;
      }

      return NextResponse.json({ ok: true, src_coords: vData?.src_coords || null, coords_are_pixels: coordsArePixels, detected_class: vData?.detected_class || vData?.detected || null, image_b64: vData?.image_b64 ? `data:image/jpeg;base64,${vData.image_b64}` : null, debug: vData?.debug || null, metadata: { timing: { totalMs: Date.now() - tStart, human: `${Date.now() - tStart}ms` } } });
    }

    if (action === 'warp') {
      const pointsParam = formData.get('points');
      if (!pointsParam) return NextResponse.json({ ok: false, error: 'Se requieren puntos para enderezar la imagen' }, { status: 400 });
      const points = JSON.parse(String(pointsParam));
      const form = new FormData();
      try {
        form.append('file', image, image.name || 'upload.jpg');
      } catch (e) {
        const blob = new Blob([buffer], { type: image.type || 'image/jpeg' });
        form.append('file', blob, image.name || 'upload.jpg');
      }
      // Diagnostic metadata
      form.append('orig_len', String(buffer.length));
      form.append('orig_md5', md5);
      form.append('points', JSON.stringify(points));
      try { logger.info('Forwarding image to vision /warp', { bytes: buffer.length, md5, image_type: image?.type, points }, '[image-route]'); } catch (e) {}

      const vResp = await fetch(`${VISION_HOST}/warp`, { method: 'POST', body: form });
      const vData = await vResp.json().catch(() => null);
      try { logger.info('Vision /warp response:', { status: vResp.status, keys: vData ? Object.keys(vData) : null, has_image: !!(vData && (vData.image || vData.enhanced)), image_len: vData && (vData.image || vData.enhanced) ? (vData.image || vData.enhanced).length : null }, '[image-route]'); } catch (e) {}
      if (!vResp.ok) return NextResponse.json({ ok: false, error: vData?.detail || 'vision/warp_error' }, { status: vResp.status || 500 });
      const enhancedRaw = vData?.image || vData?.image_b64 || vData?.enhanced || null;
      const tEndWarp = Date.now();
      return NextResponse.json({ ok: true, enhanced: enhancedRaw ? `data:image/jpeg;base64,${enhancedRaw}` : null, metadata: { timing: { totalMs: tEndWarp - tStart, human: `${tEndWarp - tStart}ms` } }, vision_meta: vData });
    }

    // Default analyze path
    const payloadImageBase64 = Buffer.from(buffer).toString('base64');
    
    // Generar prompt basado en el modo
    const promptForMode = PROMPTS[mode] || PROMPTS.general;
    
    const payload = { 
      image: payloadImageBase64, 
      model: model || undefined, 
      mode: mode || undefined,
      prompt: promptForMode  // Enviar el prompt específico al backend
    };
    
    logger.info('Sending analyze request', { mode, prompt_length: promptForMode.length, has_model: !!model }, '[image-route]');

    // If the client provided src_coords (from crop), forward them to the vision analyze endpoint
    try {
      const srcCoordsParam = formData.get('src_coords') || null;
      const coordsArePixelsParam = String(formData.get('coords_are_pixels') || '').toLowerCase();
      if (srcCoordsParam) {
        try {
          payload.src_coords = typeof srcCoordsParam === 'string' ? JSON.parse(srcCoordsParam) : srcCoordsParam;
          payload.coords_are_pixels = coordsArePixelsParam === 'true' || coordsArePixelsParam === '1' ? true : false;
        } catch (e) {
          // leave absent if parsing failed
          logger.warn('Could not parse src_coords param, ignoring', '[image-route]');
        }
      }
    } catch (e) {
      logger.warn('Error reading src_coords from formData', e);
    }

    let resp;
    try {
      resp = await forwardToVisionAnalyze(payload);
    } catch (err) {
      logger.error(`No se pudo conectar al microservicio vision: ${err.message}`, '[image-route]');
      try { await guardarAuditoriaIaFailure({ model: model || 'unknown', mode, fileName: image?.name || 'unknown', fileSize: image?.size || buffer.length, responseStatus: 0, errorText: err.message, timing: { before: tStart, after: Date.now() } }); } catch (_) {}
      return NextResponse.json({ ok: false, error: 'El microservicio de visión (ranitas-vision) no está disponible. Verifica que el contenedor Docker esté corriendo.', retryable: true }, { status: 502 });
    }

    if (!resp.ok) {
      const text = await resp.text().catch(() => null);
      let errorMsg = 'Vision microservice error';
      let retryable = false;
      
      // Detect specific error types for better user messages
      if (text) {
        const textLower = text.toLowerCase();
        if (textLower.includes('ollama') && (textLower.includes('not') || textLower.includes('unavailable') || textLower.includes('connection'))) {
          errorMsg = 'No hay modelos LLM disponibles. Ollama no está corriendo o no tiene modelos cargados.';
          retryable = true;
        } else if (textLower.includes('model') && textLower.includes('not found')) {
          errorMsg = 'El modelo LLM especificado no está disponible.';
          retryable = true;
        } else if (textLower.includes('timeout') || textLower.includes('time out')) {
          errorMsg = 'Timeout procesando la imagen. El servicio está ocupado o lento.';
          retryable = true;
        }
      }
      
      try { await guardarAuditoriaIaFailure({ model: model || 'unknown', mode, fileName: image?.name || 'unknown', fileSize: image?.size || buffer.length, responseStatus: resp.status, errorText: text, timing: { before: tStart, after: Date.now() } }); } catch (_) {}
      return NextResponse.json({ ok: false, error: errorMsg, details: text, retryable }, { status: resp.status || 502 });
    }

    const body = await resp.json().catch(() => null);
    const tEnd = Date.now();
    return NextResponse.json({ ok: true, vision: body, metadata: { timing: { totalMs: tEnd - tStart, human: `${tEnd - tStart}ms` } } });
  } catch (error) {
    const tNow = Date.now();
    logger.error(`❌ Error general: ${String(error)}`, '[image-route]');
    return NextResponse.json({ ok: false, error: error.message, details: error.stack, metadata: { timing: { totalMs: typeof tStart !== 'undefined' ? tNow - tStart : undefined, human: typeof tStart !== 'undefined' ? `${tNow - tStart}ms` : undefined } } }, { status: 500 });
  }
}
