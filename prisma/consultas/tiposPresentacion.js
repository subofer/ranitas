"use server"
import prisma from "../prisma";

export async function getTiposPresentacion() {
  try {
    return await prisma.tiposPresentacion.findMany({
      orderBy: { nombre: "asc" },
    });
  } catch (error) {
    console.error("Error al obtener tipos de presentación:", error);
    return [];
  }
}

export async function getTipoPresentacionPorId(id) {
  try {
    return await prisma.tiposPresentacion.findUnique({
      where: { id },
      include: {
        presentaciones: true,
      },
    });
  } catch (error) {
    console.error("Error al obtener tipo de presentación:", error);
    return null;
  }
}

