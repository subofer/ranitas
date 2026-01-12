"use client"

import Button from "../formComponents/Button";
import { useCallback, useEffect, useRef, useState } from "react";
import { buscar } from "@/app/acciones/contactos/buscarCuitOnline";
import Input from "../formComponents/Input";
import useMyParams from "@/hooks/useMyParams";
import SelectProvinciaClient from "../geoRef/SelectProvinciaClient";
import SelectLocalidadClient from "../geoRef/SelectLocalidadClient";
import SelectCalleClient from "../geoRef/SelectCalleClient";
import useRenderCount from "@/hooks/useRenderCount";
import Switch from "../formComponents/Switch";
import { getContactoByCuit, upsertContacto } from "@/prisma/serverActions/contactos";
import Icon from "../formComponents/Icon";
import { FormCard } from "../formComponents/FormCard";
const defautlFormValues = {
  id:'',
  esProveedor: false,
  esInterno: false,
  esMarca: false,
  cuit:'',
  nombre:'',
  telefono:'',
  email: '',
  persona: '',
  iva: '',
  direcciones:[{
    idProvincia: '',
    idLocalidad: '',
    idLocalidadCensal: '',
    idCalle: '',
    numeroCalle: '',
  }]
};

export default function CargarContacto() {
  useRenderCount("CargarContacto")

  const { searchParams, deleteParam } = useMyParams()
  const [formData, setFormData] = useState(defautlFormValues)
  const [buscando, setBuscando] = useState(false)
  const [cuitIngresado, setCuitIngresado] = useState(null)
  const title = "Ficha de Contacto";

  const [error, setError] = useState({error:false})
  const formRef = useRef(null);

  const onChange = ({name, value}) => setFormData(prev => ({...prev, [name]: value}))

  const onSelectChange = ({name, value, option: { idLocalidadCensal } = {}}, index) => {
    
    setFormData(({direcciones, ...prev}) => {
      direcciones[index][name] = value;
      console.log("direcciones[index][name]", direcciones[index][name])
      console.log("direcciones[index][name]", index)
      console.log("direcciones[index][name]", name)
      if(name == "idLocalidad" && idLocalidadCensal){
        direcciones[index].idLocalidadCensal = idLocalidadCensal;
      }
      return({...prev, direcciones})
    })
  }

  const handleSave = async () => {
    await upsertContacto(formData)
  }

  const handleReset = useCallback(() => {
    deleteParam('cuit')
    setCuitIngresado(null)
    setError({error: false})
    setFormData((prev) => defautlFormValues) ;
  },[deleteParam])

  const handleDireccionDelete = (index) => {
    console.log('index', formData.direcciones.length)
    formData.direcciones.length == 1
      ? setFormData(({direcciones, ...prev}) => ({...prev, direcciones:defautlFormValues.direcciones}))
      : setFormData(({direcciones, ...prev}) => ({...prev, direcciones:[...direcciones.map((d,i) => i != index ? d : null).filter(Boolean)]}))
  }

  const handleDireccionAdd = () => {
    console.log("defautlFormValues", defautlFormValues)
    setFormData(({direcciones, ...prev}) =>
      ({...prev, direcciones:[...direcciones, ...defautlFormValues.direcciones ]})
    )
  }

  const handleBuscar = async () => {
    setBuscando(true)
    if(formData?.cuit){
      setError({error: true, msg: "Buscando..."})
      const personaEncontrada = await buscar(formData)

      if(!personaEncontrada?.error) {
        setFormData(normalizeContactoData(personaEncontrada))
        setError({error: false})
      }else{
        setError(personaEncontrada)
      }
    }
    setBuscando(false)
  }

  useEffect(() => {
    const cuitParam = searchParams.get('cuit');
    setCuitIngresado(cuitParam)
  },[searchParams])


  // Función para limpiar y normalizar datos del contacto
  const normalizeContactoData = (contacto) => {
    if (!contacto) return defautlFormValues;

    const primeraDireccion = contacto?.direcciones?.[0] || {};

    return {
      id: contacto.id || '',
      cuit: contacto.cuit || '',
      nombre: contacto.nombre || '',
      telefono: contacto.telefono || '',
      persona: contacto.persona || '',
      iva: contacto.iva || '',
      esProveedor: Boolean(contacto.esProveedor),
      esInterno: Boolean(contacto.esInterno),
      esMarca: Boolean(contacto.esMarca),
      direcciones: [{
        idProvincia: primeraDireccion.provincia?.id || primeraDireccion.idProvincia || '',
        idLocalidad: primeraDireccion.localidad?.id || primeraDireccion.idLocalidad || '',
        idLocalidadCensal: primeraDireccion.idLocalidadCensal || '',
        idCalle: primeraDireccion.calle?.id || primeraDireccion.idCalle || '',
        numeroCalle: primeraDireccion.numeroCalle ? primeraDireccion.numeroCalle.toString() : '',
      }],
      email: contacto.emails?.map(({email}) => email).filter(Boolean).join(',') || '',
    };
  };

  useEffect(() => {
    async function completarConCuit() {
      if (!cuitIngresado) return;

      setBuscando(true)
      try {
        const contactoEncontrado = await getContactoByCuit(cuitIngresado)

        if (!contactoEncontrado || contactoEncontrado.cuit !== cuitIngresado) {
          console.log('No se encontró contacto o CUIT no coincide, reseteando formulario')
          handleReset()
        } else {
          console.log('Cargando contacto encontrado:', contactoEncontrado)
          const normalizedData = normalizeContactoData(contactoEncontrado)
          console.log('Datos normalizados para formulario:', normalizedData)
          setFormData(normalizedData)
        }
      } catch (error) {
        console.error('Error al cargar contacto:', error)
        setError({error: true, msg: "Error al cargar el contacto"})
      } finally {
        setBuscando(false)
      }
    }

    completarConCuit();
  },[cuitIngresado, handleReset])

  useEffect(() => {
    if (formRef.current) {
      formRef.current.querySelectorAll('input, button').forEach(element => {
        element.disabled = buscando;
      });
    }
  },[buscando])

  useEffect(() => {
    console.log("formData", formData)
  },[formData])


  return (
    <main className='min-h-screen bg-slate-50 py-8'>
      <div className='container mx-auto max-w-6xl px-4'>
        <FormCard title={title} action={handleSave} formRef={formRef} buttons={false} data-testid="contact-form">
          <input hidden name="id" value={formData.id} readOnly/>

          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <Input
              name={"cuit"}
              label={"Cuit"}
              onChange={onChange}
              value={formData.cuit}
              placeholder={"Ingrese cuit"}
              doOnEnter={handleBuscar}
            />
            <Input
              name={"persona"}
              label={"Tipo"}
              onChange={onChange}
              value={formData.persona}
              placeholder={"Personería jurídica"}
            />
            <Input
              name={"iva"}
              label={"Condición ante el IVA"}
              onChange={onChange}
              value={formData.iva}
              placeholder={"Condición IVA"}
            />
          </div>

          {/* Información de contacto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Input
              name={"nombre"}
              label={"Nombre"}
              onChange={onChange}
              value={formData.nombre}
              placeholder={"El nombre se carga automáticamente"}
            />
            <Input
              name={"telefono"}
              label={"Teléfono"}
              onChange={onChange}
              value={formData.telefono}
              placeholder={"Sin puntos ni guiones"}
            />
          </div>

          <div className="mb-6">
            <Input
              name={"email"}
              label={"E-Mails"}
              onChange={onChange}
              value={formData.email}
              placeholder={"correo@electron.ico"}
            />
          </div>

          {/* Switches */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Switch
              value={formData.esProveedor}
              onChange={onChange}
              name={"esProveedor"}
              label={"Es Proveedor"}
            />
            <Switch
              value={formData.esInterno}
              onChange={onChange}
              name={"esInterno"}
              label={"Es Interno"}
            />
            <Switch
              value={formData.esMarca}
              onChange={onChange}
              name={"esMarca"}
              label={"Es Marca"}
            />
          </div>

          {/* Direcciones */}
          <div className="border-t pt-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Icon icono={"map-marker-alt"} className="mr-2 text-blue-600" />
              Direcciones
            </h3>

            {formData.direcciones.map((direccion, index) => (
              <div key={`${index}-direcciones`} className="bg-gray-50 rounded-lg p-4 mb-4 border">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                  <SelectProvinciaClient
                    name="idProvincia"
                    value={direccion.idProvincia}
                    onChange={(item) => onSelectChange(item, index)}
                  />
                  <SelectLocalidadClient
                    idProvincia={direccion.idProvincia}
                    name="idLocalidad"
                    value={direccion.idLocalidad}
                    onChange={(item) => onSelectChange(item, index)}
                  />
                  <SelectCalleClient
                    idProvincia={direccion.idProvincia}
                    idLocalidadCensal={direccion.idLocalidadCensal}
                    name={"idCalle"}
                    value={direccion.idCalle}
                    onChange={(item) => onSelectChange(item, index)}
                  />
                  <div className="relative">
                    <Input
                      name={"numeroCalle"}
                      label={"Altura"}
                      type={"number"}
                      onChange={(item) => onSelectChange(item, index)}
                      value={direccion?.numeroCalle}
                      placeholder={"Ej: 1234"}
                    />
                    {formData.direcciones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDireccionDelete(index)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors duration-200"
                        title="Eliminar dirección"
                      >
                        <Icon icono={"trash-can"} className="text-sm" />
                      </button>
                    )}
                  </div>
                </div>

                {index === formData.direcciones.length - 1 && (
                  <div className="flex justify-end border-t pt-3 mt-3">
                    <button
                      type="button"
                      onClick={handleDireccionAdd}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors duration-200"
                    >
                      <Icon icono={"plus"} className="mr-2 text-xs" />
                      Agregar dirección
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mensaje de error */}
          {error && error.msg && (
            <div className="text-red-500 text-center mb-4">
              {error.msg}
            </div>
          )}

          {/* Botones principales del formulario */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8 border-t-2 border-gray-200 bg-gray-50 -mx-6 px-6 pb-6 rounded-b-lg">
            <Button tipo="enviar" type="submit" className="flex-1 sm:flex-initial">
              <Icon icono={"save"} className="mr-2" />
              Guardar Contacto
            </Button>
            <Button
              tipo="neutro"
              loading={buscando}
              type="button"
              onClick={handleBuscar}
              className="flex-1 sm:flex-initial"
            >
              <Icon icono={"search"} className="mr-2" />
              Buscar por CUIT
            </Button>
            <Button
              tipo="borrar"
              type="reset"
              onClick={handleReset}
              className="flex-1 sm:flex-initial"
            >
              <Icon icono={"undo"} className="mr-2" />
              Limpiar Formulario
            </Button>
          </div>
        </FormCard>
      </div>
    </main>
  )
}
