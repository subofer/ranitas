// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {/*
  const contacto = await prisma.contacto.upsert({
    where: { id: 1},
    update:{},
    create: {
      nombre: 'Las Ranitas',
    },
  });
  console.log(contacto);
  */
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
