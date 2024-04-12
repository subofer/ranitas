"use server"
import ListadoProductos from "@/app/components/productos/ListadoProductos"
import { CargaProductoBuscadorClient } from "@/app/components/formularios/CargaProductoBuscadorClient"
import { getCategorias } from "@/prisma/consultas/categorias"
import { getProveedores } from "@/prisma/consultas/proveedores";

const PageCargarProductos = async () => {
  const categorias = await getCategorias();
  const proveedores = await getProveedores()

  return (
    <section className="flex flex-col gap-3 max-w-[1600px] mx-auto max-h-svh pb-20 md:h-fit">
      <CargaProductoBuscadorClient categorias={categorias} proveedores={proveedores} ia={false}/>
      <div className="
        flex
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

