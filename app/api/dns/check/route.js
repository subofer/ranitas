import { NextResponse } from 'next/server'
import dns from 'dns'

const dnsPromises = dns.promises

export async function GET() {
  try {
    let host = process.env.DNSUPDATE_HOST || ''
    if (!host) {
      return NextResponse.json({ ok: false, message: 'DNSUPDATE_HOST not configured in environment' }, { status: 400 })
    }

    // Normalize host: strip protocol and path if provided
    try {
      if (host.startsWith('http://') || host.startsWith('https://')) {
        const u = new URL(host)
        host = u.hostname
      }
    } catch (e) {
      // ignore, keep original host
    }

    console.log('/api/dns/check called, host resolved to', host)

    // Resolve A records (may throw if no records)
    let records = []
    try {
      records = await dnsPromises.resolve4(host)
    } catch (resolveErr) {
      console.warn('DNS resolve4 failed for host', host, resolveErr.message)
      return NextResponse.json({ ok: true, host, dnsA: [], publicIp: null, synced: false, message: 'No A records found or host invalid' })
    }

    // Get public IP of the server running this code
    const ipRes = await fetch('https://api.ipify.org?format=json')
    const ipJson = await ipRes.json()
    const publicIp = ipJson.ip

    // Check if any A record matches public IP
    const synced = records.includes(publicIp)

    return NextResponse.json({ ok: true, host, dnsA: records, publicIp, synced })
  } catch (error) {
    console.error('Error in /api/dns/check:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}