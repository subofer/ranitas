"use server"
import prisma from "../prisma";
import { revalidatePath } from "next/cache";
import { textos } from "@/lib/manipularTextos";

const revalidarTiposPresentacion = () => revalidatePath("/cargarProductos");

export async function guardarTipoPresentacion(formData) {
  const transformedData = {
    nombre: textos.mayusculas.primeras(formData.nombre),
    descripcion: formData.descripcion || null,
  };

  try {
    const tipoPresentacion = await prisma.tiposPresentacion.upsert({
      where: { nombre: transformedData.nombre },
      update: transformedData,
      create: transformedData,
    });

    revalidarTiposPresentacion();
    return { error: false, msg: "Tipo de presentación guardado con éxito", data: tipoPresentacion };
  } catch (error) {
    console.error("Error al guardar tipo de presentación:", error);
    let msg = "Error al procesar el tipo de presentación";
    if (error.code === "P2002") {
      msg = `Ya existe un tipo de presentación con el nombre ${transformedData.nombre}.`;
    }
    return { error: true, msg, data: null };
  }
}

export async function eliminarTipoPresentacion(id) {
  try {
    await prisma.tiposPresentacion.delete({
      where: { id },
    });
    revalidarTiposPresentacion();
    return { error: false, msg: "Tipo de presentación eliminado con éxito" };
  } catch (error) {
    console.error("Error al eliminar tipo de presentación:", error);
    return { error: true, msg: "Error al eliminar el tipo de presentación." };
  }
}

export async function obtenerTiposPresentacion() {
  try {
    const tipos = await prisma.tiposPresentacion.findMany({
      orderBy: { nombre: "asc" },
    });
    return { error: false, data: tipos };
  } catch (error) {
    console.error("Error al obtener tipos de presentación:", error);
    return { error: true, data: [] };
  }
}

export async function getTiposPresentacion() {
  return await obtenerTiposPresentacion();
}

