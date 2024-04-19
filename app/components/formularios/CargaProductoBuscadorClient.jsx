"use client"
import { useState, useEffect, useCallback, useMemo } from 'react';
import { guardarProducto } from "@/prisma/serverActions/productos";

import Input from "../formComponents/Input";
import { FormCard } from "../formComponents/FormCard";
import { getProductoPorCodigoBarra } from "@/prisma/consultas/productos";
import useMyParams from '@/app/hooks/useMyParams';
import buscarPorCodigoDeBarras from '@/lib/buscarPorCodigoDeBarras';
import SelectorImagenes from '../formComponents/SelectorImagenes';

import QrCodeScanner from "@/app/components/camara/Scanner"
import { alertaLeerCodigoBarra } from '../alertas/alertaLeerCodigoBarra';
import SelectProveedorClient from '../proveedores/SelectProveedorClient';
import InputArrayListProveedores from '../proveedores/InputArrayListProveedores';
import SelectCategoriaClient from '../categorias/SelectCategoriaClient';
import { textos } from '@/lib/manipularTextos';

export const CargaProductoBuscadorClient = () => {
  const { searchParams, deleteParam } = useMyParams();
  const codigoBarraParam = searchParams.get('codigoBarra');

  const blankForm = useMemo(() => ({
    id:'',
    codigoBarra: '',
    nombre: '',
    descripcion: '',
    size: '',
    unidad: '',
    precioActual: '',
    idCategoria: '',
    imagen: '',
    stock: '',
    proveedores: [],
  }), []);

  const [formData, setFormData] = useState(blankForm);
  const [buscando, setBuscando] = useState(false);
  const [imagenes, setImagenes] = useState([]);
  const [local, setLocal] = useState(null);

  const handleBuscar = useCallback(async (codigoBarraIngresado) => {
    setBuscando(true);
    const productoLocal = await getProductoPorCodigoBarra(codigoBarraIngresado)

    if (!productoLocal.error) {
      setLocal(true)
      setFormData((prev) => ({...prev, ...productoLocal}));
      setImagenes([{imagen: {src:productoLocal.imagen, alt:"Imagen Guardada"}}])
    }else{
      const { imagenes, primerResultado: { prismaObject = {} } } = await buscarPorCodigoDeBarras(codigoBarraIngresado);
      setImagenes(imagenes)
      setFormData((prev) => ({ ...prev, ...prismaObject}));
    }

    setBuscando(false);
  },[]);

  const handleSave = async (e) => {
    await guardarProducto(formData)
    await handleBuscar(formData.codigoBarra)
  }

  const handleInputChange =({name, value}) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  const handleProveedoresSelected = ({ selected }) =>
    setFormData(({ proveedores, ...prev }) => {
      const updatedProveedores = [...proveedores, selected];
      const uniqueProveedores = [...new Map(updatedProveedores.map(item => [item.id, item])).values()];
      return { ...prev, proveedores: uniqueProveedores };
  })

  const deleteProveedorById = (id) => {
    setFormData(({proveedores, ...prev}) => {
    const newProveedores =  proveedores.filter(proveedor => proveedor.id !== id)
    return {...prev, proveedores: newProveedores}
    })
  }

  //esto funciona solo con la camara
  const onCapture = (code) => {
    alertaLeerCodigoBarra(code, () => {
      setFormData(prev => ({ ...prev, codigoBarra: code }))
      handleBuscar(code)
    })
  }

  const handleImageChange = useCallback((selectedImageUrl) => {
    if (selectedImageUrl) {
      setFormData(prev => ({ ...prev, imagen: selectedImageUrl }));
    }
  },[]);

  const handleCodigoBarraKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = e.target.value;
      handleBuscar(value);
    }
  }, [handleBuscar]);

  const handleReset = useCallback(() => {
    deleteParam("codigoBarra")
    setBuscando(false)
    setFormData(blankForm)
    setLocal(false)
    setImagenes([])
  },[blankForm, deleteParam])

  useEffect(() => {
    if (codigoBarraParam) {
     handleBuscar(codigoBarraParam)
    }
  }, [codigoBarraParam, handleBuscar]);

  useEffect(() => {
    console.log('forma data ->', formData)
  }, [formData]);

  return (
    <FormCard
      handleReset={handleReset}
      loading={buscando}
      action={handleSave}
      className={"flex pt-4 max-w-screen  bg-gray-200 md:p-4" }
      title={`${local ? "Editar" : "Cargar"} Producto`}
      busy={buscando}
    >
      <div className='flex flex-col-reverse lg:flex-row-reverse gap-2'>
        <div className='p-2 bg-gray-400  h-fit'>
          <SelectorImagenes
            className=''
            nombre={formData.nombre}
            imagenes={imagenes}
            proceder={handleImageChange}/>
        </div>
        <div className="
          grid
          grid-cols-1
          w-full
          gap-2
          lg:gap-3
          lg:grid-cols-12
          lg:mx-auto
          lg:h-fit
        ">

          <div className="col-span-full lg:col-span-4">
            <Input
              name="codigoBarra"
              label="Codigo De Barras"
              placeholder="Escanee un codigo de barras"
              onKeyDown={handleCodigoBarraKeyPress}
              onChange={handleInputChange}
              value={formData.codigoBarra}
              transform={textos.moneda}
              actionIcon={<QrCodeScanner onScan={onCapture} onError={(error) => console.error(error)}/>}
            />
          </div>
          <div className="col-span-full  lg:col-span-2">
            <Input
              name="size"
              label="Tamaño"
              placeholder="Tamaño, cantidad"
              onChange={handleInputChange}
              value={formData.size}
            />
          </div>
          <div className="col-span-full lg:col-span-2">
            <Input
              name="unidad"
              label="Unidades"
              placeholder="Litros, gramos, etc.."
              onChange={handleInputChange}
              value={formData.unidad}
            />
          </div>
          <div className="col-span-full lg:col-span-2">
            <Input
              name="stock"
              label="Stock"
              placeholder="cantidad"
              onChange={handleInputChange}
              value={formData.stock}
            />
          </div>
          <div className="col-span-full lg:col-span-2">
            <Input
              name="precioActual"
              label="Precio"
              placeholder="Ingrese el precio Actual"
              onChange={handleInputChange}
              value={formData.precioActual}
            />
          </div>
          <div className="col-span-full lg:col-span-4">
            <Input
              name="nombre"
              label="Nombre"
              placeholder="Marca y Nombre del producto"
              onChange={handleInputChange}
              value={formData.nombre}
            />
          </div>
          <div className="col-span-full lg:col-span-6">
            <Input
              name="descripcion"
              label="Descripcion"
              placeholder="Coloque una buena descripcion"
              onChange={handleInputChange}
              value={formData.descripcion}
            />
          </div>

          <div className="col-span-full lg:col-span-3">
            <SelectCategoriaClient
              name={"idCategoria"}
              onChange={handleInputChange}
              value={formData.idCategoria}
            />
          </div>
          <div className="col-span-full lg:col-span-7">

          </div>
          <div className="col-span-full lg:col-span-3">
            <SelectProveedorClient
              name={"$ACTION_IGNORE"}
              valueField="id"
              textField="nombre"
              label="Proveedor"
              placeholder="Elija un Proveedor"
              onChange={handleProveedoresSelected}
              value={formData.proveedores}
            />
          </div>
          <div className="col-span-full lg:col-span-7">
            <InputArrayListProveedores
              name="Provedores"
              label="Proveedores"
              placeholder="Agregue proveedores"
              dataList={formData.proveedores}
              dataFilterKey={"id"}
              onRemove={deleteProveedorById}
              tabIndex={-1}
            />
          </div>
        </div>

      </div>
    </FormCard>
  );
}

