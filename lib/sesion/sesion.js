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

export const login = async (formData, { ip = 'unknown', auditEnabled = null } = {}) => {
  // Determine if audits should be recorded (if not provided by caller)
  if (auditEnabled === null) {
    try {
      const s = await (await import('@/prisma/prisma')).default.setting.findUnique({ where: { key: 'audit.login.enabled' } });
      if (s && s.value !== null && s.value !== undefined) {
        const val = s.value;
        auditEnabled = val === true || val === 'true' || val === 1 || (typeof val === 'object' && val.enabled === true);
      } else {
        auditEnabled = false;
      }
    } catch (e) {
      console.error('Error reading audit.login.enabled setting', e);
      auditEnabled = false;
    }
  }

  const usernameAttempt = formData.get("nombre");

  const savedUser = await getUsuario({
    nombre: usernameAttempt,
    password: formData.get("password"),
  });

  // Log failed attempt
  if(!savedUser) {
    if (auditEnabled) {
      try {
        const { auditAction } = await import('@/lib/actions/audit')
        auditAction({ level: 'WARNING', action: 'AUTH_LOGIN_ATTEMPT', category: 'AUTH', message: 'Failed login attempt', metadata: { username: usernameAttempt, ip } }).catch(()=>{})
      } catch (e) {
        console.error('Error creating audit log for failed login', e)
      }
    }

    return {
      user: false,
      error: true,
      isAuth: false,
      msg: "Credenciales incorrectas",
    }
  }

  // Successful login - audit
  if (auditEnabled) {
    try {
      const { auditAction } = await import('@/lib/actions/audit')
      const userId = savedUser.user?.id || null
      auditAction({ level: 'SUCCESS', action: 'AUTH_LOGIN_ATTEMPT', category: 'AUTH', message: 'Successful login', metadata: { username: savedUser.user?.nombre || usernameAttempt, ip }, userId }).catch(()=>{})
    } catch (e) {
      console.error('Error creating audit log for successful login', e)
    }
  }

  const expires = expiraEn(6, "dias");

  const {
    user: {
      nombre
    },
    isAuth
  } = savedUser;

  const encrypted = await encrypt({
    user: nombre,
    expires,
  });

  (await cookies())
  .set(
    "session",
    encrypted,
    {
      expires,
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
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
        expires: new Date(0),
        path: '/',
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