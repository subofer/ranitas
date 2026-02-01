import { NextResponse } from "next/server";
import sharp from "sharp";
import prisma from "@/prisma/prisma";
import { guardarAuditoriaIaFailure } from "@/prisma/serverActions/facturaActions";
import logger from '@/lib/logger';

// Configuración de timeout para esta ruta (10 minutos)
// NOTE: Ollama external dependency removed; now we call local vision microservice which hosts Qwen
const VISION_HOST = process.env.VISION_HOST || (process.env.NODE_ENV === 'production' ? "http://vision:8000" : "http://localhost:8000");
export const maxDuration = 600; // segundos
export const dynamic = "force-dynamic";

/**
 * Normaliza dimensiones a múltiplos de 28 (requerido por Qwen2.5-VL)
 * Qwen2.5-VL usa parches de 28x28, debe ser exacto o falla con GGML_ASSERT
 */
function normalizeToMultipleOf28(width, height, maxSize = 896) {
  // Calcular el lado más largo
  const maxDimension = Math.max(width, height);

  // Si ya es menor que maxSize, escalar al múltiplo de 28 más cercano
  let targetSize = maxSize;

  if (maxDimension < maxSize) {
    // Encontrar el múltiplo de 28 más cercano que no exceda la dimensión original
    targetSize = Math.floor(maxDimension / 28) * 28;
    // Asegurar un mínimo de 672 (24 * 28) para buena calidad
    if (targetSize < 672) targetSize = 672;
  }

