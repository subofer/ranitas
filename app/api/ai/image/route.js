import { NextResponse } from "next/server";
import logger from '@/lib/logger';
import { guardarAuditoriaIaFailure } from "@/prisma/serverActions/facturaActions";

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
    if (!image) {
      const tNow = Date.now();
      return NextResponse.json({ ok: false, error: 'No se recibió imagen', metadata: { timing: { totalMs: tNow - tStart, human: `${tNow - tStart}ms` } } }, { status: 400 });
    }

    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (action === 'detect-corners') {
      const form = new FormData();
      const blob = new Blob([buffer], { type: image.type || 'image/jpeg' });
      form.append('file', blob, image.name || 'upload.jpg');
      if (debug) form.append('debug', 'true');

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
      const blob = new Blob([buffer], { type: image.type || 'image/jpeg' });
      form.append('file', blob, image.name || 'upload.jpg');
      form.append('points', JSON.stringify(points));

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
    const payload = { image: payloadImageBase64, model: model || undefined, mode: mode || undefined };

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
