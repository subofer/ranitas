import {  usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export const useMyParams = () => {
  const { push } = useRouter();
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const generateParams = useCallback((constSearch = [], param) => {
    searchParams.forEach((value, key) => {
      if(key !== param) constSearch.push(`${key}=${value}`)
    })
    push(`${pathname}?${constSearch.join("&")}`)
  },[pathname, searchParams, push])

  const deleteParam = useCallback((param) => {
    generateParams([], param)
  },[generateParams])

  const addParam = useCallback((param, value) => {
    generateParams([`${param}=${value}`], param)
  },[generateParams])

  const clearParams = useCallback(() => {
    push(pathname)
  },[push, pathname])

  return {
    searchParams,
    pathname,
    clearParams,
    deleteParam,
    addParam,
  }
};

export default useMyParams;