"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { obtenerProductosPorProveedor } from "@/prisma/serverActions/proveedores";

const CargaFacturaForm = ({ proveedoresProps, productosProps, className }) => {
  const [guardando, setGuardando] = useState(false);
  const detallesRefs = useRef([]);
  const blankForm = {
    idProveedor: '',
    numeroDocumento: '',
    fecha: fechaHoy(),
    tieneImpuestos: false,
    detalles: [{ idProducto: '', cantidad: 1, precioUnitario: 0}]
  };
  const [formData, setFormData] = useState(blankForm);

  const handleReset = () => {
    setFormData(blankForm)
  }

  const [optionProductosFiltradoPorProveedor, setProductosProveedor] = useState({options:[]});

  const optionProductosFiltradoPorProveedor2 = useMemo(() => ({
    options: productosProps.options.filter(({ proveedores }) =>
      formData.idProveedor && proveedores.some(({ proveedorId }) => proveedorId === formData.idProveedor)
    )
  }), [productosProps, formData.idProveedor]);
  
  useEffect(() => {
    const fetchProductos = async () => {
      if (formData.idProveedor) {
        const productos = await obtenerProductosPorProveedor(formData.idProveedor);
        console.log(productos)
        const newList = productos.map(({producto, ...resto}) => (
          {
            ...producto,
            ...resto,
            nombre: `${resto.codigo} -/- ${producto.nombre}`
          }
        ))
        setProductosProveedor({options:newList});
        console.log(newList)
        console.log(optionProductosFiltradoPorProveedor2)
      }
    };
  
    fetchProductos();
  }, [formData.idProveedor, optionProductosFiltradoPorProveedor2]);




  const handleInputChange = useCallback(({name, value}) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleDetalleChange = useCallback((index, {name, value}) => {
    const updated = formData.detalles
    updated[index][name] = value
    setFormData((prev) => ({ ...prev, detalles: updated }));
  }, [formData.detalles]);

  const setItem = (item, index) => {
    const updated = formData.detalles
    updated[index].item = item
    setFormData((prev) => ({ ...prev, detalles: updated }));
  }


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
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  return (
    <FormCard
      className={`flex flex-col w-full bg-slate-300 p-2 ${className}`}
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

      <div className="grid grid-cols-12 col-span-12">

        <label className="col-span-12 text-2xl text-gray-700">Productos:</label>

        <div className="col-span-12 p-3 bg-slate-400">
          {formData.detalles.map((detalle, index) => (
            <div key={index} className="flex gap-2 mb-2 justify-between">
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
                  }}
                  value={detalle.idProducto}
                  save={true}
                  ref={(el) => detallesRefs.current[index] = el}
                  {...optionProductosFiltradoPorProveedor}
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
              <div className="w-[150px]">
                <Input
                  name="precioTotal"
                  label="SubTotal"
                  type="text"
                  disabled
                  value={textos.monedaDecimales(detalle.precioUnitario * detalle.cantidad)}
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
            value= {
              formData.tieneImpuestos ?
              textos.monedaDecimales(formData.detalles.reduce((suma, {precioUnitario, cantidad}) => suma + (precioUnitario * cantidad), 0))
              : "Remito"
            }
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
            value={textos.monedaDecimales((formData.tieneImpuestos ? 1.21 : 1) * formData.detalles.reduce((suma, {precioUnitario, cantidad}) => suma + (precioUnitario * cantidad), 0))}
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
