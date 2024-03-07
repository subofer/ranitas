'use server'
import prisma from "../prisma";
import formToObject from "@/lib/formToObject"
import { revalidatePath } from 'next/cache'

export async function guardarCategoria(formData) {
  const productObject = formToObject(formData)

  delete productObject.filterSelect;

  let response = ""
  try{
    await prisma.categorias.create({
      data: {
        ...productObject,
      }
    })
    response = {meta:e.meta, error: false, msg:"Categoria guardada con exito"}
  } catch(e) {
    console.log(e.code)
    console.log(e.meta)
    if(e.code == "P2002"){
      response = { meta: e.meta, error:true, msg:`Ya existe una categoria con ${e.meta.target[0]} = ${productObject[e.meta.target[0]]}`}
      console.log(response)
    }

  }
  revalidatePath('/productos')
  return response
}