"use client"

import FormTitle from "../formComponents/Title";
import Button from "../formComponents/Button";
import { useCallback, useEffect, useRef, useState } from "react";
import { buscar } from "@/app/(paginas)/proveedores/actions/handleAction";
import { guardarProveedor } from "@/prisma/serverActions/proveedores";
import Input from "../formComponents/Input";
import { getProveedorByCuit } from "@/prisma/consultas/proveedores";
import useMyParams from "@/app/hooks/useMyParams";

const inputStyle = "bg-slate-300 rounded"
const defautlFormValues = {
  cuit:'',
  nombre:'',
  telefono:'',
  email: '',
  persona: '',
  iva: '',
};

export default function CargarProveedor() {
  const { searchParams, deleteParam } = useMyParams()

  const [formData, setFormData] = useState({...defautlFormValues})
  const [buscando, setBuscando] = useState(false)
  const [cuitIngresado, setCuitIngresado] = useState(null)
  const [title, setTitle] = useState("Cargar Proveedor")
  const [condicion, setCondicion] = useState(null)

  const [error, setError] = useState({error:false})
  const formRef = useRef(null);

  const onChange = (e) => setFormData(prev => ({...prev, [e.target.name]: e.target.value}))

  const handleReset = useCallback(() => {
    deleteParam('cuit')
    setCuitIngresado(null)
    setError({error: false})
    setFormData({...defautlFormValues}) ;
  },[deleteParam])

  const handleBuscar = async () => {
    setBuscando(true)
    if(formData?.cuit){
      setError({error: true, msg: "Buscando..."})
      const personaEncontrada = await buscar(formData)
      if(!personaEncontrada?.error) {
        setFormData({...defautlFormValues, ...personaEncontrada})
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
    if(condicion == "editar") {
      setTitle("Editar Proveedor")
    }else{
      setTitle("Cargar Proveedor")
    }
  },[condicion])

  useEffect(() => {
    if(cuitIngresado){
      setCondicion("editar")
      async function completarConCuit() {
        setBuscando(true)
        const proveedorEncontrado = {...await getProveedorByCuit(cuitIngresado)}
        console.log(proveedorEncontrado)
        proveedorEncontrado.cuit !== cuitIngresado
          ? handleReset()
          : setFormData({...defautlFormValues, ...proveedorEncontrado})
        setBuscando(false)
      }
      completarConCuit();
    } else {
      setCondicion(null)
    }
  },[cuitIngresado, handleReset])

  useEffect(() => {
    if (formRef.current) {
      formRef.current.querySelectorAll('input, button').forEach(element => {
        element.disabled = buscando;
      });
    }
  },[buscando])

  return (
    <main className='grid grid-cols-1 w-full max-w-full'>
      <form
        ref={formRef}
        className={`
          max-w-[900px]
          grid
          grid-cols-11
          gap-3
          border-gray-300
          bg-gray-200
          rounded-md
          p-4
        `}
        action={guardarProveedor}
      >
        <FormTitle
          textClass={"text-2xl font-bold	text-slate-500"}
          className={`col-span-full text-center`}
        >
            {title}
        </FormTitle>

        <div className={`col-span-3  ${inputStyle}`}>
          <Input name={"cuit"} label={"Cuit"} onBlur={handleBuscar} onChange={onChange} value={formData.cuit} />
        </div>
        <div className={`col-span-8 ${inputStyle}`}>
          <Input name={"nombre"} label={"Nombre"} onChange={onChange} value={formData.nombre} />
        </div>
        <div className={`col-span-3 ${inputStyle}`}>
          <Input name={"persona"} label={"Tipo"} onChange={onChange} value={formData.persona} />
        </div>
        <div className={`col-span-5 ${inputStyle}`}>
          <Input name={"iva"} label={"Condicion ante el iva"} onChange={onChange} value={formData.iva} />
        </div>
        <div className={`col-span-5 ${inputStyle}`}>
          <Input name={"telefono"} label={"Telefono"} onChange={onChange} value={formData.telefono} />
        </div>
        <div className={`col-span-6 ${inputStyle}`}>
          <Input name={"email"} label={"E-Mail"} onChange={onChange} value={formData.email} />
        </div>
        <div className="col-span-full h-1 text-red-500">
          {error && error.msg}
        </div>
        <div className="flex py-5 col-span-full gap-5 justify-center">
          <Button type="submit">{condicion ? "Actualizar" : "Guardar"}</Button>
          <Button loading={buscando} type="button" onClick={handleBuscar}>buscar</Button>
          <Button type="reset" onClick={handleReset}>Reset</Button>
        </div>
      </form>
    </main>
  )
}
