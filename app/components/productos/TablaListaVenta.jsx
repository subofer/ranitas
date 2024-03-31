"use client"
import { textos } from "@/lib/manipularTextos";

import { calculosFinancieros, contarObjetosEnArray } from "@/lib/contarObjetos";
import { Tabla, Td, Tr } from "../Tablas ";

const columnasNames = {
  cantidad:{
    titulo: "Cantidad",
    key: "cantidad",
    className:"w-20 text-center",
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
    transform: textos.moneda,
  },
}

const obtenerValorPorRuta = (item, clave) => {
  const {key, className, titulo, transform} = columnasNames[clave]
  const keys = Array.isArray(key) ? key : [key];

  const texto = keys.map(subclave =>
    subclave.split('.').reduce((resultado, clave) => {
        return resultado ? resultado[clave] : undefined;
      }, item)
    ).join(" ");

  return {
    titulo,
    texto,
    className,
    transform,
  }
};

const RenglonTablaProducto = ({item, columnas}) => (
  <Tr>
    {
      columnas && columnas.map((col, index)=> {
        const {className, texto, transform} = obtenerValorPorRuta(item, col)
          return (
          <Td key={index + col} className={className}>
            {transform? transform(texto): texto}
          </Td>
          )
      })
    }
  </Tr>
);

const TablaListaVenta = ({productos, titulo, ...props } = {}) => {
  const columnas=["codigoBarra", "nombre", "cantidad", "precioActual",];
  const { total } = calculosFinancieros(productos, "precioActual", "total")
  const productosUnicosConConteo = contarObjetosEnArray(productos, "codigoBarra");

  return (
    <Tabla
      columnas={columnas.map(x => columnasNames[x].titulo)}
      titulo={`${titulo} - Total: ${textos.moneda(total)}`}
      {...props}
    >
      {productosUnicosConConteo && productosUnicosConConteo?.length > 0 && productosUnicosConConteo?.map((p,i) => (
        <RenglonTablaProducto key={i} item={p} columnas={columnas}/>
      ))}
    </Tabla>
  )
};

export default TablaListaVenta;
