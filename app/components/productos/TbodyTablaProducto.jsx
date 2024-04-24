"use client"
import RenglonTablaProducto from './RenglonTablaProducto';

export const TbodyTablaProducto = ({items, columnas, seleccionados, onToggleSeleccion, ...props}) =>
  items?.map((p,i) => (
    <RenglonTablaProducto
      key={`${i}-producto-renglon`}
      item={p}
      items={items}
      ultimo={(i == (items?.length-1))}
      columnas={columnas}
      seleccionado={seleccionados.includes(p.id)}
      onToggleseleccionado={() => onToggleSeleccion(p.id)}
      {...props}
    />
))

export default TbodyTablaProducto;
