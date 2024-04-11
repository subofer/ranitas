"use server"
import ListadoProductos from "@/app/components/productos/ListadoProductos"
import { CargaProductoBuscadorClient } from "@/app/components/formularios/CargaProductoBuscadorClient"
import { getCategorias } from "@/prisma/consultas/categorias"
import { getProveedores } from "@/prisma/consultas/proveedores";

const PageCargarProductos = async () => {
  const categorias = await getCategorias();
  const proveedores = await getProveedores()

  return (
    <section className='flex flex-col flex-nowrap w-full lg:h-full max-h-screen gap-3 mx-auto md:h-screen lg:overflow-hidden '>
        <div className="flex relative h-fit">
          <CargaProductoBuscadorClient categorias={categorias} proveedores={proveedores} ia={false}/>
        </div>
        <div className="
          relative
          flex
          h-full
          lg:h-auto
          max-h-full
          lg:max-h-dvh
          w-full
          overflow-scroll
          overflow-x-hidden
          ">
            <ListadoProductos/>
        </div>
    </section>
  );
};
export default PageCargarProductos;
