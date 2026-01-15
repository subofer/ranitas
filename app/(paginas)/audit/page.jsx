"use client"

import { useState, useEffect } from 'react';
import { getAuditLogs, getAuditStats } from '@/lib/actions/audit';
import { restaurarProducto } from '@/prisma/serverActions/undo';
import { useNotification } from '@/context/NotificationContext';
import Icon from '@/components/formComponents/Icon';
import FilterSelect from '@/components/formComponents/FilterSelect';

const levelColors = {
  INFO: 'bg-blue-100 text-blue-800 border-blue-300',
  SUCCESS: 'bg-green-100 text-green-800 border-green-300',
  WARNING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  ERROR: 'bg-red-100 text-red-800 border-red-300',
  CRITICAL: 'bg-purple-100 text-purple-800 border-purple-300',
};

const categoryIcons = {
  UI: 'desktop',
  DB: 'database',
  SYSTEM: 'cogs',
  AUTH: 'lock',
  FILE: 'file',
};

function AuditRow({ log, onUndo }) {
  const [expanded, setExpanded] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const { addNotification } = useNotification();

  const handleUndo = async () => {
    // Verificar si hay datos completos del producto en metadata
    if (!log.metadata?.productoCompleto) {
      addNotification({
        type: 'error',
        message: 'No hay datos disponibles para deshacer esta acción',
      });
      return;
    }

    setUndoing(true);
    try {
      const result = await restaurarProducto(log.metadata.productoCompleto);
      if (result.success) {
        addNotification({
          type: 'success',
          message: `✓ ${log.metadata.productName} restaurado`,
        });
        onUndo?.();
      } else {
        addNotification({
          type: 'error',
          message: `✗ Error al restaurar: ${result.error}`,
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        message: `✗ Error: ${error.message}`,
      });
    } finally {
      setUndoing(false);
    }
  };

  const canUndo = log.action === 'ELIMINAR_PRODUCTO' && log.level === 'SUCCESS' && log.metadata?.productoCompleto;

  return (
    <>
      <tr className="border-b hover:bg-gray-50 transition">
        <td className="px-4 py-3 text-sm text-gray-600">
          {new Date(log.createdAt).toLocaleString('es-AR')}
        </td>
        <td className="px-4 py-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${levelColors[log.level]}`}>
            {log.level}
          </span>
        </td>
        <td className="px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <Icon icono={categoryIcons[log.category]} className="text-gray-500" />
            <span className="text-gray-700 font-medium">{log.category}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-700">
          {log.action}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600 max-w-md truncate">
          {log.message}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {log.userId || 'Sistema'}
        </td>
        <td className="px-4 py-3 text-center flex gap-2 justify-center">
          {canUndo && (
            <button
              onClick={handleUndo}
              disabled={undoing}
              className="text-green-600 hover:text-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Deshacer"
            >
              <Icon icono="undo" className={undoing ? 'animate-spin' : ''} />
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-blue-600 hover:text-blue-800"
            title="Ver detalles"
          >
            <Icon icono={expanded ? 'chevron-up' : 'chevron-down'} />
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50 border-b">
          <td colSpan="7" className="px-4 py-4">
            <div className="space-y-2">
              <div className="text-sm">
                <h4 className="font-semibold text-gray-900 mb-2">Metadata:</h4>
                <pre className="bg-white border border-gray-300 rounded p-3 text-xs overflow-auto max-h-48 font-mono">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
              <div className="text-sm text-gray-600">
                <strong>Path:</strong> <code className="bg-gray-200 px-2 py-1 rounded text-xs">{log.path}</code>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    level: '',
    category: '',
    limit: 50,
    offset: 0,
  });

  const levelOptions = [
    { value: '', label: 'Todos los niveles' },
    { value: 'INFO', label: 'Información' },
    { value: 'SUCCESS', label: 'Éxito' },
    { value: 'WARNING', label: 'Advertencia' },
    { value: 'ERROR', label: 'Error' },
    { value: 'CRITICAL', label: 'Crítico' },
  ];

  const categoryOptions = [
    { value: '', label: 'Todas las categorías' },
    { value: 'UI', label: 'Interfaz' },
    { value: 'DB', label: 'Base de datos' },
    { value: 'SYSTEM', label: 'Sistema' },
    { value: 'AUTH', label: 'Autenticación' },
    { value: 'FILE', label: 'Archivos' },
  ];

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [logsData, statsData] = await Promise.all([
          getAuditLogs({
            level: filters.level || null,
            category: filters.category || null,
            limit: filters.limit,
            offset: filters.offset,
          }),
          getAuditStats(),
        ]);

        setLogs(logsData.logs || []);
        setStats(statsData);
      } catch (error) {
        console.error('Error cargando auditoría:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      offset: 0,
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Auditoría del Sistema</h1>
          <p className="text-gray-600">Visualiza y administra todos los eventos registrados en la aplicación</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-t-4 border-blue-500">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {stats.byLevel?.INFO || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Información</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-t-4 border-green-500">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {stats.byLevel?.SUCCESS || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Éxito</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-t-4 border-yellow-500">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {stats.byLevel?.WARNING || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Advertencias</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-t-4 border-red-500">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {stats.byLevel?.ERROR || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Errores</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-t-4 border-purple-500">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {stats.byLevel?.CRITICAL || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Crítico</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FilterSelect
              label="Nivel"
              options={levelOptions}
              valueField="value"
              textField="label"
              placeholder="Seleccionar nivel"
              value={filters.level}
              onChange={(val) => handleFilterChange('level', val)}
            />

            <FilterSelect
              label="Categoría"
              options={categoryOptions}
              valueField="value"
              textField="label"
              placeholder="Seleccionar categoría"
              value={filters.category}
              onChange={(val) => handleFilterChange('category', val)}
            />

            <FilterSelect
              label="Resultados por página"
              options={[
                { value: 25, label: '25' },
                { value: 50, label: '50' },
                { value: 100, label: '100' }
              ]}
              valueField="value"
              textField="label"
              placeholder="Cantidad"
              value={filters.limit}
              onChange={(val) => handleFilterChange('limit', val)}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="text-center py-8">
              <Icon icono="spinner" className="text-2xl text-gray-400 animate-spin mx-auto mb-2" />
              <p className="text-gray-600">Cargando registros...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay registros que mostrar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fecha y Hora</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nivel</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Categoría</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Acción</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mensaje</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Usuario</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Detalles</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <AuditRow 
                      key={log.id} 
                      log={log} 
                      onUndo={() => {
                        // Recargar logs
                        setFilters(prev => ({ ...prev }));
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {logs.length > 0 && (
            <div className="mt-6 px-6 pb-6 flex items-center justify-between border-t">
              <p className="text-sm text-gray-600 pt-4">
                Mostrando {filters.offset + 1} - {Math.min(filters.offset + filters.limit)} de varios registros
              </p>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => handleFilterChange('offset', Math.max(0, filters.offset - filters.limit))}
                  disabled={filters.offset === 0}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => handleFilterChange('offset', filters.offset + filters.limit)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
