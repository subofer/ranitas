"use client"
import Button from '@/components/formComponents/Button'
import Input from '@/components/formComponents/Input'
import { useState } from 'react';
import Icon from '@/components/formComponents/Icon';
import useViewportHeight from '@/hooks/useViewportHeight';

export default function Pagelogin({ goNext = '/', error = false, loginAction }) {
  const [result, setResult] = useState(error ? { error: true, msg: 'Credenciales incorrectas' } : null)
  const [loading, setLoading] = useState(false)
  useViewportHeight()

  const handleOnChange = () => {
    setResult(null)
  }

  return (
    <main    
    style={{ height: 'var(--vvh)' }}
    className="
    fixed inset-0                    /* SIEMPRE del alto visible */
    flex flex-col items-center justify-center
    px-4 overflow-auto               /* scroll si falta espacio */
  "
  
  >

        <form
    action={loginAction}
    onSubmit={() => {
      setLoading(true)
      setResult(null)
    }}
    className="
    flex flex-col gap-4
    w-fit max-w-sm mx-auto
    bg-slate-400 p-4 px-10 text-center
    text-gray-900
    rounded-xl shadow-2xl
    max-h-[90dvh] overflow-y-auto   /* sigue limitado */
  "
        >
          <input type="hidden" name="goNext" value={goNext} />
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
