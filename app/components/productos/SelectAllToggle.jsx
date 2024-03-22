"use client"
import { useEffect } from "react";
import Button from "../formComponents/Button";

const SelectAllToggle = ({children, seter}) => {
  const handleClick = () => {
    seter();
  }
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key === 'a') {
        event.preventDefault();
        seter();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [seter]);

  return(
    <Button onClick={handleClick} >{children}</Button>
  )
}
export default SelectAllToggle
