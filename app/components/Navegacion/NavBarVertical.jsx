import Link from "next/link";
import menuList from "./menuList";
import { forwardRef } from "react";

const MenuItem = ({href, children, ...props}) => {
  return(
    <Link href={href}>
      <li className="hover:bg-slate-500 bg-slate-400 rounded-md p-1 px-4 text-center" {...props}>
        {children}
      </li>
    </Link>
  )
}

const NavBarVertical = forwardRef((props, ref) => {
  return(
    <div className="bg-slate-300 px-2 py-2 border-r-4 border-r-slate-300">
      <ul className="flex flex-col gap-2 ">
        {Object.keys(menuList).map((key, index) => 
          <MenuItem key={index} href={menuList[key]}>{key}</MenuItem>
        )}
      </ul>
    </div>
  )
})
NavBarVertical.displayName = "NavBar vertical"

export default NavBarVertical;