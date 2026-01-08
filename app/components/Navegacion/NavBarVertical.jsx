import Link from "next/link";
import menuList from "./menuList";
import { forwardRef } from "react";

const MenuItem = ({href, children, ...props}) => {
  return(
    <Link href={href}>
      <li className="hover:bg-blue-600 bg-blue-500 text-white rounded-lg p-2 px-4 text-center transition-colors duration-200 shadow-sm" {...props}>
        {children}
      </li>
    </Link>
  )
}

const NavBarVertical = forwardRef((props, ref) => {
  return(
    <div className="bg-gray-50 px-3 py-4 border-r-4 border-r-blue-200 min-h-screen">
      <ul className="flex flex-col gap-3">
        {Object.keys(menuList).map((key, index) =>
          <MenuItem key={index} href={menuList[key]}>{key}</MenuItem>
        )}
      </ul>
    </div>
  )
})
NavBarVertical.displayName = "NavBar vertical"

export default NavBarVertical;