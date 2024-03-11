"use client"
import React, { useState, useEffect } from 'react';
import { guardarProducto } from "@/prisma/serverActions/productos";
import SelectCategoria from "../categorias/SelectCategoria";
import Input from "../formComponents/Input";
import { FormCard } from "../formComponents/FormCard";
import buscarPorCodigoDeBarras from "@/lib/buscarPorCodigoDeBarras";
import { CargaProductoBuscador } from './CargaProductoBuscador';

export const CargaProductoBuscadorClient = () => {
  const [formData, setFormData] = useState({
    codigoBarra: '',
    nombre: '',
    descripcion: '',
    precio: '',
    categoriaId: ''
  });

  // Actualiza el estado del formulario
  const handleInputChange = ({target: {name, value }}) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Busca por código de barras cuando el campo correspondiente cambia
  useEffect(() => {
    const buscarProducto = async () => {
      if (formData.codigoBarra) {
        const resultado = await buscarPorCodigoDeBarras(formData.codigoBarra);
        // Actualizar estado basado en la búsqueda
        //setFormData(...resultado.resultadosDeLaBusqueda[1]);
        console.log(resultado.resultadosDeLaBusqueda[1])
        const r = resultado.resultadosDeLaBusqueda[1]
        const newData= {
          codigoBarra: formData.codigoBarra,
          nombre: r.titulo,
          descripcion: r.titulo,
          precio: r.precio.valor,
          categoriaId: ''
        }
        setFormData(newData);
      }
    };
    buscarProducto();
  }, [formData.codigoBarra]);

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
      //{ Component: SelectCategoria, name: "categoriaId", label: "Categoria", placeholder: "Elija Categoria", onChange: handleInputChange  }
    ],
  };

  return (
    <FormCard {...cargarProductos}>
      <CargaProductoBuscador inputs={cargarProductos.inputs} formData={formData}/>
    </FormCard>
  );
};
