"use client"

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getInvoices } from '@/prisma/consultas/dashboard';
import { cambiarEstadoDocumento } from '@/prisma/serverActions/documentos';
import { getEstadoDocumentoOptions } from '@/prisma/consultas/opcionesDocumento';
import { CONTROL_PANEL } from '@/lib/controlPanelConfig';
import { formatCurrency, formatDate } from '@/lib/formatters';
import FormCard from '@/components/formComponents/FormCard';
import FormContainer from '@/components/formComponents/FormContainer';
import Button from '@/components/formComponents/Button';
import FilterSelect from '@/components/formComponents/FilterSelect';

export default function FacturasPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, paid
  const [estadoOptions, setEstadoOptions] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const estados = await getEstadoDocumentoOptions();
        setEstadoOptions(estados);

        const filterValue = filter === 'all' ? 'all' : CONTROL_PANEL.facturas.filtros[filter]?.estado || 'all';
        const data = await getInvoices(filterValue);
        setInvoices(data);
      } catch (error) {
        console.error('Error cargando datos:', error);
        setInvoices([]);
        setEstadoOptions([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filter]);

  const handleEstadoChange = async (documentoId, nuevoEstadoCodigo) => {
    try {
      const result = await cambiarEstadoDocumento(documentoId, nuevoEstadoCodigo);
      if (result.success) {
        // Actualizar el estado local
        setInvoices(prev => prev.map(inv => 
          inv.id === documentoId 
            ? { 
                ...inv, 
                estadoDocumento: result.documento.estadoDocumento,
                idEstadoDocumento: result.documento.idEstadoDocumento
              }
            : inv
        ));
      }
    } catch (error) {
      console.error('Error cambiando estado:', error);
      alert('Error al cambiar el estado del documento');
    }
  };

  const getStatusBadge = (estadoDocumento) => {
    if (!estadoDocumento) return null;

    const codigo = estadoDocumento.codigo || estadoDocumento;
    const configEstado = CONTROL_PANEL.facturas.estados[codigo];

    if (configEstado) {
      const colorClasses = {
        red: 'bg-red-100 text-red-800',
        green: 'bg-green-100 text-green-800',
        yellow: 'bg-yellow-100 text-yellow-800',
        gray: 'bg-gray-100 text-gray-800'
      };

      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[configEstado.color] || colorClasses.gray}`}>
          {configEstado.label}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        {estadoDocumento.nombre || estadoDocumento}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{CONTROL_PANEL.facturas.titulo}</h1>
          <p className="text-gray-600">{CONTROL_PANEL.facturas.descripcion}</p>
        </div>

        <FormContainer>
          {/* Filtros */}
          <div className="mb-6">
            <div className="flex gap-2">
              {Object.entries(CONTROL_PANEL.facturas.filtros).map(([key, config]) => (
                <Button
                  key={key}
                  tipo={filter === key ? 'enviar' : 'neutro'}
                  onClick={() => setFilter(key)}
                  className="px-4 py-2"
                >
                  {config.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Tabla de facturas */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Imagen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Número
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente/Proveedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.length > 0 ? (
                  invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <Image src={`/uploads/invoices/${invoice.id}.jpg`} alt={`Factura ${invoice.numeroDocumento || invoice.id}`} width={48} height={32} className="object-cover rounded" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/favicon.ico' }} data-cy="imagen-resultado" />
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invoice.numeroDocumento || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(invoice.fecha)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.receptor?.razonSocial || invoice.emisor?.razonSocial || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invoice.tipoDocumento?.nombre || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(invoice.estadoDocumento)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.total || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <FilterSelect
                            options={estadoOptions}
                            valueField="codigo"
                            textField="nombre"
                            value={invoice.estadoDocumento?.codigo || ''}
                            onChange={(option) => handleEstadoChange(invoice.id, option?.codigo)}
                            className="w-24"
                            placeholder="Estado"
                          />
                          <Button
                            tipo="neutro"
                            onClick={() => console.log('Ver detalles:', invoice.id)}
                            className="px-3 py-1 text-xs"
                          >
                            Ver
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg font-medium">No hay facturas</p>
                        <p className="text-sm">No se encontraron facturas para el filtro seleccionado.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Resumen */}
          {invoices.length > 0 && (
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{CONTROL_PANEL.facturas.resumen.titulo}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-500">{CONTROL_PANEL.facturas.resumen.totalLabel}</div>
                  <div className="text-2xl font-bold text-gray-900">{invoices.length}</div>
                </div>
                {Object.entries(CONTROL_PANEL.facturas.filtros).filter(([key]) => key !== 'all').map(([key, config]) => {
                  const count = invoices.filter(inv => inv.estadoDocumento?.codigo === config.estado).length;
                  return (
                    <div key={key} className="bg-white p-4 rounded-lg border">
                      <div className="text-sm text-gray-500">{config.label}</div>
                      <div className="text-2xl font-bold text-gray-900">{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </FormContainer>
      </div>
    </div>
  );
}
