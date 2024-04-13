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
import InputArrayList from '../formComponents/InputArrayList';
import Icon from '../formComponents/Icon';
import QrCodeScanner from "@/app/components/camara/Scanner"
import { alertaLeerCodigoBarra } from '../alertas/alertaLeerCodigoBarra';

export const CargaProductoBuscadorClient = ({ categorias, proveedores, ia = false }) => {
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

  const handleSave = useCallback((e) => {
    e?.preventDefault?.()
    guardarProducto(formData)
    setReDo(!reDo)
    setLocal(true)
  },[reDo, formData])

  const handleBuscarLocalyGoogle = useCallback(async (codigoBarraIngresado) => {
    setBuscando(true);
    const productoLocal = await getProductoPorCodigoBarra(codigoBarraIngresado)
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

  const handleInputChange = useCallback((e) => {
    e.preventDefault()
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const onCapture = (code) => {
    console.log('code', code)
    alertaLeerCodigoBarra(code, () => {
      setFormData(prev => ({ ...prev, codigoBarra: code }))
      handleBuscarLocalyGoogle(code)
    }
  )
  }

  const handleCategoriaChange = useCallback((a, b) => {
    setFormData(prev => ({ ...prev, idCategoria: b }));
  }, []);

  const handleProveedoresSelected = useCallback((a, b) => {
    setProveedorSelected({[a]:b})
  }, []);

  const deleteProveedorById = (id) => {
    setListadoProveedores((prev) => prev.filter(proveedor => proveedor.id !== id));
  }

  const handleProveedoresChangeSelect = useCallback(() => {
    setListadoProveedores((prev) => {
      prev.push(proveedorSelected)
      const ids = {}
      prev.forEach(({id}) => ids[id] = id )
      const resultado = Object.keys(ids).map((k) => ({id: k}))
      return resultado;
    })
  }, [proveedorSelected]);

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
    <div className='
      flex
      flex-col
      lg:flex-row
      mx-auto
      max-w-[1800px]
      items-center
      bg-slate-300
    '>
      <FormCard
        handleReset={handleReset}
        loading={buscando}
        action={handleSave}
        className={"flex flex-col gap-2 rounded-none h-auto"}
        >
        <FormTitle
            textClass={"text-3xl font-bold text-slate-500 lg:w-auto max-w-[400px] lg:max-w-full"}
            className={`text-center`}>
              {`${local ? "Editar" : "Cargar"} Producto${local ? ":" : ""} ${formData?.nombre}`}
        </FormTitle>

        <div className="grid grid-cols-1 lg:grid-cols-10 gap-3">
          <div className="lg:col-span-3">
            <Input
              name="codigoBarra"
              label="Codigo De Barras"
              placeholder="Escanee un codigo de barras"
              onKeyDown={handleCodigoBarraKeyPress}
              onChange={handleInputChange}
              value={formData.codigoBarra}
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
              valueField="id"
              textField="nombre"
              options={categorias}
              name="idCategoria"
              label="Categoria"
              placeholder="Elija una categoría"
              onChange={handleCategoriaChange}
              value={formData.idCategoria}
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
            <SelectCategoriaClient
              valueField="id"
              textField="nombre"
              options={proveedores}
              label="Proveedor"
              placeholder="Elija un Proveedor"
              onChange={handleProveedoresSelected}
              value={formData.proveedores}
            />
            <Icon
              icono={"person-circle-plus"}
              type="button" className="ml-8 text-4xl text-green-700"
              onClick={handleProveedoresChangeSelect} />
          </div>
          <div className="lg:col-span-7">
            <InputArrayList
                name="Provedores"
                label="Proveedores"
                placeholder="Coloque una buena descripcion"
                onChange={handleInputChange}
                value={formData.proveedores.map(({id}) => proveedores.find((p) => p.id == id))}
                onRemove={deleteProveedorById}
              />
          </div>
        </div>
      </FormCard>
      <div className='flex flex-col min-w-fit bg-slate-300'>
         <SelectorImagenes imagenes={imagenes} proceder={(selectedImageUrl) => handleImageChange(selectedImageUrl)}/>
      </div>
    </div>
  );
}

  /*
  return (
    <div className='text-base flex flex-row max-[1000px]:flex-col max-[1000px]:items-center m-0 min-w-[200px] max-w-[1800px]'>
      <FormCard className={"flex flex-col gap-2 rounded-none "} handleReset={handleReset} loading={buscando} action={handleSave}>
        <FormTitle
            textClass={"text-3xl font-bold text-slate-500"}
            className={`col-span-full text-center`}
          >
              {`${ local ? "Editar" : "Cargar"} Producto${ local ? ":" : ""} ${formData?.nombre}`}
        </FormTitle>

        <div className="grid col-span-full grid-cols-10 max-[1000px]:grid-cols-2 gap-3 max-w-[1400px] ">
          <div className="grid col-span-full grid-cols-8 max-[1000px]:grid-cols-1 gap-3">
            <div className="col-span-2">
              <Input
                name="codigoBarra"
                label="Barras"
                placeholder="Escanee un codigo de barras"
                onKeyDown={handleCodigoBarraKeyPress}
                onChange={handleInputChange}
                value={formData.codigoBarra}
                />
              </div>
              <div className="col-span-1">
                <Input
                  name="size"
                  label="Tamaño"
                  placeholder="Tamaño, cantidad"
                  onChange={handleInputChange}
                  value={formData.size}
                />
              </div>
              <div className="col-span-1">
                <Input
                  name="unidad"
                  label="Unidad"
                  placeholder="Litros, gramos, etc.."
                  onChange={handleInputChange}
                  value={formData.unidad}
                />
              </div>
              <div className="col-span-1">
                <Input
                  name="precioActual"
                  label="Precio"
                  placeholder="Ingrese el precio Actual"
                  onChange={handleInputChange}
                  value={formData.precioActual}
                />
              </div>
              <div className="col-span-1">
                <Input
                  name="stock"
                  label="Stock"
                  placeholder="cantidad"
                  onChange={handleInputChange}
                  value={formData.stock}
                />
              </div>

              <div className="col-span-2">
                <SelectCategoriaClient
                  valueField="id"
                  textField="nombre"
                  options={categorias}
                  name="idCategoria"
                  label="Categoria"
                  placeholder="Elija una categoría"
                  onChange={handleCategoriaChange}
                  value={formData.idCategoria}
                />
              </div>
            </div>

            <div className="col-span-4 max-[1000px]:col-span-full">
              <Input
                name="nombre"
                label="Nombre"
                placeholder="Marca y Nombre del producto"
                onChange={handleInputChange}
                value={formData.nombre}
              />
            </div>
            <div className="col-span-6 max-[1000px]:col-span-full">
              <Input
                name="descripcion"
                label="Descripcion"
                placeholder="Coloque una buena descripcion"
                onChange={handleInputChange}
                value={formData.descripcion}
              />
            </div>
            <div className="flex flex-row col-span-3 max-[1000px]:col-span-full">
              <SelectCategoriaClient
                valueField="id"
                textField="nombre"
                options={proveedores}
                label="Proveedor"
                placeholder="Elija un Proveedor"
                onChange={handleProveedoresSelected}
                value={formData.proveedores}
              />
              <Icon
                //icono={"right-to-bracket"}
                icono={"person-circle-plus"}

                type="button" className="ml-8 text-4xl text-green-700"
                onClick={handleProveedoresChangeSelect} />
            </div>
            <div className="col-span-7 max-[1000px]:col-span-full">
              <InputArrayList
                  name="Provedores"
                  label="Proveedores"
                  placeholder="Coloque una buena descripcion"
                  onChange={handleInputChange}
                  value={formData.proveedores.map(({id}) => proveedores.find((p) => p.id == id )  )}
                  onRemove={deleteProveedorById}
                />
            </div>
          </div>

        <Input className={"col-span-1"}type={"hidden"} name={"imagen"} value={formData.imagen} onChange={handleInputChange}/>
      </FormCard>
      <div className='p-4 h-[356px] min-w-[356px] w-[356px] items-center bg-slate-400'>
        <SelectorImagenes imagenes={imagenes} proceder={(selectedImageUrl) => handleImageChange(selectedImageUrl)}/>
      </div>
    </div>
  );

};
*/