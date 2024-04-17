"use client"

import { useCallback } from "react";
import { getCallesPorLocalidad } from "@/prisma/geoRef/getGeoRefs";
import FilterSelect from "../formComponents/FilterSelect";
import useSelect from "@/app/hooks/useSelect";

const SelectCalleClient = ({idProvincia, idLocalidad, idLocalidadCensal, ...props}) => {

  const get = useCallback(async () =>
    idLocalidad && idProvincia && idLocalidadCensal
    ? await getCallesPorLocalidad(idLocalidad, idProvincia, idLocalidadCensal)
    : []
  ,[idLocalidad, idLocalidadCensal, idProvincia])

  const { data: calles } = useSelect(get)

  const placeholder = `Elija ${!idProvincia ? "Provincia y ":""}${!idLocalidad ? "Localidad":""}${idProvincia && idLocalidad ? "Calle":""}`

  return (
    <FilterSelect
      options={calles}
      valueField={"id"}
      textField={"nombre"}
      placeholder={placeholder}
      label={"Calle"}
      {...props}
    />
  )
};

export default SelectCalleClient;
