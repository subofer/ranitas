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



//Conversiones

export async function guardarConversion(formData) {
  const conversionObject = formToObject(formData);

  try {
    const conversion = await prisma.conversion.create({
      data: {
        factor: parseFloat(conversionObject.factor),
        origenId: conversionObject.origenId,
        destinoId: conversionObject.destinoId,
      },
    });
    return { error: false, msg: "Conversión guardada con éxito", conversion };
  } catch (e) {
    console.error(e);
    return { error: true, msg: "Error al guardar la conversión." };
  }
}

export async function obtenerUnidadesConConversiones() {
  try {
    const unidades = await prisma.unidades.findMany({
      include: {
        conversionesA: true,
        conversionesDe: true,
      },
    });
    return unidades;
  } catch (e) {
    console.error(e);
    return [];
  }
}

export async function eliminarConversion(id) {
  try {
    await prisma.conversion.delete({
      where: { id },
    });
    return { error: false, msg: "Conversión eliminada con éxito" };
  } catch (e) {
    console.error(e);
    return { error: true, msg: "Error al eliminar la conversión." };
  }
}

export async function obtenerFactorConversion(simboloOrigen, simboloDestino) {
  try {
    const conversion = await prisma.conversion.findFirst({
      where: {
        origen: {
          simbolo: simboloOrigen,
        },
        destino: {
          simbolo: simboloDestino,
        },
      },
      include: {
        origen: true, // Incluye los datos de la unidad de origen
        destino: true, // Incluye los datos de la unidad de destino
      },
    });

    if (conversion) {
      return {
        error: false,
        msg: "Factor de conversión obtenido con éxito.",
        factor: conversion.factor,
        origen: conversion.origen.nombre, // Opcional, si quieres devolver más información
        destino: conversion.destino.nombre, // Opcional, si quieres devolver más información
      };
    } else {
      return {
        error: true,
        msg: "No se encontró una conversión entre las unidades especificadas.",
      };
    }
  } catch (e) {
    console.error(e);
    return {
      error: true,
      msg: "Error al buscar el factor de conversión.",
    };
  }
}
