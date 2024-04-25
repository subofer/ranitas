"use client"

import FormTitle from "../formComponents/Title";
import Button from "../formComponents/Button";
import { useCallback, useEffect, useRef, useState } from "react";
import { buscar } from "@/app/(paginas)/contactos/actions/handleAction";
import Input from "../formComponents/Input";
import useMyParams from "@/app/hooks/useMyParams";
import SelectProvinciaClient from "../geoRef/SelectProvinciaClient";
import SelectLocalidadClient from "../geoRef/SelectLocalidadClient";
import SelectCalleClient from "../geoRef/SelectCalleClient";
import useRenderCount from "@/app/hooks/useRenderCount";
import Switch from "../formComponents/Switch";
import { getContactoByCuit, upsertContacto } from "@/prisma/serverActions/contactos";
import Icon from "../formComponents/Icon";

const inputStyle = "bg-slate-300 rounded"
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
        setFormData({...defautlFormValues, ...personaEncontrada })
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


  useEffect(() => {
    async function completarConCuit() {
      setBuscando(true)
      const contactoEncontrado = {...await getContactoByCuit(cuitIngresado)}
      contactoEncontrado.cuit !== cuitIngresado
        ? handleReset()
        : setFormData({
          ...defautlFormValues,
          ...contactoEncontrado?.direcciones?.[0],
          ...contactoEncontrado?.direcciones?.[0]?.calle,
          ...contactoEncontrado,
          email: contactoEncontrado.emails.map(({email}) => email).join(','),
        })
      setBuscando(false)
    }

    if(cuitIngresado){
      completarConCuit();
    }
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
    <main className='grid grid-cols-1 w-full max-w-full'>
      <form
        ref={formRef}
        className={`max-w-[1200px]
          p-4 mx-auto rounded-md 
          border-gray-300 bg-slate-300
        `}
        action={handleSave}
      >
        <FormTitle textClass={"text-3xl font-bold text-slate-500"} className="col-span-full">
          <div className="flex items-center w-full">
            <div className="flex-initial">
              <Icon regular icono={"address-card"} />
            </div>
            <div className="flex-grow text-center">
              {title}
            </div>
            <div className="flex-initial invisible">
              <Icon regular icono={"address-card"} />
            </div>
          </div>
        </FormTitle>

        <div className="grid grid-cols-8 gap-3">
          <input hidden name="id" value={formData.id} readOnly/>
          <div className={`lg:col-span-2  ${inputStyle}`}>
            <Input
              name={"cuit"}
              label={"Cuit"}
              onBlur={handleBuscar}
              onChange={onChange}
              value={formData.cuit}
              placeholder={"Ingrese cuit"}
            />
          </div>
          <div className={`lg:col-span-2 ${inputStyle}`}>
            <Input
              name={"persona"}
              label={"Tipo"}
              onChange={onChange}
              value={formData.persona}
              placeholder={"Personeria juridica"}
            />
          </div>
          <div className={`lg:col-span-2 ${inputStyle}`}>
            <Input
              name={"iva"}
              label={"Condicion ante el iva"}
              onChange={onChange}
              value={formData.iva}
              placeholder={"Condicion iva"}
            />
          </div>

          <div className={`flex flex-col gap-3 lg:col-start-7 lg:col-end-9 row-start-1 row-end-4 overflow-visible`}>
            <Switch value={formData.esProveedor} onChange={onChange} name={"esProveedor"} label={"Es Proveedor"}></Switch>
            <Switch value={formData.esInterno} onChange={onChange} name={"esInterno"} label={"Es Interno"}></Switch>
            <Switch value={formData.esMarca} onChange={onChange} name={"esMarca"} label={"Es Marca"}></Switch>
          </div>

          <div className={`lg:col-span-3 ${inputStyle}`}>
            <Input
              name={"nombre"}
              label={"Nombre"}
              onChange={onChange}
              value={formData.nombre}
              placeholder={"El nombre se carga automaticamente"}
            />
          </div>

          <div className={`lg:col-span-3 ${inputStyle}`}>
            <Input
              name={"telefono"}
              label={"Telefono"}
              onChange={onChange}
              value={formData.telefono}
              placeholder={"Sin puntos ni guiones"}
            />
          </div>
          <div className={`lg:col-span-6 ${inputStyle}`}>
            <Input
              name={"email"}
              label={"E-Mails"}
              onChange={onChange}
              value={formData.email}
              placeholder={"Correro@electron.ico"}
            />
          </div>

          <div className="p-3 flex flex-col lg:col-span-full gap-4 bg-slate-400 pr-4">
            <span className="text-2xl">Direcciones:</span>
          {formData.direcciones.map((direccion, index) => {
            return(
              <div key={`${index}-direcciones`} className="grid grid-cols-8 gap-2 lg:col-span-full bg-slate-400">
                <div className={`lg:col-span-3 ${inputStyle}`}>
                  <SelectProvinciaClient
                    name="idProvincia"
                    value={direccion.idProvincia}
                    onChange={(item) => onSelectChange(item, index)}
                  />
                </div>
                <div className={`lg:col-span-2 ${inputStyle}`}>
                  <SelectLocalidadClient
                    idProvincia={direccion.idProvincia}
                    name="idLocalidad"
                    value={direccion.idLocalidad}
                    onChange={(item) => onSelectChange(item, index)}
                  />
                </div>
                <div className={`lg:col-span-2 ${inputStyle}`}>
                  <SelectCalleClient
                    idProvincia={direccion.idProvincia}
                    idLocalidadCensal={direccion.idLocalidadCensal}
                    name={"idCalle"}
                    value={direccion.idCalle}
                    onChange={(item) => onSelectChange(item, index)}
                  />
                </div>
                <div className={`flex flex-row lg:col-span-1 ${inputStyle}`}>
                  <Input
                    name={"numeroCalle"}
                    label={"Numero"}
                    type={"number"}
                    onChange={(item) => onSelectChange(item, index)}
                    value={direccion?.numeroCalle}
                    placeholder={"Ingrese numeracion"}
                  />
                  <Icon
                    className={`px-2`}
                    type="button"
                    disabled={formData.direcciones.length == 1}
                    onClick={() => handleDireccionDelete(index)}
                    icono={"trash-can"}/>
                </div>
                <div className={`lg:col-span-full flex justify-end  pr-3`}>
                  <Icon
                      className={`${index == formData.direcciones.length - 1 ? "pt-2" :"hidden"}`}
                      type="button"
                      onClick={handleDireccionAdd}
                      icono={"add"}> Agregar direccion </Icon>
                </div>
              </div>
            )
          })}
          </div>

          <div className="lg:col-span-full h-1 text-red-500">
            {error && error.msg}
          </div>
        </div>
        <div className="flex py-3 lg:col-span-full gap-10 justify-center">
          <Button type="submit">Guardar</Button>
          <Button loading={buscando} type="button" onClick={handleBuscar}>buscar</Button>
          <Button type="reset" onClick={handleReset}>Reset</Button>
        </div>
      </form>
    </main>
  )
}
