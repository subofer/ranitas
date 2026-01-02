"use client"
import { useCallback } from "react";
import { copyCsvToClipBoard } from "@/lib/copyCsv";
import Button from "../formComponents/Button";
import useHotkey from "@/hooks/useHotkey";

const CopyToClipBoard = ({children, data, selector}) => {

  const handleClick = useCallback(() => {
    const dataToCopy = selector.map((id) => data.find((item) => item.id == id))
    copyCsvToClipBoard(dataToCopy)
  },[data, selector])

  useHotkey(['control','c'], null, handleClick)

  return(
    <Button onClick={handleClick} >{children}</Button>
  )
}
export default CopyToClipBoard;

