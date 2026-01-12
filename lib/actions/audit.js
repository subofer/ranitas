"use server"

import prisma from "@/prisma/prisma";

/**
 * Crea un registro de auditoría en la BD
 * @param {Object} params - Parámetros del log
 * @param {string} params.level - Nivel: INFO, SUCCESS, WARNING, ERROR, CRITICAL
 * @param {string} params.category - Categoría: UI, DB, SYSTEM, AUTH, FILE
 * @param {string} params.action - Acción realizada
 * @param {string} params.message - Mensaje descriptivo
 * @param {Object} params.metadata - Datos adicionales (JSON)
 * @param {string} params.path - Ruta/path donde ocurrió
 * @param {string} params.userId - ID del usuario (opcional)
 * @returns {Promise<Object>} Log creado o error
 */
export async function createAuditLog({
  level = 'INFO',
  category = 'SYSTEM',
  action,
  message,
  metadata = null,
  path = '',
  userId = null,
}) {
  try {
    const auditLog = await prisma.auditLog.create({
      data: {
        level,
        category,
        action,
        message,
        metadata: metadata || null,
        path,
        userId,
      },
    });

    return { success: true, log: auditLog };
  } catch (error) {
    console.error('Error creando audit log:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Wrapper helper para agregar auditoría a una Server Action
 * NO ES UNA FUNCIÓN DE ORDEN SUPERIOR
 * 
 * USO DENTRO DE TU SERVER ACTION:
 * try {
 *   result = await tuncion()
 *   auditAction({level: 'SUCCESS', action: 'MI_ACCION', message: 'Exitoso'})
 * } catch(e) {
 *   auditAction({level: 'ERROR', action: 'MI_ACCION', message: e.message})
 * }
 */
export async function auditAction({
  level = 'INFO',
  action,
  message,
  category = 'DB',
  metadata = null,
  userId = null,
}) {
  try {
    // Incluir userId en metadata si se proporciona
    const enrichedMetadata = metadata ? { ...metadata, userId } : { userId };
    
    await createAuditLog({
      level,
      category,
      action,
      message,
      metadata: enrichedMetadata,
      path: 'server-action',
      userId,
    });
  } catch (error) {
    console.error('Error creando audit log:', error);
  }
}

/**
 * Wrapper de orden superior ASYNC para Server Actions con auditoría
 * FORMA ALTERNATIVA: si necesitas un wrapper
 */
export async function withAudit(serverAction, actionName, category = 'DB') {
  return async function wrappedAction(...args) {
    const startTime = Date.now();
    let result;
    let auditLevel = 'INFO';
    let auditMessage = `${actionName} iniciado`;
    let auditMetadata = {
      argsLength: args.length,
      duration: 0,
    };

    try {
      // Ejecutar la Server Action original
      result = await serverAction(...args);

      // Determinar nivel basado en el resultado
      if (result?.error) {
        auditLevel = 'ERROR';
        auditMessage = `${actionName} falló: ${result?.msg || result?.error}`;
      } else if (result?.success === false) {
        auditLevel = 'WARNING';
        auditMessage = `${actionName} completado con advertencias`;
      } else {
        auditLevel = 'SUCCESS';
        auditMessage = `${actionName} completado exitosamente`;
      }

      auditMetadata.duration = Date.now() - startTime;

      // Crear log de auditoría (sin await para no bloquear)
      createAuditLog({
        level: auditLevel,
        category,
        action: actionName,
        message: auditMessage,
        metadata: Object.keys(auditMetadata).length > 0 ? auditMetadata : null,
        path: 'server-action',
      }).catch(err => console.error('Error en audit log:', err));

      return result;
    } catch (error) {
      auditLevel = 'CRITICAL';
      auditMessage = `${actionName} error crítico: ${error.message}`;
      auditMetadata.error = error.message;
      auditMetadata.duration = Date.now() - startTime;

      // Crear log de auditoría del error (sin await)
      createAuditLog({
        level: auditLevel,
        category,
        action: actionName,
        message: auditMessage,
        metadata: Object.keys(auditMetadata).length > 0 ? auditMetadata : null,
        path: 'server-action',
      }).catch(err => console.error('Error en audit log:', err));

      // Re-lanzar el error
      throw error;
    }
  };
}

/**
 * Obtener logs de auditoría con filtros
 * @param {Object} filters - Filtros
 * @returns {Promise<Array>} Array de logs
 */
export async function getAuditLogs({
  level = null,
  category = null,
  userId = null,
  limit = 50,
  offset = 0,
  startDate = null,
  endDate = null,
} = {}) {
  try {
    const where = {};

    if (level) where.level = level;
    if (category) where.category = category;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total, limit, offset };
  } catch (error) {
    console.error('Error obteniendo audit logs:', error);
    return { logs: [], total: 0, error: error.message };
  }
}

/**
 * Obtener estadísticas de auditoría
 * @returns {Promise<Object>} Estadísticas
 */
export async function getAuditStats() {
  try {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [byLevel, byCategory, totalLast24h] = await Promise.all([
      prisma.auditLog.groupBy({
        by: ['level'],
        _count: true,
      }),
      prisma.auditLog.groupBy({
        by: ['category'],
        _count: true,
      }),
      prisma.auditLog.count({
        where: { createdAt: { gte: last24h } },
      }),
    ]);

    return {
      byLevel: Object.fromEntries(byLevel.map(l => [l.level, l._count])),
      byCategory: Object.fromEntries(byCategory.map(c => [c.category, c._count])),
      totalLast24h,
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return {};
  }
}
