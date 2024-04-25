import { NextResponse, userAgent } from 'next/server'
import { getSession } from './lib/sesion/sesion'

export async function middleware(request) {
  const session = await getSession()
  if(session){
    return NextResponse.rewrite(request.url)
  }else{
    const goNext = request.nextUrl.pathname
    const loginUrl = new URL(`/login?goNext=${goNext}`, request.url)
    return NextResponse.redirect(loginUrl);  // Cambia '/login' por la ruta que necesites
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|auth|login|favicon.ico|robots.txt|images|$).*)',
  ],
}



/*
const { device } = userAgent(request)

const url = request.nextUrl
const { origin } = request.nextUrl

const viewport = device.type === 'mobile' ? 'mobile' : 'desktop'

const newUrl2 = new URL(`/`, request.url)
*/