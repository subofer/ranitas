"use client"
import useHotkey from "@/hooks/useHotkey";

const SelectAllToggle = ({children, seter}) => {
  useHotkey(['control','a'], null, () => seter())

  return(
    <button onClick={seter}
      className={`
        px-1
        w-[155px]
        text-nowrap
        text-center
        drop-shadow-xl
        active:scale-95
        active:drop-shadow
        transition duration-150 ease-in-out
        ring-2
        ring-slate-300
        disabled:bg-gray-300
        disabled:cursor-not-allowed
      `}
    >
      {children}
    </button>
  )
}
export default SelectAllToggle
