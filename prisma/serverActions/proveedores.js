"use server"
import formToObject from "@/lib/formToObject";
import { revalidatePath } from 'next/cache';
import { upsertContacto } from "./contactos";


export const upsertProveedor = async (formData) => {
  console.log(formData)
  let result;
  try{
    const data = formToObject(formData)
    data.esProveedor = true;
    data.esInterno = false;
    result = await upsertContacto(data);
  } catch(e) {
    result = e;
  } finally {
    revalidatePath("/proveedores")
    return result
 }
}
