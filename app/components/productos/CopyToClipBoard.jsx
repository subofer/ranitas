"use client"
import { useCallback, useEffect } from "react";
import { copyCsvToClipBoard } from "@/lib/copyCsv";
import Button from "../formComponents/Button";

const CopyToClipBoard = ({children, data, selector}) => {

  const handleClick = useCallback(() => {
    const dataToCopy = selector.map((id) => data.find((item) => item.id == id))
    copyCsvToClipBoard(dataToCopy)
  },[data, selector])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key === 'c') {
        event.preventDefault();
        handleClick();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClick]);


  return(
    <Button onClick={handleClick} >{children}</Button>
  )
}
export default CopyToClipBoard;

