import Image from 'next/image';
import { textos } from '@/lib/manipularTextos';
import { BotonEditarProducto } from './BotonEditarProducto';
import { BotonEliminarProducto } from './BotonEliminarProducto';
import ImagenProducto from './ImagenProducto';

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
  imagen: {
    titulo:"Img",
    size: 20,
    key:"imagen",
    Component: ImagenProducto,
    componentclassname: "mx-auto",
  },
  eliminar: {
    titulo: "",
    className: "text-center px-0",
    Component: BotonEliminarProducto,
    componentclassname: "p-0 m-0",
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