"use client"
import Button from '@/app/components/formComponents/Button'
import Input from '@/app/components/formComponents/Input'
import { redirect } from 'next/navigation';
import { login } from '@/lib/sesion/sesion'
import useMyParams from '@/app/hooks/useMyParams';
import { useState } from 'react';
import Icon from '@/app/components/formComponents/Icon';

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
    <main className='flex flex-col container w-full max-w-full h-screen max-h-screen justify-center align-middle'>

        <form action={handleLogin}
          className='
            flex
            flex-col
            w-fit
            mx-auto
            bg-slate-400
            gap-4
            p-4
            px-10
            text-center
            rounded-xl
            shadow-2xl
          '
        >
          <div className='flex flex-row justify-center w-full'>
            <Icon icono={"frog"} className={`${loading?"":"hidden"} absolute top-6 left-3 text-3xl`}/>
            <span className='text-2xl font-medium text-slate-700 mt-2 mb-3'>Las Ranitas</span>
            <Icon icono={"frog"} className={`${loading?"":"hidden"} absolute top-6 right-3 text-3xl`}/>
          </div>
          <Input
            className={`rounded-md shadow-md ${result?.error?"shadow-red-900":"shadow-slate-700"}`}
            name={"nombre"}
            label={"Nombre de usuario"}
            error={result}
            onChange={handleOnChange}
          />
          <Input
            className={`rounded-md shadow-md ${result?.error?"shadow-red-900":"shadow-slate-700"}`}
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

    </main>
  )
}
