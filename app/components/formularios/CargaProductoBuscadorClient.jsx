"use client"
import { useState, useEffect, useCallback, useMemo } from 'react';
import { guardarProducto } from "@/prisma/serverActions/productos";
import SelectCategoriaClient from "../categorias/SelectCategoriaClient";
import Input from "../formComponents/Input";
import { FormCard } from "../formComponents/FormCard";
import CheckBox from '../formComponents/CheckBox';
import ImagenProducto from '../productos/ImagenProducto';
import { getProductoPorCodigoBarra } from "@/prisma/consultas/productos";
import useMyParams from '@/app/hooks/useMyParams';
import buscarPorCodigoDeBarras from '@/lib/buscarPorCodigoDeBarras';

export const CargaProductoBuscadorClient = ({ categorias }) => {
  const { searchParams, deleteParam } = useMyParams();
  const codigoBarraParam = searchParams.get('codigoBarra');

  const blankForm = useMemo(() => ({
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
  const [reDo, setReDo] = useState(true);
  const [local, setLocal] = useState(null);

  const handleSave = (e) => {
    guardarProducto(e)
    setReDo(!reDo)
    setLocal("local")
  }

  const handleBuscarLocalyGoogle = useCallback(async (codigoBarraIngresado) => {
    setBuscando(true);
    const productoLocal = await getProductoPorCodigoBarra(codigoBarraIngresado)
      if (!productoLocal.error) {
        setFormData(productoLocal);
        setLocal("local")
      }else{
        const { resultadosDeLaBusqueda: [{ prismaObject = {} }] = [] } = await buscarPorCodigoDeBarras(codigoBarraIngresado);
        setFormData(prismaObject);
        setLocal(null)
      }
      setBuscando(false);
  },[]);


  const handleInputChange = useCallback((e) => {
    e.preventDefault()
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

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
    setLocal(null)
  },[blankForm, deleteParam])

  useEffect(() => {
    if (codigoBarraParam) {
      handleBuscarLocalyGoogle(codigoBarraParam)
    }
  }, [codigoBarraParam, handleBuscarLocalyGoogle, reDo]);

  return (
    <div className='flex flex-row'>
      {formData.imagen && <ImagenProducto item={formData} size={320} texto="Imagen del producto" />}
      <FormCard handleReset={handleReset} loading={buscando} title={`${ local ? "Editar" : "Cargar"} Producto`} action={handleSave}>
        {/*<CheckBox name="activarOpcion" label="Buscar al escribir?" seter={() => {}} />*/}
        <input hidden name={"imagen"} value={formData.imagen}/>
        <Input
          name="codigoBarra"
          label="Codigo De Barras"
          placeholder="Codigo de barras"
          onKeyDown={handleCodigoBarraKeyPress}
          onChange={handleInputChange}
          value={formData.codigoBarra}
        />

        <Input
          name="nombre"
          label="Nombre"
          placeholder="Nombre"
          onChange={handleInputChange}
          value={formData.nombre}
        />

        <Input
          name="descripcion"
          label="Descripcion"
          placeholder="Descripcion"
          onChange={handleInputChange}
          value={formData.descripcion}
        />

        <Input
          name="size"
          label="Tamaño"
          placeholder="Tamaño"
          onChange={handleInputChange}
          value={formData.size}
        />

        <Input
          name="unidad"
          label="Unidad"
          placeholder="Unidad"
          onChange={handleInputChange}
          value={formData.unidad}
        />

        <Input
          name="precioActual"
          label="Precio Actual"
          placeholder="Precio Actual"
          onChange={handleInputChange}
          value={formData.precioActual}
        />

        <SelectCategoriaClient
          valueField="id"
          textField="nombre"
          options={categorias}
          name="categoriaId"
          label="Categoria"
          placeholder="Elija una categoría"
          onChange={handleInputChange}
          value={formData.categoriaId}
        />
      </FormCard>
    </div>
  );
};
