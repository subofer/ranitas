"use server"
import { hashPassword, verifyPassword } from "@/lib/sesion/crypto";
import prisma from "../prisma";

export const getUsuario = async ({ nombre, password}) => {
  const usuario = await prisma.usuarios.findUnique({ where: { nombre } });
    if (!usuario) { return null }

  const { password: savedPassword, ...user } = usuario;

  const isAuth = await verifyPassword(password, savedPassword);
    if (!isAuth) { return null }

  return {
    user,
    isAuth,
  };
};


export const deleteUsuario = async (nombre) => {
  let result;
  try {
    result =  await prisma.usuarios.delete({where: { nombre: nombre }});
  } catch (e) {
    result = { error: true, msg: "Falló la eliminación del usuario", e:e, };
  } finally {
    return result;
  }
}

//transformar el formData antes de entregarlo
export const upsertUsuario = async (data) => {

  const transformedData = {
    nombre: `${data?.nombre}`,
    password: await hashPassword(`${data?.password}`),  //faltaria hasearlo y esas cosas.
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
