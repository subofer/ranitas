'use server'
import prisma from "../prisma";
import formToObject from "@/lib/formToObject"
import { textos } from "@/lib/manipularTextos";
import { revalidatePath } from 'next/cache'

// Las unidadess se guardaran con la primer letra en mayusculas.
export async function guardarUnidad(formData) {
  const unidadObject = formToObject(formData);
  unidadObject.nombre = textos.mayusculas.primeras(unidadObject.nombre);
  unidadObject.simbolo = textos.mayusculas.primeras(unidadObject.simbolo); // Asegúrate de ajustar esto según necesites.

  try {
    const unidad = await prisma.unidades.create({
      data: unidadObject,
    });
    revalidatePath('/unidades');
    return { error: false, msg: "Unidad guardada con éxito", unidad };
  } catch (e) {
    let msg = "Error al guardar la unidad.";
    if (e.code === "P2002") {
      msg = `Ya existe una unidad con el dato único proporcionado.`;
    }
    console.log({ error: true, msg });
    return { error: true, msg };
  }
}

export async function actualizarUnidad(id, datosActualizados) {
  try {
    const unidadActualizada = await prisma.unidades.update({
      where: { id },
      data: datosActualizados,
    });
    revalidatePath('/unidades');
    return { error: false, msg: "Unidad actualizada con éxito", unidad: unidadActualizada };
  } catch (e) {
    console.error(e);
    return { error: true, msg: "Error al actualizar la unidad." };
  }
}

export async function eliminarUnidad(id) {
  try {
    await prisma.unidades.delete({
      where: { id },
    });
    revalidatePath('/unidades');
    return { error: false, msg: "Unidad eliminada con éxito" };
  } catch (e) {
    console.error(e);
    return { error: true, msg: "Error al eliminar la unidad." };
  }
}
