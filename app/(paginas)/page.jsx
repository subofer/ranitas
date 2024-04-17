"use client"
import cargarDatos from "@/prisma/geoRef/createGeoRef";
import { deleteCalles } from "@/prisma/geoRef/getGeoRefs";
import { deleteContacto } from "@/prisma/serverActions/contactos";
import convert from "convert"
import { convertMany } from "convert";
import Link from "next/link"


const convertir = (de, a) => {

 const unidades = {
    imperial: ['deg' , 'sq in' , 'sq ft' , 'sq mi' , 'ac' , 'bits' , 'B' , 'KiB' , 'MiB' , 'GiB' , 'TiB' , 'PiB' , 'J' , 'lbf' , 'in' , 'ft' , 'yd' , 'mi' , 'oz' , 'lb' , 'W' , 'kW' , 'MW' , 'GW' , 'TW' , 'PW' , 'psi' , 'F' , 'fs' , 'ps' , 'ns' , 'µs' , 'ms' , 's' , 'min' , 'h' , 'd' , 'y' , 'tsp' , 'tbsp' , 'fl oz' , 'cup' , 'pt' , 'qt' , 'gal'],
    metric: ['deg' , 'mm2' , 'cm2' , 'm2' , 'km2' , 'bits' , 'B' , 'KB' , 'MB' , 'GB' , 'TB' , 'PB' , 'J' , 'N' , 'mm' , 'cm' , 'm' , 'km' , 'mg' , 'g' , 'kg' , 'W' , 'kW' , 'MW' , 'GW' , 'TW' , 'PW' , 'Pa' , 'C' , 'fs' , 'ps' , 'ns' , 'µs' , 'ms' , 's' , 'min' , 'h' , 'd' , 'y' , 'mL' , 'L'],
};

  const {value, unit} = de;

  try{
    convert(value, unit).to()
    return convertMany("1kg").to("g").toString()
    return convert(value, unit).to(a).toString()

  }catch (e) {
    console.log(String(e).includes('is not a valid unit'))
  }
}



export default function Home() {
  const fecha = new Date().toISOString().split('T')[0]
    return (
    <main className='
      flex
      flex-col
    '>
      <span>
        Inicio?
      </span>
      <form action={cargarDatos}>
        <button >Cargar GeoRef</button>

      </form>
      <form action={deleteContacto}>

        <button >borrar contacto  GeoRef</button>
      </form>
      <button onClick={() => convertir({value:2, unit: "g"}, "kaka")}>Convertir</button>
      <Link href={"/cargarProductos"}>Ir a productos</Link>
    </main>
  )
}
