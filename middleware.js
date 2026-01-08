import { NextResponse } from 'next/server'
import { getSession } from './lib/sesion/sesion'

export async function middleware(request) {
  const session = await getSession()
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
