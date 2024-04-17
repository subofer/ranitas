"use client"

import { getLocalidadesPorProvincia } from "@/prisma/geoRef/getGeoRefs";
import FilterSelect from "../formComponents/FilterSelect";
import useSelect from "@/app/hooks/useSelect";
import { useCallback } from "react";

const SelectLocalidadClient = ({idProvincia, ...props}) => {

  const get = useCallback(async () =>
    await getLocalidadesPorProvincia(idProvincia)
  ,[idProvincia])

  const { data: localidades } = useSelect(get)

  return (
    <FilterSelect
      options={localidades}
      valueField={"id"}
      textField={"nombre"}
      placeholder={idProvincia ? "Elija Localidad":"Elija provincia"}
      label={"Localidad"}
      {...props}
    />
  )
};

export default SelectLocalidadClient;
