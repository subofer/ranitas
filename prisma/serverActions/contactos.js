"use server"
import prisma from "../prisma"


/*
model Contactos {
  id              String    @id @default(uuid())
  createdAt       DateTime  @default(now())

  cuit            String    @unique
  nombre          String    @unique
  telefono        String    @default("0800-completar-telefono")

  persona         String?
  iva             String?
  interno         Boolean   @default(false)
  esProveedor     Boolean   @default(false)

  emails              Emails[]
  direcciones         Direcciones[]
  productos           Productos[]
  documentosEmitidos  Documentos[]  @relation("EmisorDocumento")
  documentosRecibidos Documentos[]  @relation("ReceptorDocumento")
}
*/
export const getContactos = async () => {
  return await prisma.contactos.findMany({})
}

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
    result = { error: true, msg: "Falló la eliminación del contacto" };
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
      interno: data?.interno ?? false,         //chequear booleano
      esProveedor: data?.esProveedor ?? false, //chequear booleano
    },
    direcciones: [{
      idProvincia: `${data?.idProvincia}`,
      idLocalidad:`${data?.idLocalidad}`,
      idCalle:`${data?.idCalle}`,
      numeroCalle: parseInt(data?.numeroCalle),
    }],
    emails: [
      {email: `${data?.email}`},
    ]
  }
  const posibleId = data?.id ? `${data?.id}` : "IDFALSO123"

  try{
  const result = await prisma.contactos.upsert({
    where: { id: posibleId},
    update: {
      ...transformedData.contacto,
      emails: {
        deleteMany: {}, // Elimina todos los emails actuales (opcional, dependiendo de la lógica de negocio)
        create: transformedData.emails.map(({email}) => ({
          email: email
        }))
      },
      direcciones: {
        deleteMany: {}, // Elimina todas las direcciones actuales (opcional)
        create: transformedData.direcciones.map(direccion => ({
          ...direccion
        }))
      }
    },
    create: {
      ...transformedData.contacto,
      emails: {
        create: transformedData.emails.map(({email}) => ({
          email: email
        }))
      },
      direcciones: {
        create: transformedData.direcciones.map(direccion => ({
          ...direccion
        }))
      }
    },
    include: {
      emails: true,
      direcciones: true
    }
  });
  return result;
  }catch (e){
    console.error(e)
    return { error: true, msg: e.meta, code: e.code}
  }
}