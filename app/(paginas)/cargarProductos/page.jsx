"use server"
import ListadoProductos from "@/app/components/productos/ListadoProductos"
import { CargaProductoBuscadorClient } from "@/app/components/formularios/CargaProductoBuscadorClient"
import { getProveedoresCompletos } from "@/prisma/consultas/proveedores";

const PageCargarProductos = async () => {
  const proveedores = await getProveedoresCompletos()

  return (
    <section className="flex flex-col gap-3 lg:max-w-[1600px] mx-auto flex-grow max-w-screen">
      <CargaProductoBuscadorClient proveedores={proveedores}/>
    </section>
  );
};
export default PageCargarProductos;

/*
      <div className="flex flex-growoverflow-hidden">
          <ListadoProductos/>
      </div>
      */