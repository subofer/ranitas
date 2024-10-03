"use server"
import { readFileSync } from 'fs';
import prisma from '../prisma';
import { textos } from '@/lib/manipularTextos';

const cargar = {
  provincias: true,
  localidades: true,
  calles: true,
}

export default async function cargarDatos() {
  try{
    const provinciasData = JSON.parse(readFileSync(`${process.cwd()}/prisma/geoRef/provincias.json`, 'utf8'));
    console.log('Provincias totales: ', provinciasData.length)
    provinciasData.forEach(async (item) =>
      cargar.provincias && await prisma.provincias.create({
        data: {
          id: `${item.id}`,
          nombre: textos.mayusculas.primeras(item.nombre),
          nombreCompleto: item.nombre_completo,
          isoId: item.iso_id,
        }
    }));

    // Cargar y crear Localidades
    const localidadesData = JSON.parse(readFileSync(`${process.cwd()}/prisma/geoRef/localidades.json`, 'utf8'));
    console.log("localidades a cargar:", localidadesData.length)
      const pepin = localidadesData.map((({centroide, nombre}) => (centroide?.lat && centroide?.lon) ? null: nombre)).filter(Boolean)
      const indices = localidadesData.map(({nombre}, index) => pepin.includes(nombre) ? index: null).filter(Boolean)
      indices.forEach(indice => localidadesData[indice].centroide = localidadesData[indice-1].centroide)

      cargar.localidades && await prisma.localidades.createMany({
        data: localidadesData.map((item, index) => ({
          id: `${item.id}`,
          nombre: textos.mayusculas.primeras(item.nombre),
          idProvincia: item.provincia.id,
          idDepartamento: item.departamento ? item.departamento.id : null,
          idMunicipio: item.municipio ? item.municipio.id : null,
          idLocalidadCensal: item.localidad_censal.id,
          nombreLocalidadCensal: item.localidad_censal.nombre,
        })),
        skipDuplicates: true,
     });

     cargar.calles && await cargarCalles();

  }catch (e){
    console.error(e);
  }finally{
    await prisma.$disconnect();
  }
}



async function cargarCalles() {
  const callesDataJson = JSON.parse(readFileSync(`${process.cwd()}/prisma/geoRef/calles.json`, 'utf8'));
  const callesDataLarge = callesDataJson.calles
  const callesData = callesDataLarge

  console.log('Cantidad de calles a crear: ', callesData.length)
  try {
    console.log(callesData)
    const batchSize = 500;  // Definir un tamaño de lote adecuado

    for (let i = 0; i < callesData.length; i += batchSize) {
      const batch = callesData.slice(i, i + batchSize);

      try {
        await prisma.calles.createMany({
          data: batch.map(item => ({
            ...item,
            id: `${item.id}`,
            nombre: `${textos.mayusculas.primeras(item.nombre)}`
          })),
          skipDuplicates: true
        });
      } catch (error) {
        console.error(`Error procesando el lote que comienza en el índice ${i}: ${error.message}`);
        // Opcional: Guardar o procesar registros problemáticos de manera individual
        for (const item of batch) {
          try {
            await prisma.calles.create({
              data: {
                ...item
              }
            });
          } catch (innerError) {
            console.error(`Error insertando calle con ID ${item.id}: ${innerError.message}`);
            console.error(`Error insertando calle con item.nombre ${item.nombre}`);
            console.error(`Error insertando calle con idProvincia ${item.provincia.id}`);
            console.error(`Error insertando calle con idLocalidadCensal ${item.localidad_censal.id}`);
          }
        }
      }
    }

    console.log('Todos los datos de calles han sido importados exitosamente.');
    console.log('Se cargaron ', callesDataLarge.length, " calles");
  } catch (error) {
    console.error('Error general en la carga de calles:', error);
  } finally {
    await prisma.$disconnect();
  }
}