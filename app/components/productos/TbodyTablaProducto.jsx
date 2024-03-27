"use client"
import RenglonTablaProducto from './RenglonTablaProducto';

export const TbodyTablaProducto = ({items, columnas, seleccionados, onToggleSeleccion}) => {
  return items?.map((p,i) => (
    <RenglonTablaProducto
      key={i}
      item={p}
      columnas={columnas}
      seleccionado={seleccionados.includes(p.id)}
      onToggleseleccionado={() => onToggleSeleccion(p.id)}
    />
  ))
  };

export default TbodyTablaProducto;
