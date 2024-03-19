"use server"
import { Tabla, Tr, Td } from '../Tablas';
import { BotonEliminarProducto } from './BotonEliminarProducto';

const columnasNames = {
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
  },
}

const obtenerValorPorRuta = (item, clave) => {
  const {key, className, titulo} = columnasNames[clave]
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
  }
};

export const RenglonTablaProducto = ({item, columnas}) => (
  <Tr>
    {
      columnas && columnas.map((col, index)=> {
        const {className, texto} = obtenerValorPorRuta(item, col)
          return (
          <Td key={index + col} className={className}>
            {texto}
            {index + 1 === columnas.length &&
              <BotonEliminarProducto className={"pl-1 pr-0"} item={item}/>
            }
          </Td>
          )
      })
    }
  </Tr>
);

const TablaListaProductos = ({productos, columnas, titulo= "Productos", ...props } = {}) => {
  const cols = columnas?.map((x) => columnasNames[x]?.titulo)
  return (
    <Tabla
      columnas={cols}
      titulo={titulo}
      {...props}
    >
      {productos && productos.length > 0 && productos.map((p,i) => (
        <RenglonTablaProducto key={i} item={p} columnas={columnas}/>
      ))}
    </Tabla>
  )
};

export default TablaListaProductos;
