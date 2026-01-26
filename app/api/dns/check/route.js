import { NextResponse } from 'next/server'
import dns from 'dns'

const dnsPromises = dns.promises

export async function GET() {
  try {
    const host = process.env.DNSUPDATE_HOST || ''
    if (!host) {
      return NextResponse.json({ ok: false, message: 'DNSUPDATE_HOST not configured in environment' }, { status: 400 })
    }

    // Resolve A records
    const records = await dnsPromises.resolve4(host)

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