"use client"
import { useState, useEffect, useCallback, useMemo } from 'react';
import { guardarProducto } from "@/prisma/serverActions/productos";

import Input from "../formComponents/Input";
import { FormCard } from "../formComponents/FormCard";
import { getProductoPorCodigoBarra } from "@/prisma/consultas/productos";
import useMyParams from '@/app/hooks/useMyParams';
import buscarPorCodigoDeBarras from '@/lib/buscarPorCodigoDeBarras';
import SelectorImagenes from '../formComponents/SelectorImagenes';
import FormTitle from '../formComponents/Title';
import QrCodeScanner from "@/app/components/camara/Scanner"
import { alertaLeerCodigoBarra } from '../alertas/alertaLeerCodigoBarra';
import SelectProveedorClient from '../proveedores/SelectProveedorClient';
import InputArrayListProveedores from '../proveedores/InputArrayListProveedores';
import SelectCategoriaClient from '../categorias/SelectCategoriaClient';
import { textos } from '@/lib/manipularTextos';
import { showImagenProducto } from '../productos/showImagenProducto';

export const CargaProductoBuscadorClient = () => {
  const [listadoProveedores, setListadoProveedores] = useState([])
  const [proveedorSelected, setProveedorSelected] = useState({})
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
  const [reDo, setReDo] = useState(true);
  const [local, setLocal] = useState(null);

  const handleSave = useCallback(() => {
    guardarProducto(formData)
    setReDo(!reDo)
    setLocal(true)
  },[reDo, formData])

  const handleBuscarLocalyGoogle = useCallback(async (codigoBarraIngresado) => {
    setBuscando(true);
    const {categoria, ...productoLocal} = await getProductoPorCodigoBarra(codigoBarraIngresado)
      if (!productoLocal.error) {
        setLocal(true)
        setFormData(productoLocal);
        setListadoProveedores(productoLocal.proveedores)
        setImagenes([{imagen: {src:productoLocal.imagen, alt:"Imagen Guardada"}}])
      }else{
        const { imagenes: ims, primerResultadoDeLaBusqueda: { prismaObject = {} }, textoCompleto } = await buscarPorCodigoDeBarras(codigoBarraIngresado);
        setImagenes(ims)
        setFormData((prev) => ({...prev, ...prismaObject}));
      }
      setBuscando(false);
  },[]);

  const handleInputChange = useCallback(({name, value}) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleProveedoresSelected = useCallback(({valueField, value}) => {
    setProveedorSelected({[valueField]:value})
  }, []);



  const onCapture = (code) => {
    console.log('code', code)
    alertaLeerCodigoBarra(code, () => {
      setFormData(prev => ({ ...prev, codigoBarra: code }))
      handleBuscarLocalyGoogle(code)
    })
  }

  const deleteProveedorById = (id) => {
    setListadoProveedores((prev) => prev.filter(proveedor => proveedor.id !== id));
  }

  useEffect(() => {
    if(proveedorSelected?.id){
      setListadoProveedores((prev) => {
        prev.push(proveedorSelected)
        const ids = {}
        prev.forEach(({id}) => ids[id] = id )
        const resultado = Object.keys(ids).map((k) => ({id: k}))
        console.log(resultado)
        return resultado;
      })
   }
  },[proveedorSelected])

  const handleImageChange = useCallback((selectedImageUrl) => {
    if (selectedImageUrl && (selectedImageUrl !== formData.imagen)) {
      setFormData(prevFormData => ({ ...prevFormData, imagen: selectedImageUrl }));
    }
  },[formData]);

  const handleCodigoBarraKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = e.target.value;
      handleBuscarLocalyGoogle(value);
    }
  }, [handleBuscarLocalyGoogle]);

  const handleReset = useCallback(() => {
    deleteParam("codigoBarra")
    setBuscando(false)
    setFormData(blankForm)
    setLocal(false)
    setImagenes([])
    setListadoProveedores([])
  },[blankForm, deleteParam])

  useEffect(() => {
    if (codigoBarraParam) {
     handleBuscarLocalyGoogle(codigoBarraParam)
    }
  }, [codigoBarraParam, handleBuscarLocalyGoogle, reDo]);

  useEffect(() => {
      setFormData((prev) => ({...prev, proveedores: listadoProveedores}))
  }, [listadoProveedores]);
  
  return (
    <FormCard
      handleReset={handleReset}
      loading={buscando}
      action={handleSave}
      className={"flex pt-4 max-w-full  bg-gray-200"}
      title={`${local ? "Editar" : "Cargar"} Producto`}
    >
      <div className='flex flex-col-reverse lg:flex-row-reverse'>
        <SelectorImagenes nombre={formData.nombre} imagenes={imagenes} proceder={(selectedImageUrl) => handleImageChange(selectedImageUrl)}/>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 h-fit">

          <div className="lg:col-span-3">
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
          <div className="lg:col-span-2">
            <Input
              name="size"
              label="Tamaño"
              placeholder="Tamaño, cantidad"
              onChange={handleInputChange}
              value={formData.size}
            />
          </div>
          <div className="lg:col-span-2">
            <Input
              name="unidad"
              label="Unidades"
              placeholder="Litros, gramos, etc.."
              onChange={handleInputChange}
              value={formData.unidad}
            />
          </div>
          <div className="lg:col-span-1">
            <Input
              name="stock"
              label="Stock"
              placeholder="cantidad"
              onChange={handleInputChange}
              value={formData.stock}
            />
          </div>
          <div className="lg:col-span-2">
            <Input
              name="precioActual"
              label="Precio"
              placeholder="Ingrese el precio Actual"
              onChange={handleInputChange}
              value={formData.precioActual}
            />
          </div>
          <div className="lg:col-span-3">
            <SelectCategoriaClient
              name={"idCategoria"}
              onChange={handleInputChange}
              value={formData.idCategoria}
              formData={formData}
              keepData={formData}
            />
          </div>
          <div className="lg:col-span-7">
            <Input
              name="nombre"
              label="Nombre"
              placeholder="Marca y Nombre del producto"
              onChange={handleInputChange}
              value={formData.nombre}
            />
          </div>
          <div className="lg:col-span-10">
            <Input
              name="descripcion"
              label="Descripcion"
              placeholder="Coloque una buena descripcion"
              onChange={handleInputChange}
              value={formData.descripcion}
            />
          </div>
          <div className="flex flex-row lg:col-span-3">
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
          <div className="lg:col-span-7">
            <InputArrayListProveedores
              name="Provedores"
              label="Proveedores"
              placeholder="Agregue proveedores"
              dataList={formData.proveedores}
              dataFilterKey={"id"}
              onChange={handleInputChange}
              onRemove={deleteProveedorById}
              tabIndex={-1}
            />
          </div>
        </div>

      </div>
    </FormCard>
  );
}

