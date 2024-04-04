"use server"
import ListadoProductos from "@/app/components/productos/ListadoProductos"
import { CargaProductoBuscadorClient } from "@/app/components/formularios/CargaProductoBuscadorClient"
import { getCategorias } from "@/prisma/consultas/categorias"

const PageCargarProductos = async () => {
  const categorias = await getCategorias();

  return (
    <main className='flex flex-col gap-4 h-full overflow-hidden'>
      <CargaProductoBuscadorClient categorias={categorias} ia={false}/>
      <ListadoProductos/>
    </main>
  );
};
export default PageCargarProductos;
