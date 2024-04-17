"use client"
import { getProvincias } from "@/prisma/geoRef/getGeoRefs";
import FilterSelect from "../formComponents/FilterSelect";
import useSelect from "@/app/hooks/useSelect";

const SelectProvinciaClient =  ({...props}) => {
  const { data: provincias } = useSelect(getProvincias)

  return (
    <FilterSelect
      options={provincias}
      valueField={"id"}
      textField={"nombre"}
      placeholder={"Elija provincia"}
      label={"Elija provincia"}
      {...props}
    />
  )
};
export default SelectProvinciaClient;
