import { textos } from '@/lib/manipularTextos';
import { BotonEditarProducto } from './BotonEditarProducto';
import { BotonEliminarProducto } from './BotonEliminarProducto';
import ImagenProducto from './ImagenProducto';
import { eliminarProductoConPreciosPorId } from '@/prisma/serverActions/productos';
import { alertaBorrarProducto } from '../alertas/alertaBorrarProducto';
import { showImagenProducto } from './showImagenProducto';
import Counter from '../formComponents/Counter';


export const tablaListaProductosColumnasNames = {
  edit: {
    titulo:"",
    Component: BotonEditarProducto,
    onClick: ({codigoBarra}) => ({action:"addParam", key:"codigoBarra", value: codigoBarra, isParams: true}),
    className:"text-center",
    noselect: true,
    colw: "w-[25px]"
  },
  codigoBarra: {
    titulo: "Codigo",
    key:"codigoBarra",
    className:"text-center px-2",
    colw: "w-px",
  },
  cat: {
    titulo: "Categoria",
    key:"categoria.nombre",
    className:"whitespace-nowrap text-center px-2",
    valorDefecto:"-",
    ordenable: true,
    colw: "w-px",
  },
  nombre: {
    titulo: "Nombre",
    key:"nombre",
    className:"whitespace-nowrap px-2 text-left",
    colw:"w-px",
    ordenable: true,
  },
  desc: {
    titulo: "Descripcion",
    key: "descripcion",
    className:"px-2 text-left",
    ordenable: true,
  },
  size: {
    titulo: "Tamaño",
    key:["size","unidad"],
    className:"px-2 text-center whitespace-nowrap",
    colw: "w-px",
    decorador: textos.unidades,
  },
  precioActual: {
    titulo: "Precio",
    key: "precioActual",
    className: "px-4 text-right",
    decorador: textos.monedaDecimales,
    ordenable: true,
    colw: "w-px",
  },
  precioTotal: {
    titulo: "Precio",
    key: "sumaVenta",
    className: "px-2 pr-4 text-right w-px",
    decorador: textos.moneda,
    ordenable: true,
    colw: "w-px",
  },
  cantidad: {
    titulo: "Cantidad",
    key: "cantidad",
    Component: Counter,
    className: "px-2 pr-4 text-right w-px",
    ordenable: true,
    noselect: true,
  },
  stock: {
    titulo: "Stock",
    key: "stock",
    valueKey: 'stock',
    Component: Counter,
    className: "px-1 pr-4 text-center",
    colw: "w-px",
    ordenable: true,
    noselect: true,
  },
  imagen: {
    titulo:"Img",
    size: 70,
    key:"imagen",
    className: "flex justify-center p-0 w-auto my-1",
    Component: ImagenProducto,
    onClick: showImagenProducto,
    componentClassname: "mx-0 self-center cursor-zoom-in",
    colw:"w-[70px] min-w-[70px]",
    noselect: true,
  },
  eliminar: {
    titulo: "",
    className: "px-2 text-center w-px",
    Component: BotonEliminarProducto,
    componentClassname: "p-0 m-0",
    onClick: (item) => alertaBorrarProducto(item, () => eliminarProductoConPreciosPorId(item.id)),
    noselect: true,
    colw:"w-px",
  },
  eliminarLocal: {
    titulo: "",
    className: "px-2 text-center w-px",
    Component: BotonEliminarProducto,
    onClick: (item, items) => {
      const index = items.findIndex(({id}) => item.id == id)
      items[index].cantidad = items[index].cantidad - 1
      return{
        isParams: true,
        action: "recarga",
      }
    },
    componentClassname: "p-0 m-0",
    noselect: true,
  },
}

export const obtenerValorPorRuta = (item, clave) => {
  const {key, decorador, ...resto} = tablaListaProductosColumnasNames[clave]
  const keys = Array.isArray(key) ? key : [key];
  const texto = keys?.map(subclave =>
    subclave?.split('.')?.reduce((resultado, clave) => {
        return resultado ? resultado[clave] : undefined;
      }, item)
    ).join(" ");

  return {
    texto,
    decorador: decorador ? decorador : (a) => a,
    ...resto
  }
};
