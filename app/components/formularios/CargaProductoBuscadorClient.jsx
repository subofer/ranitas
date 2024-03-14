"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { guardarProducto } from "@/prisma/serverActions/productos";
import SelectCategoria from "../categorias/SelectCategoria";
import Input from "../formComponents/Input";
import { FormCard } from "../formComponents/FormCard";
import buscarPorCodigoDeBarras from "@/lib/buscarPorCodigoDeBarras";
import { CargaProductoBuscador } from './CargaProductoBuscador';
import { textos } from '@/lib/manipularTextos';

export const CargaProductoBuscadorClient = () => {
  const blankForm = {codigoBarra: '',nombre: '',descripcion: '',precio: '',categoriaId: ''}
  const [formData, setFormData] = useState(blankForm);


  const formDataSeter = (key, value) => setFormData(prev => ({ ...prev, [key]: value }))

  const handleSetFormData = useCallback((newData) => {
    console.log(newData)
    Object.keys(newData).forEach(key => {
      newData[key] != undefined
      ? formDataSeter(key, newData[key])
      : null
    })
  },[])

  // Actualiza el estado del formulario
  const handleInputChange = ({target: { name, value }}) => (
    formDataSeter(name, value)
  );

  //Reset formData
  const handleReset = () => handleSetFormData(blankForm);

  // Busca por código de barras cuando el campo correspondiente cambia
  useEffect(() => {
    const buscarProducto = async () => {
      if (formData.codigoBarra.length > 8) {
        const { primerResultado: r,
          resultadosDeLaBusqueda } = await buscarPorCodigoDeBarras(formData.codigoBarra);
        console.log('Primer Resultado',r)
        console.log('todos Resultados',resultadosDeLaBusqueda)
        const newData = {
          codigoBarra: formData.codigoBarra,
          nombre: r?.detalles?.nombre ? textos.mayusculas.primeras(r?.detalles?.nombre): undefined,
          descripcion: r?.titulo ? textos.mayusculas.primeras(r?.titulo): undefined,
          precio: r?.precio?.valor,
        }
        handleSetFormData(newData)
      }
    };
    buscarProducto();
  }, [formData.codigoBarra, handleSetFormData]);

  const cargarProductos = {
    props: {
      id: "FormCargarProducto",
      title: "Cargar Producto",
      action: guardarProducto,
    },
    inputs: [
      { Component: Input, name: "codigoBarra", label: "Codigo De Barras", placeholder: "Codigo de barras", onChange: handleInputChange },
      { Component: Input, name: "nombre", label: "Nombre", placeholder: "Nombre" , onChange: handleInputChange },
      { Component: Input, name: "descripcion", label: "Descripcion", placeholder: "Descripcion" , onChange: handleInputChange },
      { Component: Input, name: "precio", label: "Precio", type: "number", min: 0, placeholder: 0 , onChange: handleInputChange },
      //{ Component: SelectCategoria, name: "categoriaId", label: "Categoria", placeholder: "Elija Categoria", onChange: handleInputChange }
    ],
  };

  return (
    <FormCard {...cargarProductos.props} formlength={cargarProductos.inputs.length}>
      <CargaProductoBuscador inputs={cargarProductos.inputs} formData={formData}/>
    </FormCard>
  );
};
