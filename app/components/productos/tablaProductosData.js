import Image from 'next/image';
import { textos } from '@/lib/manipularTextos';
import { BotonEditarProducto } from './BotonEditarProducto';
import { BotonEliminarProducto } from './BotonEliminarProducto';
import ImagenProducto from './ImagenProducto';
import useMyParams from '@/app/hooks/useMyParams';
import { eliminarProductoConPreciosPorId } from '@/prisma/serverActions/productos';
import { alertaBorrarProducto } from '../alertas/alertaBorrarProducto';
import { showImagenProducto } from './showImagenProducto';

export const tablaListaProductosColumnasNames = {
  edit: {
    titulo:"",
    Component: BotonEditarProducto,
    onClick: ({codigoBarra}) => ({action:"addParam", key:"codigoBarra", value: codigoBarra, isParams: true}),
    className:"pl-2 text-center",
    noselect: true,
  },
  codigoBarra: {
    titulo: "Codigo-Barras",
    key:"codigoBarra",
    className:"w-px px-4 text-center",
  },
  cat: {
    titulo: "Categoria",
    key:"categoria.nombre",
    className:"px-2 w-px whitespace-nowrap text-center",
    valorDefecto:"-",
  },
  nombre: {
    titulo: "Nombre",
    key:"nombre",
    className:"px-4 text-left",
  },
  desc: {
    titulo: "Descripcion",
    key: "descripcion",
    className:"px-4 text-left",
  },
  size: {
    titulo: "Tamaño",
    key:["size","unidad"],
    className:"px-2 text-center w-px whitespace-nowrap",
    decorador: textos.unidades,
  },
  precioActual: {
    titulo: "Precio",
    key: "precioActual",
    className: "px-2 pr-4 text-right w-px",
    decorador: textos.moneda,
  },
  imagen: {
    titulo:"Img",
    size: 64,
    key:"imagen",
    className: "w-fit m-1",
    Component: ImagenProducto,
    onClick: showImagenProducto,
    componentclassname: "mx-auto m-1",
    noselect: true,
  },
  eliminar: {
    titulo: "",
    className: "px-2 text-center w-px",
    Component: BotonEliminarProducto,
    componentclassname: "p-0 m-0",
    onClick: (item) => alertaBorrarProducto(item, () => eliminarProductoConPreciosPorId(item.id)),
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
