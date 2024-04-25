"use client"
import Button from '@/app/components/formComponents/Button'
import Input from '@/app/components/formComponents/Input'
import { redirect } from 'next/navigation';
import { login } from '@/lib/sesion/sesion'
import useMyParams from '@/app/hooks/useMyParams';

export default function Pagelogin() {
  const {param: goNextParam} = useMyParams("goNext")
  const handleLogin = async (formData) => {
    await login(formData)
    redirect(goNextParam || "/")
  }
 
  return (
    <main className='flex flex-col gap-5 container w-full max-w-full h-screen max-h-screen justify-center align-middle'>
      <form action={handleLogin} className='flex flex-col gap-3 w-[400px] mx-auto bg-slate-300 p-4 text-center'>
        <span className='text-2xl font-medium text-slate-700'>Ingresar</span>
        <Input
          name={"nombre"}
          label={"Nombre de usuario"}
        />
        <Input
          name={"password"}
          label={"Contraseña"}
          type={"password"}
          doOnEnter
        />
        <Button>Ingresar</Button>
      </form>
    </main>
  )
}
