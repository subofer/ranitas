import { NextResponse } from 'next/server'
import { getSessionFromRequest } from './lib/sesion/sesionMiddleware'

export async function middleware(request) {
  const session = await getSessionFromRequest(request)
  if(session){
    return NextResponse.next()
  }else{
    const goNext = request.nextUrl.pathname
    const loginUrl = new URL(`/login?goNext=${goNext}`, request.url)
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|login|favicon.ico|robots.txt|images).*)',
  ],
}
