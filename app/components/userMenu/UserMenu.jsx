"use client"
import { useRouter } from 'next/navigation';
import { getSession, logout } from "@/lib/sesion/sesion";
import Icon from "../formComponents/Icon";
import { useEffect, useState } from "react";
import { textos } from '@/lib/manipularTextos';
import pantallaCompleta from '@/lib/pantallaCompleta';
import useFullScreen from '@/lib/pantallaCompleta';


const UserMenu = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [userName, setUserName] = useState("")
  const { isFullScreen, toggleFullScreen } = useFullScreen();

  const { refresh } = useRouter();

  useEffect(() => {
    const putName = async () => {
      const sesion = await getSession()
      setUserName(sesion?.user)
    }
    putName()
  },[])

  const handleLogOut = async () => {
    await logout();
    refresh()
  }

  //Se cierra a los 5 segundos.
  const showMenu = () => {
    setIsOpen((prev) => !prev)

    setTimeout(() => {
      setIsOpen(false)
    }, 5000);
  }


  const zIndexNavBar = 9999
  return (
    <div className="relative">
      <div className={`flex flex-row min-h-7 gap-2 mr-5 cursor-pointer text-white`} onClick={showMenu}>
        <span className='min-w-20'>{textos.mayusculas.primeras(userName)}</span>
        <Icon className='min-h-fit' regular icono={"user"}/>
        <Icon onClick={toggleFullScreen} className='min-h-fit' icono={`${isFullScreen ? "minimize":"maximize"}`}/>
      </div>
      <ul className={`${isOpen?"":"hidden"} absolute right-2 mt-2 bg-gray-500`} style={{ zIndex: zIndexNavBar + 2 }}>
        <li className={`bg-gray-600 px-4 py-2 mb-0.5 cursor-pointer`} style={{ zIndex: zIndexNavBar + 2 }}>
          <Icon onClick={handleLogOut} icono={"right-from-bracket"} className={"text-white"}>Salir</Icon>
        </li>
      </ul>
    </div>
  )
}

export default UserMenu;

