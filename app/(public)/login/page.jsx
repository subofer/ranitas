"use client"
import Draggable from 'react-draggable'; // The default
import Button from '@/app/components/formComponents/Button'
import Input from '@/app/components/formComponents/Input'
import { redirect } from 'next/navigation';
import { login } from '@/lib/sesion/sesion'
import useMyParams from '@/app/hooks/useMyParams';
import { useState } from 'react';

export default function Pagelogin() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const { param } = useMyParams("goNext")

  const handleLogin = async (formData) => {
    setLoading(true)
    const response = await login(formData)
    setResult(response)
    if(!response.error){
      redirect(param || "/")
    }
    setTimeout(() => {
      setLoading(false)
    }, 500);
  }
  const handleOnChange = () => {
    setResult(null)
  }

  return (
    <main className='flex flex-col gap-5 container w-full max-w-full h-screen max-h-screen justify-center align-middle'>
      <Draggable>
        <form action={handleLogin} 
          className='
            flex
            flex-col 
            w-fit
            mx-auto
            bg-slate-300
            gap-4
            p-4
            px-10
            text-center
            rounded-md
            shadow-2xl
          '
        >
          <span className='text-2xl font-medium text-slate-700 mb-2'>Las Ranitas</span>
          <Input
            className={"rounded-md"}
            name={"nombre"}
            label={"Nombre de usuario"}
            error={result}
            onChange={handleOnChange}
          />
          <Input
            className={"rounded-md"}
            name={"password"}
            label={"Contraseña"}
            type={"password"}
            error={result}
            onChange={handleOnChange}
            doOnEnter
          />
          <Button
            className={"mt-3 mb-4"}
            loading={loading}
          >
            Ingresar
          </Button>
        </form>
      </Draggable>
    </main>
  )
}
