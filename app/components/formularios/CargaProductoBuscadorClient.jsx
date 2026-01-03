"use client"

import { useState, useEffect, useCallback, useMemo } from 'react';
import { guardarProducto } from "@/prisma/serverActions/productos";

import Input from "../formComponents/Input";
import { FormCard } from "../formComponents/FormCard";
import { getProductoPorCodigoBarra } from "@/prisma/consultas/productos";
import useMyParams from '@/hooks/useMyParams';
import buscarPorCodigoDeBarras from '@/lib/buscarPorCodigoDeBarras';
import SelectorImagenes from '../formComponents/SelectorImagenes';

import QrCodeScanner from "@/components/camara/Scanner"
import { alertaLeerCodigoBarra } from '../alertas/alertaLeerCodigoBarra';
import SelectCategoriaClient from '../categorias/SelectCategoriaClient';
import GestionPresentaciones from '../productos/GestionPresentaciones';
import SelectProveedorClient from '../proveedores/SelectProveedorClient';
import InputArrayListProveedores from '../proveedores/InputArrayListProveedores';
import { textos } from '@/lib/manipularTextos';
import InputArrayListCategorias from '../categorias/InputArrayListCategorias';
import { LineChart } from '../graficos/LineGraphClient';
import Switch from '../formComponents/Switch';
import { alertaCrearCodigoDeBarras } from '../alertas/alertaCrearCodigoDeBarras';
import generateBarCode from '@/lib/barCodeGenerator.mjs';
import useHotkey from '@/hooks/useHotkey';


export const CargaProductoBuscadorClient = () => {
  const { param: codigoBarraParam , deleteParam } = useMyParams('codigoBarra');

  const blankForm = useMemo(() => ({
    id:'',
    codigoBarra: '',
    nombre: '',
    descripcion: '',
    size: '',
    unidad: '',
    imagen: '',
    proveedores: [],
    categorias: [],
    presentaciones: [],
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
      setFormData((prev) => ({
        ...prev,
        ...productoLocal,
        presentaciones: productoLocal.presentaciones || []
      }));
      setImagenes([{imagen: {src:productoLocal.imagen, alt:"Imagen Guardada"}}])
    }else{
      const { imagenes = [], primerResultado = {} } = await buscarPorCodigoDeBarras(codigoBarraIngresado);
      const { prismaObject = {} } = primerResultado;
      setImagenes(imagenes)
      setFormData((prev) => ({ ...prev, ...prismaObject}));
    }

    setBuscando(false);
  },[]);

  const handleGuardar = useCallback(async (data) => {
    const { error } = await guardarProducto(data);
    if (!error) {
      await handleBuscar(data.codigoBarra);
    }
  }, [handleBuscar]);

  const handleSave = async (e) => {
    if (formData.codigoBarra) {
      return await handleGuardar(formData);
    } else {
      alertaCrearCodigoDeBarras(formData, async () => {
        const generarCodigoDeBarras = await generateBarCode(formData)
        const newFormData = { ...formData, codigoBarra: generarCodigoDeBarras}
        setFormData(newFormData)
        handleGuardar(newFormData);
      });
    }
  };

  const handleInputChange =({name, value}) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  const handleProveedoresSelected = ({ selected }) => {
    setFormData(prev => ({
      ...prev,
      proveedores: [...new Set([...prev.proveedores, {proveedorId: selected.id, proveedor:selected}])]
    }));
  };

  const handleCategoriasSelected = ({ selected }) => (
    setFormData(({ categorias, ...prev }) => (
      { ...prev, categorias: [...new Map([...categorias, selected].map(item => [item.id, item])).values()] }
    ))
  );

  const deleteProveedorById = (id) => {
    setFormData(({proveedores, ...prev}) => (
      {...prev, proveedores: proveedores.filter(proveedor => proveedor.proveedorId !== id)}
    ));
  };

  const deleteCategoriaById = (id) => (
    setFormData(({categorias, ...prev}) => (
      {...prev, categorias: categorias.filter(categoria => categoria.id !== id)}
    ))
  );

  const handlePresentacionesChange = (presentaciones) => {
    setFormData(prev => ({ ...prev, presentaciones }));
  };

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
      className="max-w-full"
      title={`${local ? "Editar" : "Cargar"} Producto`}
      busy={buscando}
    >
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-3'>
        {/* Panel de formulario principal */}
        <div className="lg:col-span-9">
          <div className="
            grid
            grid-cols-1
            w-full
            gap-3
            lg:gap-3
            lg:grid-cols-12
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

          <div className="grid col-span-full gap-1 grid-cols-1 lg:grid-cols-2 lg:col-span-3">
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
          <div className="col-span-full lg:col-span-2">
            <Switch
              name={"formatoVenta"}
              label={"Unidad"}
              seconLabel={"Suelto"}
              onChange={handleInputChange}
              value={formData.formatoVenta}
            />
          </div>
          <div className="col-span-full lg:col-span-5">
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
          <div className="col-span-full lg:col-span-9">
            <InputArrayListCategorias
              name="categorias"
              label="Categorias"
              placeholder="Agregue Categoria"
              dataList={formData.categorias}
              dataFilterKey={"id"}
              onRemove={deleteCategoriaById}
              tabIndex={-1}
            />
          </div>
          <div className="col-span-full lg:col-span-3">
            <SelectProveedorClient onChange={handleProveedoresSelected} />
          </div>
          <div className="col-span-full lg:col-span-9">
            <InputArrayListProveedores
              name="Provedores"
              label="Proveedores"
              placeholder="Agregue proveedores"
              dataList={formData.proveedores?.map(p => p.proveedor)}
              dataFilterKey={"id"}
              onRemove={deleteProveedorById}
              tabIndex={-1}
            />
          </div>

          <div className="col-span-full">
            <GestionPresentaciones
              presentaciones={formData.presentaciones}
              onChange={handlePresentacionesChange}
            />
          </div>
          </div>
        </div>

        {/* Panel de imágenes */}
        <div className='lg:col-span-3'>
          <div className='bg-slate-50 border border-slate-200/40 rounded-lg shadow-md p-3 h-fit'>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Imágenes del Producto</h4>
            <SelectorImagenes
              className=''
              nombre={formData.nombre}
              imagenes={imagenes}
              proceder={handleImageChange}/>
          </div>
        </div>

      </div>
    </FormCard>
  );
}

