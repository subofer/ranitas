"use server"
import ListadoProductos from "@/app/components/productos/ListadoProductos"
import { CargaProductoBuscadorClient } from "@/app/components/formularios/CargaProductoBuscadorClient"


const PageCargarProductos = async () => {
  return (
      <section className="flex flex-col gap-3 lg:max-w-[1600px] mx-auto flex-grow w-full h-full">
        <CargaProductoBuscadorClient/>
        <ListadoProductos/>
      </section>
  );
};
export default PageCargarProductos;
