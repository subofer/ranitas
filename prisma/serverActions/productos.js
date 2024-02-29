'use server'
import formToObject from "@/lib/formToObject"
import { revalidatePath } from 'next/cache'

export async function guardarProducto(formData) {
  const productObject = formToObject(formData)
  
  const categoriaId = parseInt(productObject.categoriaId);
  const precio = parseFloat(productObject.precio);

  delete productObject.categoriaId;
  delete productObject.precio;
  let response = ""
  try{
    await prisma.productos.create({
      data: {
        ...productObject,
        categoriaId,
        precios: { 
          create: [{ precio }],
        },
      }
    })
    response = "Producto guardado con exito"
  } catch(e) {
    console.log(e.code)
    console.log(e.meta)
    if(e.code == "P2002"){
      console.log(`Ya existe un producto con ${e.meta.target[0]} = ${productObject[e.meta.target[0]]}`)
    }
    
    response = (`Ya existe un producto con ${e.meta.target[0]} = ${productObject[e.meta.target[0]]}`)
  }
  revalidatePath('/productos')
  return response
}