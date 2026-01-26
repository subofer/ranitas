import { NextResponse } from 'next/server'
import { DEFAULT_ADJUSTMENTS, MODES } from '@/lib/ia/constants'

function maskUrl(url) {
  try {
    const u = new URL(url)
    // Mask query params values
    const params = Array.from(u.searchParams.keys()).map(k => `${k}=*****`).join('&')
    return `${u.origin}${u.pathname}${params ? '?'+params : ''}`
  } catch (e) {
    return url.replace(/([?&]=).*/,'')
  }
}

export async function GET() {
  const dnsUrl = process.env.DNSUPDATE_URL || ''
  const dnsHost = process.env.DNSUPDATE_HOST || ''

  return NextResponse.json({
    ok: true,
    dns: {
      url: dnsUrl ? maskUrl(dnsUrl) : null,
      host: dnsHost || null
    },
    ia: {
      DEFAULT_ADJUSTMENTS,
      MODES
    },
    env: {
      nodeEnv: process.env.NODE_ENV || 'development'
    }
  })
}