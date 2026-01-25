"use server"
import prisma from "../prisma"
import { revalidatePath } from "next/cache";

const revalidate = () => {
  revalidatePath("/contactos")
}

const incluirTodo = {
  include:{
    emails: true,
    productos: true,
    direcciones: {
      include: {
        provincia: true,
        localidad: true,
        calle: true,
      }
    }
  }
}

export const getContactos = async () => {
  return await prisma.contactos.findMany({})
}

export const getContactosCompletos = async () => (
  await prisma.contactos.findMany({
    orderBy: { nombre: 'asc' },
    ...incluirTodo,
  })
);

export const getContactoByCuit = async (cuitBuscado) => (
  await prisma.contactos.findFirst({
    where: {
      cuit: cuitBuscado,
    },
    ...incluirTodo,
  })
);


export const deleteContacto = async (idContacto) => {
  console.log('id que se quiere borrar:', idContacto)
  let result;
  try {
    result = await prisma.$transaction(async (prisma) => {
      await prisma.emails.deleteMany({where: { idContacto: idContacto }});
      await prisma.direcciones.deleteMany({where: { idContacto: idContacto }});
      return await prisma.contactos.delete({where: { id: idContacto }});
    });

  } catch (e) {
    console.error("Error al eliminar el contacto:", e);
    result = { error: true, msg: "Falló la eliminación del contacto", e:e, };
  } finally {

    return result;
  }

}


//transformar el formData antes de entregarlo
export const upsertContacto = async (data) => {

  const transformedData = {
    contacto:{
      cuit: `${data?.cuit}`.replace(/-/g, ''),
      nombre: `${data?.nombre}`,
      telefono: `${data?.telefono}`,
      persona: `${data?.persona}`,
      iva: `${data?.iva}`,
      esInterno: data?.esInterno || false,         //chequear booleano
      esProveedor: data?.esProveedor || false,         //chequear booleano
      esMarca: data?.esMarca || false,         //chequear booleano
    },
    direcciones: data.direcciones.map((d) => ({
      provincia: { connect: { id: d?.idProvincia } },
      localidad: { connect: { id: d?.idLocalidad } },
      calle: { connect: { id: d?.idCalle } },
      numeroCalle: parseInt(d?.numeroCalle),
      idLocalidadCensal:`${d?.idLocalidadCensal}`,
    })),
    emails: data?.email?.split?.(",")?.map((email) => ({email: `${email}`})) || [],
  }

  const posibleId = data?.id ? `${data?.id}` : "IDFALSO123"
  const posibleCuit = data?.id ? `${data?.cuit}`.replace(/-/g, '') : "CUITFALSO123"
  console.log('posibleId -> ', posibleId)
  console.log('posibleCuit -> ', posibleCuit)

  let result;
  try{
    result = await prisma.contactos.upsert({
      where: { id: posibleId, cuit: posibleCuit},
      update: {
        ...transformedData.contacto,
        emails: {
          deleteMany: {}, // Elimina todos los emails actuales (opcional, dependiendo de la lógica de negocio)
          create: transformedData.emails,
        },
        direcciones: {
          deleteMany: {}, // Elimina todas las direcciones actuales (opcional)
          create: transformedData.direcciones,
        }
      },
      create: {
        ...transformedData.contacto,
        emails: {
          create: transformedData.emails,
        },
        direcciones: {
          create: transformedData.direcciones,
        }
      },
      include: {
        emails: true,
        direcciones: true
      }
    });
  }catch (e){
    console.log(e)
    result = { error: true, msg: e.meta, code: e.code}
  }finally{
    console.log(result)
    revalidate()
    return result;
  }
}

/**
 * Busca contactos similares por nombre y/o CUIT
 * Útil para asociar proveedores detectados en facturas
 */
export async function buscarContactosSimilares({ nombre, cuit, esProveedor = false }) {
  try {
    const contactos = await prisma.contactos.findMany({
      where: esProveedor ? { esProveedor: true } : undefined,
      ...incluirTodo
    })

    // Función para calcular similitud de strings
    const calcularSimilitud = (str1, str2) => {
      if (!str1 || !str2) return 0
      const s1 = str1.toLowerCase().trim()
      const s2 = str2.toLowerCase().trim()
      
      // Coincidencia exacta
      if (s1 === s2) return 1.0
      
      // Incluye uno al otro
      if (s1.includes(s2) || s2.includes(s1)) return 0.8
      
      // Distancia de Levenshtein simplificada
      const words1 = s1.split(/\s+/)
      const words2 = s2.split(/\s+/)
      
      let coincidencias = 0
      for (const w1 of words1) {
        for (const w2 of words2) {
          if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
            coincidencias++
            break
          }
        }
      }
      
      return coincidencias / Math.max(words1.length, words2.length)
    }

    // Calcular similitud para cada contacto
    const contactosConSimilitud = contactos.map(contacto => {
      let similitud = 0
      
      // Si hay CUIT y coincide exactamente
      if (cuit && contacto.cuit && contacto.cuit === cuit) {
        similitud = 1.0
      } else if (nombre) {
        // Calcular similitud por nombre
        similitud = calcularSimilitud(nombre, contacto.nombre)
      }
      
      return {
        ...contacto,
        similitud
      }
    })

    // Filtrar solo los que tienen al menos 30% de similitud y ordenar
    const similares = contactosConSimilitud
      .filter(c => c.similitud >= 0.3)
      .sort((a, b) => b.similitud - a.similitud)
      .slice(0, 10) // Máximo 10 resultados

    return similares
  } catch (error) {
    console.error("Error buscando contactos similares:", error)
    return []
  }
}
