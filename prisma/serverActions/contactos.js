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