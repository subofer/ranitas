"use client"

import { useCallback, useEffect } from "react";
import { getCallesPorLocalidad } from "@/prisma/geoRef/getGeoRefs";
import FilterSelect from "../formComponents/FilterSelect";
import useSelect from "@/hooks/useSelect";

const SelectCalleClient = ({idProvincia, idLocalidadCensal, ...props}) => {

  const get = useCallback(async () =>
    idProvincia && idLocalidadCensal
     ? await getCallesPorLocalidad(idProvincia, idLocalidadCensal)
      : []
  ,[idLocalidadCensal, idProvincia])

  const { data: calles, busy } = useSelect(get)

  const placeholder = `Elija ${!idProvincia ? "Provincia y ":""}${!idLocalidadCensal ? "Localidad":""}${idProvincia && idLocalidadCensal ? "Calle":""}`

  return (
    <FilterSelect
      options={calles}
      valueField={"id"}
      textField={"nombre"}
      placeholder={placeholder}
      label={"Calle"}
      busy={busy}
      {...props}
    />
  )
};

export default SelectCalleClient;
