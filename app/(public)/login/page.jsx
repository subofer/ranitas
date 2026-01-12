import { Suspense } from 'react'
import Pagelogin from './pageLogin'
import { login } from '@/lib/sesion/sesion'
import { redirect } from 'next/navigation'

export default function Page({ searchParams }) {
  const goNext = typeof searchParams?.goNext === 'string' ? searchParams.goNext : '/';
  const error = searchParams?.error === '1';

  async function loginAction(formData) {
    'use server';
    const response = await login(formData);
    const next = (formData?.get('goNext') || goNext || '/').toString();

    if (response?.error) {
      redirect(`/login?goNext=${encodeURIComponent(next)}&error=1`);
    }

    redirect(next || '/');
  }

  return (
    <Suspense fallback={<div>Cargando login...</div>}>
      <Pagelogin goNext={goNext} error={error} loginAction={loginAction} />
    </Suspense>
  )
}