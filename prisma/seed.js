import prisma from './prisma.js';
import { hashPassword } from '../lib/sesion/crypto.js';

const seedUsuarios = async () => {
  const data = [
    { nombre: 'subofer', password: '1234' },
  ];

  for (const item of data) {
    const hashedPassword = await hashPassword(item.password);

    const newUser = {
      nombre: item.nombre,
      password: hashedPassword,
    };

    try {
      await prisma.usuarios.create({
        data: newUser,
      });
      console.log(`Usuario ${item.nombre} creado.`);
    } catch (error) {
      console.error(`Error al crear el usuario ${item.nombre}:`, error);
    }
  }

  await prisma.$disconnect();
};

await seedUsuarios();
