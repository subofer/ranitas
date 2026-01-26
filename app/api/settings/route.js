import { NextResponse } from 'next/server'
import prisma from '@/prisma/prisma'

export async function GET() {
  try {
    const rows = await prisma.setting.findMany()
    const settings = rows.reduce((acc, r) => { acc[r.key] = r.value; return acc }, {})

    // Include env defaults for DNS and IA if not present in DB
    const dnsUrl = process.env.DNSUPDATE_URL || null
    const dnsHost = process.env.DNSUPDATE_HOST || null

    if (!settings['dns.url'] && dnsUrl) settings['dns.url'] = dnsUrl
    if (!settings['dns.host'] && dnsHost) settings['dns.host'] = dnsHost

    // IA defaults are provided by constants via separate api (`/api/config`) but we keep settings for overrides

    return NextResponse.json({ ok: true, settings })
  } catch (e) {
    console.error('Error fetching settings', e)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { key, value } = body
    if (!key) return NextResponse.json({ ok: false, message: 'key required' }, { status: 400 })

    // Upsert setting
    const up = await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    })

    // Register audit
    await prisma.auditLog.create({
      data: {
        level: 'INFO',
        category: 'CONFIG',
        action: 'UPDATE_SETTING',
        message: `Updated setting ${key}`,
        metadata: { key, value }
      }
    })

    return NextResponse.json({ ok: true, setting: up })
  } catch (e) {
    console.error('Error updating setting', e)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}