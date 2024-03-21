import { textos } from '@/lib/manipularTextos';
import { BotonEditarProducto } from './BotonEditarProducto';
import { BotonEliminarProducto } from './BotonEliminarProducto';

export const tablaListaProductosColumnasNames = {
  edit:{
    titulo:"",
    Component: BotonEditarProducto,
  },
  cat: {
    titulo: "Categoria",
    key:"categoria.nombre",
    className:"w-40 text-center",
  },
  codigoBarra: {
    titulo: "Codigo de Barras",
    key:"codigoBarra",
    className:"w-40 text-center",
  },
  nombre:{
    titulo: "Nombre",
    key:"nombre",
  },
  desc:{
    titulo: "Descripcion",
    key: "descripcion"
  },
  size:{
    titulo: "Tamaño",
    key:["size","unidad"],
    className:"flex justify-end w-auto",
},
  precioActual:{
    titulo: "Ultimo Precio",
    key: "precioActual",
    className: "text-right px-2",
    decorador: textos.moneda,
  },
  eliminar:{
    titulo: "",
    className: "text-center px-0",
    Component: BotonEliminarProducto,
  },
}