import { NextResponse } from 'next/server'
import { DEFAULT_ADJUSTMENTS, MODES } from '@/lib/ia/constants'

function maskUrl(url) {
  try {
    const u = new URL(url)
    // Always hide the query string entirely to avoid leaking tokens
    return `${u.origin}${u.pathname}${u.search ? '?*****' : ''}`
  } catch (e) {
    // Fallback: cut at ? and append masked marker
    if (typeof url === 'string' && url.includes('?')) {
      return url.split('?')[0] + '?*****'
    }
    return url
  }
}

export async function GET() {
  const dnsUrl = process.env.DNSUPDATE_URL || ''
  const dnsHost = process.env.DNSUPDATE_HOST || ''

  return NextResponse.json({
    ok: true,
    dns: {
      url: dnsUrl ? maskUrl(dnsUrl) : null,
      host: dnsHost || null,
      masked: !!dnsUrl
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