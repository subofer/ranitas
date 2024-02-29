// app/api/factura/route.js
import { NextResponse } from 'next/server';

export async function POST(req) {
  if (req.method === 'POST') {
    // Método no soportado
    return NextResponse.json({ message: 'Método no permitido' }, { status: 405 });
  }  
  try {
    // Suponiendo que la factura viene en el cuerpo de la solicitud
    const factura = await req.json();
    console.log('Factura recibida:', factura);

    // Aquí agregarías la lógica para procesar la factura
    // Por ejemplo, enviarla a AFIP, etc.

    return NextResponse.json({ message: 'Factura procesada', factura }, { status: 200 });
  } catch (error) {
    // Manejar posibles errores
    return NextResponse.json({ message: 'Error al procesar la factura' }, { status: 500 });
  }
}

export async function GET(req) {
  if (req.method !== 'GET') {
    // Método no soportado
    return NextResponse.json({ message: 'Método no permitido' }, { status: 405 });
  }
  return NextResponse.json({ message: 'Api server runing' }, { status: 200 });
}
