"use client"
import { useState, useEffect, useCallback, useMemo } from 'react';
import { guardarProducto } from "@/prisma/serverActions/productos";
import SelectCategoriaClient from "../categorias/SelectCategoriaClient";
import Input from "../formComponents/Input";
import { FormCard } from "../formComponents/FormCard";
import { getProductoPorCodigoBarra } from "@/prisma/consultas/productos";
import useMyParams from '@/app/hooks/useMyParams';
import buscarPorCodigoDeBarras from '@/lib/buscarPorCodigoDeBarras';
import SelectorImagenes from '../formComponents/SelectorImagenes';
import FormTitle from '../formComponents/Title';
import { consultarAHere } from '@/app/ia/consultaIa';

export const CargaProductoBuscadorClient = ({ categorias, ia = false }) => {
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
    categoriaId: '',
    imagen: '',
  }), []);

  const [formData, setFormData] = useState(blankForm);
  const [buscando, setBuscando] = useState(false);
  const [imagenes, setImagenes] = useState([]);
  const [reDo, setReDo] = useState(true);
  const [local, setLocal] = useState(null);

  const handleSave = (e) => {
    guardarProducto(e)
    setReDo(!reDo)
    setLocal(true)
  }

  const handleBuscarLocalyGoogle = useCallback(async (codigoBarraIngresado) => {
    setBuscando(true);
    const productoLocal = await getProductoPorCodigoBarra(codigoBarraIngresado)
      if (!productoLocal.error) {
        setLocal(true)
        setFormData(productoLocal);
        setImagenes([{imagen: {src:productoLocal.imagen, alt:"Imagen Guardada"}}])
      }else{
        const { imagenes: ims, primerResultadoDeLaBusqueda: { prismaObject = {} }, textoCompleto } = await buscarPorCodigoDeBarras(codigoBarraIngresado);
        setImagenes(ims)
        setFormData(prismaObject);
        //Activar la IA para procesar los datos y corregirlos.
        if(ia){
          consultarAHere(prismaObject, textoCompleto)
        }
      }
      setBuscando(false);
  },[ia]);


  const handleInputChange = useCallback((e) => {
    e.preventDefault()
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleInputChangeSelect = useCallback((a, b) => {
    setFormData(prev => ({ ...prev, [a]: b }));
  }, []);

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
  },[blankForm, deleteParam])

  useEffect(() => {
    if (codigoBarraParam) {
      handleBuscarLocalyGoogle(codigoBarraParam)
    }
  }, [codigoBarraParam, handleBuscarLocalyGoogle, reDo]);

  return (
    <div className='flex flex-row m-0'>
      <FormCard className={"grid grid-cols-1 max-w-[600px] gap-2 rounded-none "} handleReset={handleReset} loading={buscando} action={handleSave}>
        <FormTitle
            textClass={"text-3xl font-bold text-slate-500"}
            className={`col-span-full text-center`}
          >
              {`${ local ? "Editar" : "Cargar"} Producto ${formData?.id}`}
        </FormTitle>

        <div className="grid col-span-full grid-cols-12 gap-3">
          <div className="col-span-6">
            <Input
              name="codigoBarra"
              label="Codigo De Barras"
              placeholder="Escanee un codigo de barras"
              onKeyDown={handleCodigoBarraKeyPress}
              onChange={handleInputChange}
              value={formData.codigoBarra}
              />
            </div>
            <div className="col-span-3">
              <Input
                name="size"
                label="Tamaño"
                placeholder="Tamaño, cantidad"
                onChange={handleInputChange}
                value={formData.size}
              />
            </div>
            <div className="col-span-3">
              <Input
                name="unidad"
                label="Unidades"
                placeholder="Litros, gramos, etc.."
                onChange={handleInputChange}
                value={formData.unidad}
              />
            </div>
            <div className="col-span-12">
              <Input
                name="nombre"
                label="Nombre"
                placeholder="Marca y Nombre del producto"
                onChange={handleInputChange}
                value={formData.nombre}
              />
            </div>
            <div className="col-span-12">
              <Input
                name="descripcion"
                label="Descripcion"
                placeholder="Coloque una buena descripcion"
                onChange={handleInputChange}
                value={formData.descripcion}
              />
            </div>
            <div className="col-span-6">
              <Input
                name="precioActual"
                label="Precio Actual"
                placeholder="Ingrese el precio Actual"
                onChange={handleInputChange}
                value={formData.precioActual}
              />
            </div>
            <div className="col-span-6">
              <SelectCategoriaClient
                valueField="id"
                textField="nombre"
                options={categorias}
                name="categoriaId"
                label="Categoria"
                placeholder="Elija una categoría"
                onChange={handleInputChangeSelect}
                value={formData.categoriaId}
              />
            </div>
          </div>

        <Input className={"col-span-1"}type={"hidden"} name={"imagen"} value={formData.imagen} onChange={handleInputChange}/>
      </FormCard>
      <div className='p-4 h-auto w-[400px] items-center bg-slate-400'>
        <SelectorImagenes imagenes={imagenes} proceder={(selectedImageUrl) => handleImageChange(selectedImageUrl)}/>
        <div className='absolute top-0 left-0'>
          <div>Cargar imagen</div>
        </div>
      </div>
    </div>
  );
};
