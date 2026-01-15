"use client"

import { useEffect, useState } from 'react';
import FormContainer from '@/components/formComponents/FormContainer';
import Button from '@/components/formComponents/Button';
import Icon from '@/components/formComponents/Icon';
import { aplicarPendienteAliasProveedor, aplicarPendienteFacturaItem, getPendientes } from '@/prisma/serverActions/pendientes';
import { useErrorNotification } from '@/hooks/useErrorNotification';
import { getProductos } from '@/prisma/consultas/productos';
import SelectOnClientByProps from '@/components/proveedores/SelectOnClientByProps';

export default function PendientesPage() {
  const { showError, showSuccess } = useErrorNotification();
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState('ABIERTO');

  const [modalAplicar, setModalAplicar] = useState({ open: false, pendiente: null });
  const [productosOptions, setProductosOptions] = useState({ options: [] });
  const [aplicarProductoId, setAplicarProductoId] = useState('');
  const [aplicarPresentacionId, setAplicarPresentacionId] = useState('');
  const [aplicando, setAplicando] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await getPendientes({ estado });
      if (res?.success) {
        setPendientes(res.pendientes || []);
      } else {
        setPendientes([]);
        showError('No se pudieron cargar los pendientes');
      }
    } catch (e) {
      console.error(e);
      setPendientes([]);
      showError('Error cargando pendientes: ' + (e?.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  const abrirModalAplicar = async (pendiente) => {
    setAplicarProductoId('');
    setAplicarPresentacionId('');
    setModalAplicar({ open: true, pendiente });

    try {
      if ((productosOptions?.options || []).length === 0) {
        const { productos } = await getProductos({ take: 5000 });
        setProductosOptions({ options: productos || [] });
      }
    } catch (e) {
      console.error(e);
      showError('No se pudieron cargar productos para aplicar el pendiente');
    }
  };

  const cerrarModalAplicar = () => {
    if (aplicando) return;
    setModalAplicar({ open: false, pendiente: null });
  };

  const productoSeleccionado = (productosOptions?.options || []).find((p) => p?.id === aplicarProductoId) || null;
  const presentacionesProducto = (productoSeleccionado?.presentaciones || []).slice().sort((a, b) => (a?.nombre || '').localeCompare(b?.nombre || '', 'es'));

  const aplicar = async () => {
    const pid = modalAplicar?.pendiente?.id;
    if (!pid) return;
    if (!aplicarProductoId) {
      showError('Seleccioná un producto');
      return;
    }

    const tipo = modalAplicar?.pendiente?.tipo;

    setAplicando(true);
    try {
      const res = tipo === 'ALIAS_PRESENTACION_PROVEEDOR'
        ? await aplicarPendienteAliasProveedor(pid, { idProducto: aplicarProductoId, presentacionId: aplicarPresentacionId || null })
        : await aplicarPendienteFacturaItem(pid, { idProducto: aplicarProductoId, presentacionId: aplicarPresentacionId || null });
      if (res?.success) {
        showSuccess(tipo === 'ALIAS_PRESENTACION_PROVEEDOR' ? 'Alias mapeado' : 'Pendiente aplicado (stock/precio actualizado)', 2500);
        cerrarModalAplicar();
        cargar();
      } else {
        showError(res?.msg || 'No se pudo aplicar el pendiente');
      }
    } catch (e) {
      console.error(e);
      showError('Error aplicando pendiente: ' + (e?.message || 'Error'));
    } finally {
      setAplicando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Pendientes de Corrección</h1>
            <p className="text-gray-600">Lista de tareas para corregir datos sin frenar el flujo</p>
          </div>
          <Button tipo="neutro" onClick={cargar}>
            <Icon icono="sync" className="mr-2" />
            Recargar
          </Button>
        </div>

        <FormContainer>
          <div className="flex gap-2 mb-4">
            <Button tipo={estado === 'ABIERTO' ? 'enviar' : 'neutro'} onClick={() => setEstado('ABIERTO')}>
              Abiertos
            </Button>
            <Button tipo={estado === 'RESUELTO' ? 'enviar' : 'neutro'} onClick={() => setEstado('RESUELTO')}>
              Resueltos
            </Button>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando pendientes...</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-xl shadow-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contexto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entidad</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendientes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No hay pendientes</td>
                    </tr>
                  ) : (
                    pendientes.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                          {new Date(p.createdAt).toLocaleString('es-AR')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{p.tipo}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="font-medium">{p.titulo}</div>
                          {p.descripcion ? <div className="text-gray-500 text-xs mt-1">{p.descripcion}</div> : null}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{p.contexto || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {p.entidadTipo ? (
                            <div>
                              <div className="text-gray-800">{p.entidadTipo}</div>
                              <div className="text-xs text-gray-500 break-all">{p.entidadId || ''}</div>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {estado === 'ABIERTO' ? (
                            <div className="flex justify-end gap-2">
                              {p.tipo === 'MAPEAR_ITEM_FACTURA' || p.tipo === 'ALIAS_PRESENTACION_PROVEEDOR' ? (
                                <Button tipo="enviar" onClick={() => abrirModalAplicar(p)}>
                                  Asignar Producto
                                </Button>
                              ) : (
                                <span className="text-xs text-gray-400">Sin acción disponible</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">{p.resueltoAt ? new Date(p.resueltoAt).toLocaleString('es-AR') : 'OK'}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </FormContainer>

        {modalAplicar.open && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onMouseDown={(e) => {
            if (e.target === e.currentTarget) cerrarModalAplicar();
          }}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Aplicar pendiente</h2>
                  <p className="text-sm text-gray-600">
                    {modalAplicar?.pendiente?.tipo === 'ALIAS_PRESENTACION_PROVEEDOR'
                      ? 'Vinculá el alias del proveedor a tu producto/presentación'
                      : 'Se creará el detalle en el documento y se ajustará stock + historial de precio'
                    }
                  </p>
                </div>
                <button onClick={cerrarModalAplicar} className="text-gray-400 hover:text-gray-600" disabled={aplicando}>
                  <Icon icono="times" className="text-lg" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Info del pendiente con datos originales de la factura */}
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                  <div className="text-amber-800 font-semibold text-base mb-2">Texto original en factura:</div>
                  <div className="text-amber-900 text-lg font-bold bg-white rounded px-3 py-2 border border-amber-200">
                    {modalAplicar?.pendiente?.payload?.descripcionProveedor
                      || modalAplicar?.pendiente?.payload?.nombreEnProveedor
                      || modalAplicar?.pendiente?.payload?.sku
                      || modalAplicar?.pendiente?.descripcion
                      || '(sin descripción)'}
                  </div>
                  {modalAplicar?.pendiente?.payload && (
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      {modalAplicar.pendiente.payload.cantidad ? (
                        <div className="bg-white rounded px-2 py-1 border border-amber-200">
                          <span className="text-gray-500">Cantidad:</span>{' '}
                          <span className="font-medium text-gray-800">{modalAplicar.pendiente.payload.cantidad}</span>
                        </div>
                      ) : null}
                      {modalAplicar.pendiente.payload.precioUnitario ? (
                        <div className="bg-white rounded px-2 py-1 border border-amber-200">
                          <span className="text-gray-500">Precio:</span>{' '}
                          <span className="font-medium text-gray-800">${modalAplicar.pendiente.payload.precioUnitario}</span>
                        </div>
                      ) : null}
                      {modalAplicar.pendiente.payload.numeroDocumento ? (
                        <div className="bg-white rounded px-2 py-1 border border-amber-200">
                          <span className="text-gray-500">Doc:</span>{' '}
                          <span className="font-medium text-gray-800">#{modalAplicar.pendiente.payload.numeroDocumento}</span>
                        </div>
                      ) : null}
                      {modalAplicar.pendiente.payload.sku ? (
                        <div className="bg-white rounded px-2 py-1 border border-amber-200">
                          <span className="text-gray-500">SKU:</span>{' '}
                          <span className="font-medium text-gray-800">{modalAplicar.pendiente.payload.sku}</span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SelectOnClientByProps
                    valueField="id"
                    textField="nombre"
                    label="Producto"
                    placeholder="Buscar producto"
                    name="idProducto"
                    value={aplicarProductoId}
                    onChange={({ value, option }) => {
                      setAplicarProductoId(value);
                      const pres = Array.isArray(option?.presentaciones) ? option.presentaciones : [];
                      const base = pres.find((x) => x?.esUnidadBase) || pres[0];
                      setAplicarPresentacionId(base?.id || '');
                    }}
                    {...productosOptions}
                    save
                  />

                  <SelectOnClientByProps
                    valueField="id"
                    textField="nombre"
                    label="Presentación"
                    placeholder="(opcional)"
                    name="presentacionId"
                    value={aplicarPresentacionId}
                    onChange={({ value }) => setAplicarPresentacionId(value)}
                    options={presentacionesProducto}
                    save
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-2">
                <Button tipo="neutro" onClick={cerrarModalAplicar} disabled={aplicando}>Cancelar</Button>
                <Button tipo="enviar" onClick={aplicar} disabled={aplicando || !aplicarProductoId}>
                  {aplicando ? 'Aplicando...' : 'Aplicar'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
