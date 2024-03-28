import Image from 'next/image';
import { textos } from '@/lib/manipularTextos';
import { BotonEditarProducto } from './BotonEditarProducto';
import { BotonEliminarProducto } from './BotonEliminarProducto';
import ImagenProducto from './ImagenProducto';
import useMyParams from '@/app/hooks/useMyParams';
import { eliminarProductoConPreciosPorId } from '@/prisma/serverActions/productos';

export const tablaListaProductosColumnasNames = {
  edit:{
    titulo:"",
    Component: BotonEditarProducto,
    onClick: ({codigoBarra}) => ({action:"addParam", key:"codigoBarra", value: codigoBarra, isParams: true}),
    className:"w-px text-center",
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
    className:"text-right w-px",
    decorador: textos.unidades,
},
  precioActual:{
    titulo: "Precio",
    key: "precioActual",
    className: "text-right w-px",
    decorador: textos.moneda,
  },
  imagen: {
    titulo:"Img",
    size: 28,
    key:"imagen",
    Component: ImagenProducto,
    componentclassname: "mx-auto",
  },
  eliminar: {
    titulo: "",
    className: "text-center w-px",
    Component: BotonEliminarProducto,
    componentclassname: "p-0 m-0",
    onClick: ({id}) => eliminarProductoConPreciosPorId(id),
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
