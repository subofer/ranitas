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
    className:"w-px text-center",
    noselect: true,
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
  nombre: {
    titulo: "Nombre",
    key:"nombre",
  },
  desc: {
    titulo: "Descripcion",
    key: "descripcion"
  },
  size: {
    titulo: "Tamaño",
    key:["size","unidad"],
    className:"text-right w-px",
    decorador: textos.unidades,
  },
  precioActual: {
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
    onClick: ( {nombre, imagen}) => {showImagenProducto(nombre, 
      `<div style="display: flex; justify-content: center; animation: float 2s ease-in-out infinite;">
        <img style="width: 320px;" src="${imagen}" alt="img"/>
      </div>
    `)},
    componentclassname: "mx-auto",
    noselect: true,
  },
  eliminar: {
    titulo: "",
    className: "text-center w-px",
    Component: BotonEliminarProducto,
    componentclassname: "p-0 m-0",
    onClick: ({id, nombre, imagen}) => alertaBorrarProducto( () => eliminarProductoConPreciosPorId(id), nombre, 
    `<div style="display: flex; justify-content: center; animation: float 2s ease-in-out infinite;">
      <img style="width: 320px;" src="${imagen}" alt="img"/>
    </div>`
    ),
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
