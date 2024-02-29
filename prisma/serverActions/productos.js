'use server'
import formToObject from "@/lib/formToObject"
import { revalidatePath } from 'next/cache'
export async function guardarProducto(formData) {
  const productObject = formToObject(formData)
  
  const categoriaId = parseInt(productObject.categoriaId);
  const precio = parseFloat(productObject.precio);

  delete productObject.categoriaId;
  delete productObject.precio;
  
  await prisma.productos.create({
    data: {
      ...productObject,
      categoriaId,
      precios: { 
        create: [{ precio }],
      },
    }
  })
  
  revalidatePath('/productos')
  
}