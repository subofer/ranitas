"use server"
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { expiraEn, expiraStr, tiempo } from "../manipularTextos";
import { getUsuario } from "@/prisma/consultas/usuarios";

const secretKey = "laClaveSecretaDelMundoMundial";
const key = new TextEncoder().encode(secretKey);

export const encrypt = async (payload)  => (
  await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiraStr(6, "dias"))
    .sign(key)
)

export const decrypt = async (input) => {
  try{
    const { payload } = await jwtVerify(input, key, {
      algorithms: ["HS256"],
    });
    return payload;
  }catch(e){
    console.log(e)
  }
}

export const login = async(formData) => {
  const credenciales = { nombre: formData.get("nombre"), password: formData.get("password") };

  const user = await getUsuario(credenciales);
  const isAuth = user && user.password == credenciales.password

  const expires = expiraEn(6, "dias")
  const session = await encrypt({ user: credenciales.nombre, expires });

  if(isAuth){
    cookies().set("session", session, { expires, httpOnly: true });
  }
}

export const logout = async () => {
  let response = {error: false};
  try{
    cookies().set("session", "", { expires: new Date(0) });
  } catch (e) {
    response = e
  } finally{
    return {
      response
    }
  }
}

export const getSession = async() => {
  const session = cookies().get("session")?.value;
  if (!session) return null;
  return await decrypt(session);
}

export const updateSession = async (request) => {
  const session = request.cookies.get("session")?.value;
  if (!session) return;

  // Refresh the session so it doesn't expire
  const parsed = await decrypt(session);
  parsed.expires = new Date(Date.now() + 10 * 1000);
  const res = NextResponse.next();
  res.cookies.set({
    name: "session",
    value: await encrypt(parsed),
    httpOnly: true,
    expires: parsed.expires,
  });
  return res;
}