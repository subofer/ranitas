"use client"
import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "../formComponents/Button";
import Input from "../formComponents/Input";
import SelectOnClientByProps from "../proveedores/SelectOnClientByProps";
import { FormCard } from "../formComponents/FormCard";
import { fechaHoy, textos } from "@/lib/manipularTextos";
import Icon from "../formComponents/Icon";
import ImagenProducto from "../productos/ImagenProducto";
import { guardarFacturaConStock } from "@/prisma/serverActions/facturas";
import { showImagenProducto } from "../productos/showImagenProducto";
import { guardarFacturaCompra } from "@/prisma/serverActions/documentos";
import FormTitle from "../formComponents/Title";
import Switch from "../formComponents/Switch";

const CargaFacturaForm = ({ proveedoresProps, productosProps, className }) => {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [editarCantidad, setEditarCantidad] = useState(true);
  const [editarPrecio, setEditarPrecio] = useState(true);
  const [editarDescuento, setEditarDescuento] = useState(true);
  const detallesRefs = useRef([]);
  const filasRefs = useRef([]);
  const blankForm = {
    idProveedor: '',
    numeroDocumento: '',
    fecha: fechaHoy(),
    tieneImpuestos: false,
    detalles: [{ idProducto: '', presentacionId: '', cantidad: 1, precioUnitario: 0, descuento: 0 }]
  };
  const [formData, setFormData] = useState(blankForm);

  const handleReset = () => {
    setFormData(blankForm)
  }
  const optionProductosFiltradoPorProveedor = useMemo(() => {
    const proveedorId = formData.idProveedor;
    const lista = Array.isArray(productosProps?.options) ? productosProps.options : [];
    if (!proveedorId) return { options: [] };

    const options = lista
      .filter(({ proveedores }) => proveedores?.some(({ proveedorId: pid }) => pid === proveedorId))
      .map((producto) => {
        const rel = producto?.proveedores?.find(({ proveedorId: pid }) => pid === proveedorId);
        const codigoProv = rel?.codigo ? String(rel.codigo).trim() : '';
        return {
          ...producto,
          nombre: codigoProv ? `${codigoProv} -/- ${producto.nombre}` : producto.nombre,
        };
      });

    return { options };
  }, [productosProps, formData.idProveedor]);




  const handleInputChange = useCallback(({name, value}) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

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

  const normalizarNumero = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const getLineaSubtotal = (detalle) => {
    const cantidad = Math.max(0, normalizarNumero(detalle?.cantidad, 0));
    const precioUnitario = Math.max(0, normalizarNumero(detalle?.precioUnitario, 0));
    const descuento = Math.max(0, normalizarNumero(detalle?.descuento, 0));
    return Math.max(0, (precioUnitario * cantidad) - descuento);
  };

  const subtotalGeneral = useMemo(() => (
    (formData.detalles || []).reduce((suma, d) => suma + getLineaSubtotal(d), 0)
  ), [formData.detalles]);

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
    await guardarFacturaCompra(formData)
    setGuardando(false)
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
    <div className={"grid grid-cols-12 gap-2 rounded-none "}>
      <div className="col-span-5">
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

      <div className="col-span-2 min-w-[195px]">
        <Switch
          label="Remito"
          seconLabel="Factura"
          name="tieneImpuestos"
          value={formData.tieneImpuestos}
          onChange={handleInputChange}
        />
      </div>
      <div className="col-span-full"></div>

      <div className="col-span-12 flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-lg p-3">
        <div className="text-sm font-semibold text-slate-700">Edición en tabla:</div>
        <label className="flex items-center gap-2 text-sm text-slate-700 select-none">
          <input
            type="checkbox"
            checked={editarCantidad}
            onChange={(e) => setEditarCantidad(e.target.checked)}
          />
          Cantidad/stock
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700 select-none">
          <input
            type="checkbox"
            checked={editarPrecio}
            onChange={(e) => setEditarPrecio(e.target.checked)}
          />
          Precio
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700 select-none">
          <input
            type="checkbox"
            checked={editarDescuento}
            onChange={(e) => setEditarDescuento(e.target.checked)}
          />
          Descuento
        </label>
      </div>

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
                <SelectOnClientByProps
                  valueField="id"
                  textField="nombre"
                  label="Producto"
                  placeholder="Ingrese producto"
                  name="idProducto"
                  onChange={({name, value, option}) => {
                    handleDetalleChange(index, { name, value })
                    setItem(option, index)

                    // Default presentación (preferir unidad base)
                    const pres = Array.isArray(option?.presentaciones) ? option.presentaciones : [];
                    const base = pres.find((p) => p?.esUnidadBase) || pres[0];
                    if (base?.id) handleDetalleChange(index, { name: 'presentacionId', value: base.id });

                    // Autocompletar precio si no hay uno cargado
                    const precioActual = normalizarNumero(detalle?.precioUnitario, 0);
                    const precioSugerido = normalizarNumero(option?.precios?.[0]?.precio, 0);
                    if (precioActual <= 0 && precioSugerido > 0) {
                      handleDetalleChange(index, { name: 'precioUnitario', value: precioSugerido });
                    }
                  }}
                  value={detalle.idProducto}
                  save={true}
                  ref={(el) => detallesRefs.current[index] = el}
                  {...optionProductosFiltradoPorProveedor}
                  />
              </div>

              <div className="w-[220px]">
                <SelectOnClientByProps
                  valueField="id"
                  textField="nombre"
                  label="Presentación"
                  placeholder="Presentación"
                  name="presentacionId"
                  onChange={(data) => handleDetalleChange(index, data)}
                  value={detalle.presentacionId}
                  options={(detalle?.item?.presentaciones || []).slice().sort((a, b) => (a?.nombre || '').localeCompare(b?.nombre || '', 'es'))}
                  save={true}
                />
              </div>

              <div className="w-[150px]">
                <Input
                  name="cantidad"
                  label="cantidad"
                  type="number"
                  value={detalle.cantidad}
                  onChange={(data) => handleDetalleChange(index, data)}
                  placeholder="Cantidad"
                  disabled={!editarCantidad}
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
                  disabled={!editarPrecio}
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
                  disabled={!editarDescuento}
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
    </FormCard>
  );
};

export default CargaFacturaForm;
