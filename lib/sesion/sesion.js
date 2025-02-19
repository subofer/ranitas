"use server"
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { expiraEn, expiraStr } from "../manipularTextos";
import { getUsuario } from "@/prisma/consultas/usuarios";

const secretKey = "laClaveSecretaDelMundoMundial";
const key = new TextEncoder().encode(secretKey);

export const encrypt = async (payload)  => (
  await new SignJWT(payload)
    .setProtectedHeader({
      alg: "HS256",
    })
    .setIssuedAt()
    .setExpirationTime(
      expiraStr(6, "dias")
    )
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

export const login = async (formData) => {
  const savedUser = await getUsuario({
    nombre: formData.get("nombre"),
    password: formData.get("password"),
  });

  if(!savedUser) {
    return {
      user: false,
      error: true,
      isAuth: false,
      msg: "Credenciales incorrectas",
    }
  }

  const expires = expiraEn(6, "dias");

  const {
    user: {
      nombre
    },
    isAuth
  } = savedUser

  const encrypted = await encrypt({
    user: nombre,
    expires,
  })

  await cookies()
  .set(
    "session",
    encrypted,
    {
      expires,
      httpOnly: true,
    }
  );

  return {
    user: nombre,
    isAuth,
  }
}

export const logout = async () => {
  let response = {error: false};
  try{
    (await cookies())
    .set(
      "session",
      "",
      {
        expires: new Date(0)
      }
    );
  } catch (e) {
    response = e
  } finally{
    return {
      response
    }
  }
}

export const getSession = async() => {
  const session = (await cookies()).get("session")?.value;

  if (!session) {
    return null;
  }

  return (
    await decrypt(session)
  )
}

/*
export const updateSession = async (request) => {
  const session = request.cookies.get("session")?.value;
  if (!session) return;

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
*/