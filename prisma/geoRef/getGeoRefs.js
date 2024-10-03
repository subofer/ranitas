"use server"
import prisma from "../prisma";

export const getProvincias = async () => (
  await prisma.provincias.findMany({orderBy: [{nombre: 'asc'}]})
);

export const getLocalidadesPorProvincia = async (idProvincia) => {
  return await prisma.localidades.findMany({
    where: {
      idProvincia: idProvincia
    },
    orderBy: {
      nombre: 'asc'
    }
  });
};

export const getCallesPorLocalidad = async (idProvincia, idLocalidadCensal) => {
  return await prisma.calles.findMany({
    where: {
      idProvincia: idProvincia,
      idLocalidadCensal: idLocalidadCensal,
    },
    orderBy: {
      nombre: 'asc'
    }
  });
};

export const deleteCallesa = async () => {
  console.log('Iniciando borrado de calles');

  try {
    // Obtener las calles a borrar
    const calles = await prisma.calles.findMany({});

    // Transacción para borrar todas las calles obtenidas
    const transaction = calles.map(calle => {
      return prisma.calles.delete({
        where: { id: calle.id },
      });
    });

    const results = await prisma.$transaction(transaction);
    results.forEach((result, index) => {
      console.log('Borrado:', calles[index].id, 'nombre:', calles[index].nombre);
    });

    console.log('Todas las calles han sido borradas exitosamente');
  } catch (error) {
    console.error('Error borrando calles:', error);
  }
}

export const deleteCalles = async () => {
  let  idsCalles, calles;
  try {
    do {
      // Recupera los IDs de las calles en lotes de 32766

      calles = await prisma.calles.findMany({ take: 32766 });
      idsCalles = calles.map(({ id }) => id);
      if (idsCalles.length === 0) {
        console.log('No hay más calles para borrar.');
        break;
      }
      const result = await prisma.calles.deleteMany({
        where: { id: { in: idsCalles } }
      });
      console.log(`Se borraron ${result.count} calles en este lote.`);
      const count = await prisma.calles.count();
      console.log(`Calles restantes: ${count}`);
    } while (idsCalles.length > 0);
    await prisma.localidades.deleteMany();
    await prisma.provincias.deleteMany();
    console.log('Proceso completado. Todas las calles han sido borradas.');
  } catch (error) {
    console.error('Error durante el proceso de borrado de calles:', error);
  }
}
