import { Suspense } from 'react'
import Pagelogin from './pageLogin'
import { login } from '@/lib/sesion/sesion'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import prisma from '@/prisma/prisma'
import { auditAction } from '@/lib/actions/audit'

export default async function Page({ searchParams }) {
  const sp = searchParams ? await searchParams : {}
  const goNext = typeof sp?.goNext === 'string' ? sp.goNext : '/';
  const error = sp?.error === '1';

  // Read client IP from headers (try X-Forwarded-For or X-Real-IP)
  const h = await headers();
  const ip = (h.get('x-forwarded-for') || h.get('x-real-ip') || h.get('x-forwarded') || 'unknown').split(',')[0].trim();

  // Check settings to see if login auditing is enabled
  let auditEnabled = false;
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'audit.login.enabled' } });
    if (setting && setting.value !== null && setting.value !== undefined) {
      // Settings.value is Json - support boolean or { enabled: true }
      const val = setting.value;
      auditEnabled = val === true || val === 'true' || val === 1 || (typeof val === 'object' && val.enabled === true);
    }
  } catch (e) {
    console.error('Error reading audit.login.enabled setting', e);
  }

  if (auditEnabled) {
    console.log(`Login page access - ip: ${ip}`);
    // fire-and-forget audit record
    auditAction({ level: 'INFO', category: 'AUTH', action: 'AUTH_LOGIN_PAGE_ACCESS', message: 'Login page accessed', metadata: { ip } }).catch(() => {})
  }

  async function loginAction(formData) {
    'use server';
    // Extract IP again server-side in the server action context
    const h = await headers();
    const ipLocal = (h.get('x-forwarded-for') || h.get('x-real-ip') || h.get('x-forwarded') || 'unknown').split(',')[0].trim();

    const response = await login(formData, { ip: ipLocal, auditEnabled });
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