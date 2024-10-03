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
import SelectCategoriaClient from '../categorias/SelectCategoriaClient';
import SelectProveedorClient from '../proveedores/SelectProveedorClient';
import InputArrayListProveedores from '../proveedores/InputArrayListProveedores';
import { textos } from '@/lib/manipularTextos';
import InputArrayListCategorias from '../categorias/InputArrayListCategorias';
import { LineChart } from '../graficos/LineGraphClient';
import Switch from '../formComponents/Switch';
import { alertaCrearCodigoDeBarras } from '../alertas/alertaCrearCodigoDeBarras';
import generateBarCode from '@/lib/barCodeGenerator.mjs';
import useHotkey from '@/app/hooks/useHotkey';


export const CargaProductoBuscadorClient = () => {
  const { param: codigoBarraParam , deleteParam } = useMyParams('codigoBarra');

  const blankForm = useMemo(() => ({
    id:'',
    codigoBarra: '',
    nombre: '',
    descripcion: '',
    size: '',
    unidad: '',
    precioActual: '',
    imagen: '',
    stock: '',
    proveedores: [],
    categorias: [],
  }), []);

  const [formData, setFormData] = useState(blankForm);
  const [buscando, setBuscando] = useState(false);
  const [imagenes, setImagenes] = useState([]);
  const [local, setLocal] = useState(null);

  const codigoDeBarraRef = useHotkey(['control','q'])

  const handleBuscar = useCallback(async (codigoBarraIngresado) => {
    setBuscando(true);
    const productoLocal = await getProductoPorCodigoBarra(codigoBarraIngresado)

    if (!productoLocal.error) {
      setLocal(true)
      setFormData((prev) => ({...prev, ...productoLocal}));
      setImagenes([{imagen: {src:productoLocal.imagen, alt:"Imagen Guardada"}}])
    }else{
      const { imagenes = [], primerResultado = {} } = await buscarPorCodigoDeBarras(codigoBarraIngresado);
      const { prismaObject = {} } = primerResultado;
      setImagenes(imagenes)
      setFormData((prev) => ({ ...prev, ...prismaObject}));
    }

    setBuscando(false);
  },[]);

  const handleGuardar = useCallback(async (data = formData) => {
    const { error } = await guardarProducto(data);
    if (!error) {
      await handleBuscar(data.codigoBarra);
    }
  }, [formData, handleBuscar]);

  const handleSave = async (e) => {
    if (formData.codigoBarra) {
      return await handleGuardar();
    } else {
      alertaCrearCodigoDeBarras(formData, async () => {
        setFormData(async (prev) => {
          const updatedFormData = { ...prev, codigoBarra: await generateBarCode(formData)};
          handleGuardar(updatedFormData);
          return updatedFormData;
        });
      });
    }
  };

  const handleInputChange =({name, value}) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  const handleProveedoresSelected = ({ selected }) => (
    setFormData(({ proveedores, ...prev }) => (
      { ...prev, proveedores: [...new Map([...proveedores, selected].map(item => [item.id, item])).values()] }
    ))
  );

  const handleCategoriasSelected = ({ selected }) => (
    setFormData(({ categorias, ...prev }) => (
      { ...prev, categorias: [...new Map([...categorias, selected].map(item => [item.id, item])).values()] }
    ))
  );

  const deleteProveedorById = (id) => (
    setFormData(({proveedores, ...prev}) => (
      {...prev, proveedores: proveedores.filter(proveedor => proveedor.id !== id)}
    ))
  );

  const deleteCategoriaById = (id) => (
    setFormData(({categorias, ...prev}) => (
      {...prev, categorias: categorias.filter(categoria => categoria.id !== id)}
    ))
  );

  //esto funciona solo con la camara, la camara solo funciona con https.
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
    console.log("codigoBarraParam", codigoBarraParam)
    if (codigoBarraParam) {
     handleBuscar(codigoBarraParam)
    }
  }, [codigoBarraParam, handleBuscar]);

  useEffect(() => {
    console.log("formData", formData)

  }, [formData]);

  return (
    <FormCard
      handleReset={handleReset}
      loading={buscando}
      action={handleSave}
      className={`flex pt-4 max-w-screen  bg-gray-200 md:p-4` }
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
          lg:grid-cols-10
          lg:mx-auto
          lg:h-fit
        ">

          <div className="col-span-full lg:col-span-4">
            <Input
              ref={codigoDeBarraRef}
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

          <div className="grid col-span-full gap-2 grid-cols-1 lg:grid-cols-2 lg:col-span-2">
            <div className="col-span-full  lg:col-span-1">
              <Input
                name="size"
                label="Tamaño"
                placeholder="Tamaño, cantidad"
                onChange={handleInputChange}
                value={formData.size}
              />
            </div>
            <div className="col-span-full lg:col-span-1">
              <Input
                name="unidad"
                label="Unidad"
                placeholder="Litros, gramos, etc.."
                onChange={handleInputChange}
                value={formData.unidad}
              />
            </div>
          </div>

          <div className="col-span-full lg:col-span-1">
            <Input
              name="stock"
              label="Stock"
              placeholder="cantidad"
              onChange={handleInputChange}
              value={formData.stock}
            />
          </div>

          <div className="col-span-full lg:col-span-1">
            <Input
              name="precioActual"
              label="Precio"
              placeholder="Ingrese el precio Actual"
              onChange={handleInputChange}
              value={formData.precioActual}
            />
          </div>
          <div className="col-span-full lg:col-span-2">
            <Switch
              name={"formatoVenta"}
              label={"Unidad"}
              seconLabel={"Suelto"}
              onChange={handleInputChange}
              value={formData.formatoVenta}
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
            <SelectCategoriaClient onChange={handleCategoriasSelected}/>
          </div>
          <div className="col-span-full lg:col-span-7">
            <InputArrayListCategorias
              name="categorias"
              label="Categorias"
              placeholder="Agregue proveedores"
              dataList={formData.categorias}
              dataFilterKey={"id"}
              onRemove={deleteCategoriaById}
              tabIndex={-1}
            />
          </div>
          <div className="col-span-full lg:col-span-3">
            <SelectProveedorClient onChange={handleProveedoresSelected} />
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
      <div className='hidden w-0 h-0'>
        <div className='bg-slate-100 p-10 w-full h-[200px]'>
          <LineChart data={formData?.precios} />,
        </div>
      </div>

      <div className="etiqueta">
        <div className="nombre">Nombre del Producto</div>
        <div className="codigo">Código de Barras</div>
        <div className="precio">Precio: $XX.XX</div>
        <div className="precioKg">Precio por Kg: $XX.XX</div>
      </div>

    </FormCard>
  );
}

