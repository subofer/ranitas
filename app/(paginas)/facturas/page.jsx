"use client"

import { useState, useEffect } from 'react';
import { getInvoices } from '@/prisma/consultas/dashboard';
import FormCard from '@/components/formComponents/FormCard';
import FormContainer from '@/components/formComponents/FormContainer';
import Button from '@/components/formComponents/Button';

export default function FacturasPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, paid

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        const data = await getInvoices(filter);
        setInvoices(data);
      } catch (error) {
        console.error('Error cargando facturas:', error);
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, [filter]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('es-AR').format(new Date(date));
  };

  const getStatusBadge = (tipoMovimiento) => {
    if (tipoMovimiento === 'SALIDA') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Pendiente
        </span>
      );
    } else if (tipoMovimiento === 'ENTRADA') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Pagada
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        {tipoMovimiento}
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Facturas</h1>
          <p className="text-gray-600">Administra tus facturas pagadas e impagas</p>
        </div>

        <FormContainer>
          {/* Filtros */}
          <div className="mb-6">
            <div className="flex gap-2">
              <Button
                tipo={filter === 'all' ? 'enviar' : 'neutro'}
                onClick={() => setFilter('all')}
                className="px-4 py-2"
              >
                Todas
              </Button>
              <Button
                tipo={filter === 'pending' ? 'enviar' : 'neutro'}
                onClick={() => setFilter('pending')}
                className="px-4 py-2"
              >
                Pendientes
              </Button>
              <Button
                tipo={filter === 'paid' ? 'enviar' : 'neutro'}
                onClick={() => setFilter('paid')}
                className="px-4 py-2"
              >
                Pagadas
              </Button>
            </div>
          </div>

          {/* Tabla de facturas */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
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
                        {invoice.tipoDocumento}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(invoice.tipoMovimiento)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.total || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          tipo="neutro"
                          onClick={() => console.log('Ver detalles:', invoice.id)}
                          className="px-3 py-1 text-xs"
                        >
                          Ver
                        </Button>
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
              <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-500">Total de Facturas</div>
                  <div className="text-2xl font-bold text-gray-900">{invoices.length}</div>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-500">Pendientes</div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {invoices.filter(inv => inv.tipoMovimiento === 'SALIDA').length}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-500">Pagadas</div>
                  <div className="text-2xl font-bold text-green-600">
                    {invoices.filter(inv => inv.tipoMovimiento === 'ENTRADA').length}
                  </div>
                </div>
              </div>
            </div>
          )}
        </FormContainer>
      </div>
    </div>
  );
}
