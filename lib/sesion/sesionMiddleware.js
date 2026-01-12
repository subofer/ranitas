import { jwtVerify } from 'jose';

const secretKey = 'laClaveSecretaDelMundoMundial';
const key = new TextEncoder().encode(secretKey);

export const getSessionFromRequest = async (request) => {
  try {
    const token = request?.cookies?.get('session')?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    return payload || null;
  } catch {
    return null;
  }
};
