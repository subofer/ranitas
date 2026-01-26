import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const url = process.env.DNSUPDATE_URL || ''
    if (!url) {
      return NextResponse.json({ ok: false, message: 'DNSUPDATE_URL not configured in environment' }, { status: 400 })
    }

    // Call the freeDNS update URL
    const res = await fetch(url, { method: 'GET' })
    const text = await res.text()

    return NextResponse.json({ ok: true, response: text })
  } catch (error) {
    console.error('Error in /api/dns/update:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}