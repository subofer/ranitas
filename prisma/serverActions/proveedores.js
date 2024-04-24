"use server"
import formToObject from "@/lib/formToObject";
import { revalidatePath } from 'next/cache';
import { upsertContacto } from "./contactos";

const onToBoolean = (x) => x == 'on' ? true : false;

export const upsertProveedor = async (formData) => {
  console.log(formData)
  let result;
  try{
    const data = formToObject(formData)
    data.esProveedor = onToBoolean(data.esProveedor);
    data.esInterno = onToBoolean(data.esInterno);
    data.esMarca = onToBoolean(data.esMarca);
    result = await upsertContacto(data);
  } catch(e) {
    result = e;
    console.log(e)
  } finally {
    revalidatePath("/proveedores")
    return result
 }
}
