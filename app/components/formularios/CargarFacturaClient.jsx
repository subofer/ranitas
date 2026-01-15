"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from 'sweetalert2';
import Button from "../formComponents/Button";
import Input from "../formComponents/Input";
import FilterSelect from "../formComponents/FilterSelect";
import SelectOnClientByProps from "../proveedores/SelectOnClientByProps";
import { FormCard } from "../formComponents/FormCard";
import { fechaHoy, textos } from "@/lib/manipularTextos";
import Icon from "../formComponents/Icon";
import ImagenProducto from "../productos/ImagenProducto";
import { showImagenProducto } from "../productos/showImagenProducto";
import { guardarFacturaCompra } from "@/prisma/serverActions/documentos";
import FormTitle from "../formComponents/Title";
import Switch from "../formComponents/Switch";
import { getAliasesProveedor, upsertAliasPresentacionProveedor } from "@/prisma/serverActions/aliasesProveedor";
import { getTipoDocumentoOptions, getEstadoDocumentoOptions } from "@/prisma/consultas/opcionesDocumento";
import { useErrorNotification } from "@/hooks/useErrorNotification";

const CargaFacturaForm = ({ proveedoresProps, productosProps, className }) => {
  const router = useRouter();
  const { showError, showSuccess } = useErrorNotification();
  const [guardando, setGuardando] = useState(false);
  const detallesRefs = useRef([]);
  const filasRefs = useRef([]);
  const blankForm = {
    idProveedor: '',
    numeroDocumento: '',
    fecha: fechaHoy(),
    tieneImpuestos: false,
    tipoDocumento: 'FACTURA_A',
    estado: 'IMPAGA',
    detalles: [{ aliasId: '', aliasText: '', idProducto: '', presentacionId: '', descripcionPendiente: '', cantidad: 1, precioUnitario: 0, descuento: 0 }]
  };
  const [formData, setFormData] = useState(blankForm);

  const [aliasesProps, setAliasesProps] = useState({ options: [] });
  const [cargandoAliases, setCargandoAliases] = useState(false);

  const [tipoDocumentoOptions, setTipoDocumentoOptions] = useState([]);
  const [estadoDocumentoOptions, setEstadoDocumentoOptions] = useState([]);
  const [cargandoOpciones, setCargandoOpciones] = useState(true);

  const [modalMapeo, setModalMapeo] = useState({ open: false, index: null, alias: null });
  const [mapeando, setMapeando] = useState(false);
  const [mapProductoId, setMapProductoId] = useState('');
  const [mapPresentacionId, setMapPresentacionId] = useState('');

  const handleReset = () => {
    setFormData(blankForm)
  }
  const cargarAliases = useCallback(async (proveedorId) => {
    if (!proveedorId) {
      setAliasesProps({ options: [] });
      return;
    }

    setCargandoAliases(true);
    try {
      const res = await getAliasesProveedor({ proveedorId });
      const aliases = Array.isArray(res?.aliases) ? res.aliases : [];
      const options = aliases.map((a) => ({
        ...a,
        display: String(a?.nombreEnProveedor || a?.sku || '').trim(),
      }));
      setAliasesProps({ options });
    } catch (e) {
      console.error(e);
      setAliasesProps({ options: [] });
      showError('No se pudieron cargar los aliases del proveedor');
    } finally {
      setCargandoAliases(false);
    }
  }, [showError]);

  useEffect(() => {
    cargarAliases(formData.idProveedor);
  }, [formData.idProveedor, cargarAliases]);

  useEffect(() => {
    const cargarOpcionesDocumento = async () => {
      try {
        setCargandoOpciones(true);
        const [tipos, estados] = await Promise.all([
          getTipoDocumentoOptions(),
          getEstadoDocumentoOptions()
        ]);
        setTipoDocumentoOptions(tipos);
        setEstadoDocumentoOptions(estados);
      } catch (error) {
        console.error('Error cargando opciones de documento:', error);
        showError('Error cargando opciones de documento');
      } finally {
        setCargandoOpciones(false);
      }
    };

    cargarOpcionesDocumento();
  }, [showError]);




  const handleInputChange = useCallback(({name, value}) => {
    setFormData((prev) => {
      if (name === 'idProveedor') {
        return {
          ...prev,
          idProveedor: value,
          detalles: [...blankForm.detalles],
        };
      }
      return { ...prev, [name]: value };
    });
  }, [blankForm.detalles]);

  const handleDetalleChange = useCallback((index, {name, value}) => {
    setFormData((prev) => {
      const detallesPrev = Array.isArray(prev.detalles) ? prev.detalles : [];
      const detallesNext = detallesPrev.map((d, i) => (i === index ? { ...d, [name]: value } : d));
      return { ...prev, detalles: detallesNext };
    });
  }, []);

  const setItem = (item, index) => {
    setFormData((prev) => {
      const detallesPrev = Array.isArray(prev.detalles) ? prev.detalles : [];
      const detallesNext = detallesPrev.map((d, i) => (i === index ? { ...d, item } : d));
      return { ...prev, detalles: detallesNext };
    });
  }

  const crearAliasDesdeFila = useCallback(async (index, texto) => {
    const proveedorId = formData.idProveedor;
    const txt = String(texto || '').trim();
    if (!proveedorId) {
      showError('Primero seleccioná un proveedor');
      return;
    }
    if (!txt) return;

    try {
      const res = await upsertAliasPresentacionProveedor({
        proveedorId,
        sku: txt,
        nombreEnProveedor: txt,
      });

      if (!res?.success) {
        showError('No se pudo crear el alias');
        return;
      }

      const creado = res?.alias;
      await cargarAliases(proveedorId);

      if (creado?.id) {
        handleDetalleChange(index, { name: 'aliasId', value: creado.id });
        handleDetalleChange(index, { name: 'aliasText', value: String(creado?.nombreEnProveedor || creado?.sku || txt) });
        handleDetalleChange(index, { name: 'descripcionPendiente', value: String(creado?.nombreEnProveedor || creado?.sku || txt) });
      }

      showSuccess('Alias creado (queda pendiente de mapeo si falta)', 1800);
    } catch (e) {
      console.error(e);
      showError('Error creando alias: ' + (e?.message || 'Error'));
    }
  }, [formData.idProveedor, cargarAliases, handleDetalleChange, showError, showSuccess]);

  const abrirModalMapear = (index, alias) => {
    if (!alias?.id) return;
    setMapProductoId(alias?.productoId || '');
    setMapPresentacionId(alias?.presentacionId || '');
    setModalMapeo({ open: true, index, alias });
  };

  const cerrarModalMapear = () => {
    if (mapeando) return;
    setModalMapeo({ open: false, index: null, alias: null });
    setMapProductoId('');
    setMapPresentacionId('');
  };

  const productosOptions = useMemo(() => (Array.isArray(productosProps?.options) ? productosProps.options : []), [productosProps?.options]);
  const productoMapSeleccionado = productosOptions.find((p) => p?.id === mapProductoId) || null;
  const presentacionesMap = (productoMapSeleccionado?.presentaciones || []).slice().sort((a, b) => (a?.nombre || '').localeCompare(b?.nombre || '', 'es'));

  const aplicarMapeoAlias = async () => {
    const proveedorId = formData.idProveedor;
    const { alias, index } = modalMapeo || {};
    if (!proveedorId) return;
    if (!alias?.sku) {
      showError('Alias inválido');
      return;
    }
    if (!mapProductoId) {
      showError('Seleccioná un producto');
      return;
    }

    setMapeando(true);
    try {
      const res = await upsertAliasPresentacionProveedor({
        proveedorId,
        sku: alias.sku,
        nombreEnProveedor: alias.nombreEnProveedor || alias.sku,
        productoId: mapProductoId,
        presentacionId: mapPresentacionId || null,
      });

      if (res?.success) {
        await cargarAliases(proveedorId);

        if (Number.isInteger(index)) {
          handleDetalleChange(index, { name: 'idProducto', value: mapProductoId });
          handleDetalleChange(index, { name: 'presentacionId', value: mapPresentacionId || '' });
          setItem(productoMapSeleccionado, index);
          handleDetalleChange(index, { name: 'descripcionPendiente', value: '' });
        }

        showSuccess('Alias mapeado', 1500);
        cerrarModalMapear();
      } else {
        showError('No se pudo mapear el alias');
      }
    } catch (e) {
      console.error(e);
      showError('Error mapeando alias: ' + (e?.message || 'Error'));
    } finally {
      setMapeando(false);
    }
  };

  const normalizarNumero = useCallback((value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  },[]);

  const getLineaSubtotal = useCallback((detalle) => {
    const cantidad = Math.max(0, normalizarNumero(detalle?.cantidad, 0));
    const precioUnitario = Math.max(0, normalizarNumero(detalle?.precioUnitario, 0));
    const descuento = Math.max(0, normalizarNumero(detalle?.descuento, 0));
    return Math.max(0, (precioUnitario * cantidad) - descuento);
  }, [normalizarNumero]);

  const subtotalGeneral = useMemo(() => (
    (formData.detalles || []).reduce((suma, d) => suma + getLineaSubtotal(d), 0)
  ), [formData.detalles, getLineaSubtotal]);

  const totalGeneral = useMemo(() => {
    const factor = formData.tieneImpuestos ? 1.21 : 1;
    return subtotalGeneral * factor;
  }, [formData.tieneImpuestos, subtotalGeneral]);

  const abrirFichaProducto = ({ detalle }) => {
    const productoId = detalle?.idProducto;
    if (!productoId) return;
    const presentacionId = detalle?.presentacionId || '';
    const qs = presentacionId ? `&presentacion=${encodeURIComponent(presentacionId)}` : '';
    router.push(`/cargarProductos?edit=${encodeURIComponent(productoId)}${qs}`);
  };

  const focusFila = (index) => {
    const el = filasRefs.current[index];
    if (el && typeof el.focus === 'function') el.focus();
  };


  const handleAgregarDetalle = useCallback(() => {
    setFormData(({detalles, ...prev}) => ({
      ...prev,
      detalles: [...detalles, { ...blankForm.detalles[0] }]
    }));
  }, [blankForm.detalles]);

  const handleQuitarDetallesVacios = useCallback(() =>
    setFormData(({detalles, ...prev}) => ({
      ...prev,
      detalles: detalles
        .map((detalle, index) => (index === 0 || detalle.productoProvId !== "") ? detalle : null)
        .filter(Boolean)
  })), []);

  const handleQuitarDetalleIndex = useCallback((indexToRemove) => {
    setFormData(({ detalles, ...prev }) => ({
      ...prev,
      detalles: detalles.length > 1 ? detalles.filter((_, index) => index !== indexToRemove) : blankForm.detalles,
    }));
  }, [blankForm.detalles]);

  const handleDetalleKeyDown = (index, e) => {
    if (e.key === 'Tab' && !e.shiftKey && index === formData.detalles.length - 1) {
      e.preventDefault();
      handleAgregarDetalle();
    }
  };

  const handleSubmit = useCallback(async () => {
    setGuardando(true)
    const detalles = (formData.detalles || []).map((d) => {
      const out = { ...d };
      if (!out.idProducto && out.aliasText) {
        out.descripcionPendiente = String(out.aliasText).trim();
      }
      return out;
    });
    const productosPendientes = detalles.filter(d => !d.idProducto && d.descripcionPendiente);
    await guardarFacturaCompra({ ...formData, detalles })
    setGuardando(false)
    if (productosPendientes.length > 0) {
      const lista = productosPendientes.map(p => `- ${p.descripcionPendiente}`).join('\n');
      Swal.fire({
        title: 'Productos a mapear',
        text: `Los siguientes productos quedan en pendientes para mapear:\n${lista}`,
        icon: 'info',
        confirmButtonText: 'Entendido'
      });
    }
  },[formData]);

  const Titulo = () => (
      <FormTitle textClass={"text-3xl font-bold text-slate-500"} className="col-span-full">
      <div className="flex items-center w-full">
        <div className="flex-initial">
        <Icon icono={"receipt"}/>

        </div>
        <div className="flex-grow text-center">
          Cargar Factura
        </div>
        <div className="flex-initial invisible">
          <Icon regular icono={"address-card"} />
        </div>
      </div>
    </FormTitle>

  )
  const handleFormKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    // Evitar submit por Enter dentro de inputs, pero permitir Enter en la fila (navegación)
    const isInput = e.target?.closest?.('input, select, textarea');
    if (isInput) e.preventDefault();
  };

  return (
    <FormCard
      className={className}
      handleReset={handleReset}
      loading={guardando}
      action={handleSubmit}
      title={<Titulo/>}
      onKeyDown={handleFormKeyDown}
    >
    <div className={"grid grid-cols-12 gap-2 rounded-none items-end"}>
      <div className="col-span-4">
        <SelectOnClientByProps
          valueField="id"
          textField="nombre"
          label="Proveedor"
          placeholder="Ingrese Proveedor"
          name="idProveedor"
          onChange={handleInputChange}
          {...proveedoresProps}
        />
      </div>
      <div className="col-span-2">
        <Input
          label="Número de Factura"
          name="numeroDocumento"
          value={formData.numeroDocumento}
          onChange={handleInputChange}
          />
      </div>
      <div className="col-span-2">
        <Input
          label="Fecha"
          name="fecha"
          type="date"
          value={formData.fecha}
          onChange={handleInputChange}
        />
      </div>

      <div className="col-span-2">
        <SelectOnClientByProps
          valueField="codigo"
          textField="nombre"
          label="Tipo Documento"
          placeholder="Seleccionar tipo"
          name="tipoDocumento"
          value={formData.tipoDocumento}
          onChange={({ value }) => handleInputChange({ name: 'tipoDocumento', value })}
          options={tipoDocumentoOptions}
          loading={cargandoOpciones}
        />
      </div>
      <div className="col-span-1">
        <Switch
          label="Sin IVA"
          seconLabel="Con IVA"
          name="tieneImpuestos"
          value={formData.tieneImpuestos}
          onChange={handleInputChange}
        />
      </div>
      <div className="col-span-1">
        <SelectOnClientByProps
          valueField="codigo"
          textField="nombre"
          label="Estado"
          placeholder="Seleccionar estado"
          name="estado"
          value={formData.estado}
          onChange={({ value }) => handleInputChange({ name: 'estado', value })}
          options={estadoDocumentoOptions}
          loading={cargandoOpciones}
        />
      </div>
      <div className="col-span-full"></div>

      <div className="grid grid-cols-12 col-span-12">

        <label className="col-span-12 text-2xl text-gray-700">Productos:</label>

        <div className="col-span-12 p-4 bg-gray-50 border rounded-lg">
          {formData.detalles.map((detalle, index) => (
            <div
              key={index}
              ref={(el) => { filasRefs.current[index] = el; }}
              tabIndex={0}
              className="flex gap-2 mb-2 justify-between outline-none focus:ring-2 focus:ring-blue-400 rounded"
              onClick={(e) => {
                if (e.target.closest('button, input, select, textarea, a')) return;
                focusFila(index);
              }}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  focusFila(Math.min(formData.detalles.length - 1, index + 1));
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  focusFila(Math.max(0, index - 1));
                }
                if (e.key === 'Enter') {
                  e.preventDefault();
                  abrirFichaProducto({ detalle });
                }
              }}
              title="Enter: abrir ficha del producto"
            >
              <div className="flex flex-row gap-1 w-8 justify-around text-slate-600">
                <Icon tabIndex={-1} type="button" icono={"trash"} onClick={() => {handleQuitarDetalleIndex(index)}}/>
              </div>
              <div className="w-full">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <SelectOnClientByProps
                      valueField="id"
                      textField="display"
                      label="Alias del proveedor"
                      placeholder={formData.idProveedor ? (cargandoAliases ? "Cargando aliases..." : "Escribí como viene en la factura") : "Elegí proveedor"}
                      name="aliasId"
                      onChange={({ value, option }) => {
                        handleDetalleChange(index, { name: 'aliasId', value });
                        const texto = String(option?.display || option?.nombreEnProveedor || option?.sku || '').trim();
                        handleDetalleChange(index, { name: 'aliasText', value: texto });

                        if (option?.productoId) {
                          handleDetalleChange(index, { name: 'idProducto', value: option.productoId });
                          setItem(option?.producto || null, index);

                          if (option?.presentacionId) {
                            handleDetalleChange(index, { name: 'presentacionId', value: option.presentacionId });
                          } else {
                            const pres = Array.isArray(option?.producto?.presentaciones) ? option.producto.presentaciones : [];
                            const base = pres.find((p) => p?.esUnidadBase) || pres[0];
                            if (base?.id) handleDetalleChange(index, { name: 'presentacionId', value: base.id });
                          }

                          const precioActual = normalizarNumero(detalle?.precioUnitario, 0);
                          const precioSugerido = normalizarNumero(option?.producto?.precios?.[0]?.precio, 0);
                          if (precioActual <= 0 && precioSugerido > 0) {
                            handleDetalleChange(index, { name: 'precioUnitario', value: precioSugerido });
                          }

                          handleDetalleChange(index, { name: 'descripcionPendiente', value: '' });
                        } else {
                          handleDetalleChange(index, { name: 'idProducto', value: '' });
                          handleDetalleChange(index, { name: 'presentacionId', value: '' });
                          setItem(null, index);
                          handleDetalleChange(index, { name: 'descripcionPendiente', value: texto });
                        }
                      }}
                      value={detalle.aliasId}
                      save={true}
                      ref={(el) => detallesRefs.current[index] = el}
                      options={aliasesProps.options}
                      allowCreate={Boolean(formData.idProveedor)}
                      onCreate={(txt) => crearAliasDesdeFila(index, txt)}
                    />
                  </div>

                  {(() => {
                    const alias = (aliasesProps.options || []).find((a) => a?.id === detalle.aliasId) || null;
                    const necesitaMapeo = alias && !alias?.productoId && !alias?.presentacionId;
                    if (!necesitaMapeo) return null;
                    return (
                    <Button
                      type="button"
                      tipo="neutro"
                      onClick={() => {
                        if (!alias) {
                          showError('Alias no encontrado en la lista');
                          return;
                        }
                        abrirModalMapear(index, alias);
                      }}
                      disabled={!formData.idProveedor || mapeando}
                      title="Asignar a un producto/presentación"
                    >
                      <Icon icono="plus" className="mr-2" />
                      Mapear
                    </Button>
                    );
                  })()}
                </div>

                {!detalle?.idProducto && (detalle?.aliasText || detalle?.descripcionPendiente) ? (
                  <div className="mt-2">
                    <Input
                      name="descripcionPendiente"
                      label="Detalle proveedor (pendiente de mapeo)"
                      value={detalle.descripcionPendiente || detalle.aliasText || ''}
                      onChange={(data) => handleDetalleChange(index, data)}
                      placeholder="Ej: CAJA 6x1L / código proveedor / descripción"
                    />
                  </div>
                ) : null}
              </div>

              <div className="w-[150px]">
                <Input
                  name="cantidad"
                  label="cantidad"
                  type="number"
                  value={detalle.cantidad}
                  onChange={(data) => handleDetalleChange(index, data)}
                  placeholder="Cantidad"
                  />
              </div>
              <div className="w-[150px]">
                <Input
                  name="precioUnitario"
                  label="Precio"
                  type="number"
                  value={detalle.precioUnitario}
                  onChange={(data) => handleDetalleChange(index, data)}
                  placeholder="Precio Unitario"
                  onKeyDown={(data) => handleDetalleKeyDown(index, data) }
                />
              </div>
              <div className="w-[140px]">
                <Input
                  name="descuento"
                  label="Descuento"
                  type="number"
                  value={detalle.descuento ?? 0}
                  onChange={(data) => handleDetalleChange(index, data)}
                  placeholder="0"
                />
              </div>
              <div className="w-[150px]">
                <Input
                  name="precioTotal"
                  label="SubTotal"
                  type="text"
                  disabled
                  value={textos.monedaDecimales(getLineaSubtotal(detalle))}
                  onChange={(data) => handleDetalleChange(index, data)}
                  placeholder="Precio Unitario"
                />
              </div>
              <ImagenProducto
                onClick={() => showImagenProducto(formData?.detalles[index]?.item)}
                size={49} className={"p-0 m-0 w-full"} item={formData?.detalles[index]?.item || {}}
              />
              <div  className="flex flex-col w-[40px] text-slate-600">
                {index == formData.detalles.length -1 &&
                  <div onClick={handleAgregarDetalle} className="flex flex-col gap-1">
                      <Icon tabIndex={-1} type="button" icono={"plus"}/>
                      <Icon regular tabIndex={-1} type="button" icono={"file-lines"} />
                  </div>
                }
              </div>
            </div>
          ))}
          {
            false &&
            <div className="flex flex-row gap-2">
              <Button type="button" onClick={handleQuitarDetallesVacios}>Quitar Vacios</Button>
            </div>
          }
        </div>
        <div className="col-span-full m-2"></div>
        <div className="col-start-8 col-span-2 mr-2">
          <Input
            className="cursor-text"
            name="Subtotal"
            label="Subtotal"
            type="text"
            disabled
            value={textos.monedaDecimales(subtotalGeneral)}
            onChange={(e) => handleDetalleChange(index, e)}
            placeholder="Precio Unitario"
            onKeyDown={(e) => handleDetalleKeyDown(index, e)}
          />

        </div>
        <div className="col-start-10 col-span-2 ml-2">
          <Input
            className="cursor-text"
            name="total"
            label="Total"
            type="text"
            disabled
            value={textos.monedaDecimales(totalGeneral)}
            onChange={(e) => handleDetalleChange(index, e)}
            placeholder="Precio Unitario"
            onKeyDown={(e) => handleDetalleKeyDown(index, e)}
          />
        </div>
      </div>
      </div>

      {modalMapeo.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onMouseDown={(e) => {
          if (e.target === e.currentTarget) cerrarModalMapear();
        }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Mapear alias</h2>
                <p className="text-sm text-gray-600">Unís el alias del proveedor con tu producto/presentación</p>
              </div>
              <button onClick={cerrarModalMapear} className="text-gray-400 hover:text-gray-600" disabled={mapeando}>
                <Icon icono="times" className="text-lg" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
                <div className="text-gray-800 font-medium">{modalMapeo?.alias?.nombreEnProveedor || modalMapeo?.alias?.sku}</div>
                <div className="text-gray-600 mt-1">SKU: {modalMapeo?.alias?.sku || '-'}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectOnClientByProps
                  valueField="id"
                  textField="nombre"
                  label="Producto"
                  placeholder="Buscar producto"
                  name="mapProductoId"
                  value={mapProductoId}
                  onChange={({ value, option }) => {
                    setMapProductoId(value);
                    const pres = Array.isArray(option?.presentaciones) ? option.presentaciones : [];
                    const base = pres.find((x) => x?.esUnidadBase) || pres[0];
                    setMapPresentacionId(base?.id || '');
                  }}
                  options={productosOptions}
                  save
                />

                <SelectOnClientByProps
                  valueField="id"
                  textField="nombre"
                  label="Presentación"
                  placeholder="(opcional)"
                  name="mapPresentacionId"
                  value={mapPresentacionId}
                  onChange={({ value }) => setMapPresentacionId(value)}
                  options={presentacionesMap}
                  save
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-2">
              <Button tipo="neutro" type="button" onClick={cerrarModalMapear} disabled={mapeando}>
                Cancelar
              </Button>
              <Button tipo="enviar" type="button" onClick={aplicarMapeoAlias} disabled={mapeando}>
                {mapeando ? 'Guardando...' : 'Guardar mapeo'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </FormCard>
  );
};

export default CargaFacturaForm;
