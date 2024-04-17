"use client"

import { deleteProveedor } from "@/prisma/consultas/proveedores"

import Icon from "../formComponents/Icon"
import { textos } from "@/lib/manipularTextos"
import useMyParams from "@/app/hooks/useMyParams"
import { useCallback } from "react"
import { alertaBorrarProveedor } from "../alertas/alertaBorrarProveedor"
import { Td, Tr } from "../Tablas/Tablas "

const emailRenderer = (emails) => {
  return (
    <div className="flex flex-col">
      {emails.map(({email}, index) =>
        <a key={index} href={`mailto:${email}`}><span key={index}>{email}</span></a>
      )}
    </div>
  )
}


export const RenglonProveedor = ({item: proveedor}) => {
  const { addParam, recarga } = useMyParams();

  const editar = useCallback(() => {
    addParam("cuit", proveedor.cuit)
  },[addParam, proveedor.cuit])

  const handleDelete = () => {
    alertaBorrarProveedor(() => {
      deleteProveedor(proveedor?.id)
      recarga()
    })
  }

  return (
    <Tr className={"h-[60px] text-center"}>
      <Td className="w-[80px]">
        {textos.resumen(proveedor?.id)}
      </Td>
      <Td className="w-[8rem]">
        {textos.cuit(proveedor?.cuit)}
      </Td>
      <Td className="w-[250px]">
        {proveedor?.nombre}
      </Td>
      <Td className="w-[200px]">
        {emailRenderer(proveedor.emails)}
      </Td>
      <Td className="w-[170px]">
      {proveedor?.iva}
      </Td>
      <Td className="w-[170px]">
        <a href={`tel:${proveedor?.telefono}`}>{proveedor?.telefono}</a>
      </Td>


      <Td className="w-[45px]">
        <div className="flex flex-row justify-around pr-3">
          <Icon icono={"editar"} onClick={editar}/>
          <Icon icono={"eliminar"} onClick={handleDelete} />
      </div>
      </Td>
    </Tr>

  )
}
/*
{"id":"5bd4aa3a-5e08-45cb-8d04-9dc3cece2217",
"createdAt":"2024-04-16T04:55:57.484Z",
"cuit":"20316249729",
"nombre":"Villagra Facundo Ezequiel",
"telefono":"1122385810",
"persona":"Persona Fisica",
"iva":"Consumidor Final",
"interno":false,
"esProveedor":true,
"emails":[{"id":"610fae05-9675-418d-8f2e-26d420a0cb4e","email":"subofer@hotmail.com","idContacto":"5bd4aa3a-5e08-45cb-8d04-9dc3cece2217"}],
"productos":[],
"direcciones":[{"id":"b5571b67-7359-4cce-8318-747d336b127f","idContacto":"5bd4aa3a-5e08-45cb-8d04-9dc3cece2217","idProvincia":"02","idLocalidad":"0208401002","idCalle":"0208401009000","numeroCalle":2777,"piso":null,"depto":null,"detalles":null,"provincia":{"id":"02","nombre":"Ciudad Autónoma de Buenos Aires","nombreCompleto":"Ciudad Autónoma de Buenos Aires","categoria":"Ciudad Autónoma","fuente":"IGN","isoId":"AR-C","isoNombre":"Ciudad Autónoma de Buenos Aires","centroideLat":-34.6144420654301,"centroideLon":-58.4458763250916},"localidad":{"id":"0208401002","nombre":"Saavedra","fuente":"INDEC","idProvincia":"02","idDepartamento":"02084","idMunicipio":"022084","idLocalidadCensal":"02000010","nombreLocalidadCensal":"Ciudad Autónoma de Buenos Aires","categoria":"Entidad","centroideLon":-58.4863271154338,"centroideLat":-34.5548978526608},"calle":{"id":"0208401009000","nombre":"Paroissien","fuente":"INDEC","categoria":"CALLE","alturaInicioDerecha":0,"alturaInicioIzquierda":0,"alturaFinDerecha":4899,"alturaFinIzquierda":4900,"idProvincia":"02","idLocalidadCensal":"02000010"}}]}	
*/