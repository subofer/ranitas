"use client"
import { useState, useEffect, useCallback, useMemo } from 'react';
import { guardarProducto } from "@/prisma/serverActions/productos";
import SelectCategoriaClient from "../categorias/SelectCategoriaClient";
import Input from "../formComponents/Input";
import { FormCard } from "../formComponents/FormCard";
import { CargaProductoBuscador } from './CargaProductoBuscador';
import buscarPorCodigoDeBarras from "@/lib/buscarPorCodigoDeBarras";
import debounce from '@/lib/debounce';
import ResultadoBusqueda from '../productos/ResultadoBusqueda';
import CheckBox from '../formComponents/CheckBox';

export const CargaProductoBuscadorClient = ({categorias}) => {

  const blankForm = useMemo(() => ({
    codigoBarra: '',
    nombre: '',
    descripcion: '',
    size:'',
    unidad:'',
    precioActual: '',
    categoriaId: '',
  }),[])

  const [formData, setFormData] = useState(blankForm);
  const [mustSearch, setMustSearch] = useState(true);

  const [resultado, setResultado] = useState({});

  const [buscado, setBuscado] = useState(false);
  const [buscando, setBuscando] = useState(false);

  const formDataSeter = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const handleSetFormData = useCallback((data) =>(
    Object.keys(data).forEach(k =>
      data[k] != undefined && formDataSeter(k, data[k])
  )),[])

  // Actualiza el estado del formulario
  const handleInputChange = ({target: { name, value }}) => (
    formDataSeter(name, value)
  );

  const handleReset = useCallback(() => {
    setBuscado(false)
    setBuscando(false)
    setResultado({})
    handleSetFormData(blankForm);
  },[blankForm, handleSetFormData])

  const buscarProductoDebounced = useMemo(() => debounce(async (code) => {
    setBuscando(true)
    if (code.length > 8 && mustSearch) {
      const { resultadosDeLaBusqueda: [{ prismaObject = {} }] = [] } = await buscarPorCodigoDeBarras(code);
      const { resultadosDeLaBusqueda: [primer] = [] } = await buscarPorCodigoDeBarras(code);
      handleSetFormData(prismaObject);
      setResultado(primer)
      setBuscado(!!prismaObject.codigoBarra);
    }
    setBuscando(false)
  }, 500), [handleSetFormData, mustSearch]);

  useEffect(() => {
    !buscado && buscarProductoDebounced(formData.codigoBarra);
    buscado && formData.codigoBarra == "" && handleReset()
  }, [formData.codigoBarra, buscarProductoDebounced, buscado, handleReset]);

  const cargarProductos = {
    props: {
      id: "FormCargarProducto",
      title: "Cargar Producto",
      action: guardarProducto,
      handleReset,
    },
    inputs: [
      { Component: Input, name: "codigoBarra", label: "Codigo De Barras", placeholder: "Codigo de barras", onChange: handleInputChange },
      { Component: Input, name: "nombre", label: "Nombre", placeholder: "Nombre" , onChange: handleInputChange },
      { Component: Input, name: "descripcion", label: "Descripcion", placeholder: "Descripcion" , onChange: handleInputChange },
      { Component: Input, name: "size", label: "Tamaño", placeholder: "tamaño" , onChange: handleInputChange },
      { Component: Input, name: "unidad", label: "Unidad", placeholder: "g/kg/ml/cc/etc.." , onChange: handleInputChange },
      { Component: Input, name: "precioActual", label: "Precio", type: "number", min: 0, placeholder: 0 , onChange: handleInputChange },
      { Component: SelectCategoriaClient,
        valueField:"id",
        textField:"nombre",
        options: categorias,
        name: "categoriaId",
        label: "Categoria",
        placeholder: "Elija Categoria"
      }
    ],
  };

  return (
    <div className='flex flex-row'>
      <FormCard loading={buscando} {...cargarProductos.props} formlength={cargarProductos.inputs.length}>
        <CheckBox checked={mustSearch} label="Buscar al escribir?" name="$ACTION_activarOpcion" seter={setMustSearch} />
        <CargaProductoBuscador inputs={cargarProductos.inputs} formData={formData}/>
      </FormCard>
      <ResultadoBusqueda resultado={resultado} />
    </div>
  );
};
