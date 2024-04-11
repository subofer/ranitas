"use server"
import prisma from "../prisma";
import formToObject from "@/lib/formToObject";
import { textos } from "@/lib/manipularTextos";
import { revalidatePath } from 'next/cache';

export async function guardarProveedor(prevState, formData) {
  const proveedorObject = formToObject(formData ? formData : prevState);
  proveedorObject.nombre = textos.mayusculas.primeras(proveedorObject.nombre);
  proveedorObject.cuit = textos.documento(proveedorObject.cuit);

  let response = "";
  try {
    // Intenta actualizar el registro si existe basado en el CUIT, de lo contrario lo crea
    const r = await prisma.proveedores.upsert({
      where: {
        cuit: proveedorObject.cuit,
      },
      update: {
        ...proveedorObject,
      },
      create: {
        ...proveedorObject,
      },
    });
    response = { r, error: false, msg: "Proveedor guardado con éxito" };
  } catch (e) {
    console.log(e)
    if (e.code === "P2002") {
      // Maneja el caso de una violación de la restricción de unicidad
      response = { error: true, msg: `Ya existe un Proveedor con cuit = ${proveedorObject.cuit}` };
    } else {
      // Maneja otros errores
      response = { error: true, msg: "Error al guardar el proveedor" };
    }
  }

  // Revalida la ruta de proveedores para asegurar que la lista esté actualizada
  try{
    revalidatePath('/proveedores');
  }catch(e){
    console.log(e)
  }

  return response;
}
