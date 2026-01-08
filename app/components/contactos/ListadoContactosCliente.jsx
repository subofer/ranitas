"use client"
import { RenglonTablaContacto } from "./RenglonTablaContacto"
import { Tabla } from "../Tablas/Tablas"

export default function ListadoContactosCliente({ columnas, contactos, ...props }) {
  return (
    <Tabla columnas={columnas} titulo={"Contactos"} {...props}>
      {contactos.map((p, i) => (
        <RenglonTablaContacto key={i} item={p} />
      ))}
    </Tabla>
  )
}
