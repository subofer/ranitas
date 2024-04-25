"use server"
import prisma from "../prisma";

export const getUsuario = async ({nombre, password}) => {

  //tendria que encriptar la contraseña y esas cosas.
  const usuarioEncontrado = await prisma.usuarios.findUnique({
    where: {
      nombre: nombre,
    }
  })
  return usuarioEncontrado
};


export const deleteUsuario = async (nombre) => {
  let result;
  try {
    result =  await prisma.usuarios.delete({where: { nombre: nombre }});
  } catch (e) {
    console.error("Error al eliminar el Usuario:", e);
    result = { error: true, msg: "Falló la eliminación del contacto", e:e, };
  } finally {
    return result;
  }
}


//transformar el formData antes de entregarlo
export const upsertUsuario = async (data) => {

  const transformedData = {
    nombre: `${data?.nombre}`,
    password: `${data?.password}`,  //faltaria hasearlo y esas cosas.
  }

  const posibleId = data?.id ? `${data?.id}` : "IDFALSO123"

  let result;
  try{
    result = await prisma.usuarios.upsert({
      where: { id: posibleId },
      update: transformedData,
      create: transformedData,
    });
  } catch (e) {
    console.log(e)
    result = { error: true, msg: e.meta, code: e.code}
  } finally {
    console.log(result)
    return result;
  }
}
