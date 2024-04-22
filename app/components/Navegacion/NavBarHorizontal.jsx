"use client"
import React, { useEffect, useState, useRef, useCallback, forwardRef } from "react";
import Link from "next/link";
import { menuListHorizontal } from "./menuList";
import { useRouter } from "next/navigation";

const theme = {
  background: 'bg-gray-800',
  menuItem: 'bg-gray-700',
  menuItemHover: 'hover:bg-gray-500',
  menuItemActive: 'bg-gray-500',
  text: 'text-white',
};
const zIndexNavBar = 9998;

const NavBarHorizontal = forwardRef((props, ref) => {
  const { push } = useRouter();
  const [activeMenuIndex, setActiveMenuIndex] = useState(-1);
  const [activeSubMenuIndex, setActiveSubMenuIndex] = useState(-1);

  const [isNavActive, setIsNavActive] = useState(false); // Nuevo estado para controlar la activación del menú
  const lastFocusedElement = useRef(null);

  const goNext = (length, set) => set((prevIndex) => (prevIndex + 1) % length);
  const goPrev = (length, set) => set((prevIndex) => (prevIndex - 1 + length) % length);

  const navigate = useCallback((direction) => {
    window.addEventListener('keydown', (e) => e.preventDefault(), { once: true });
    const menuLength = menuListHorizontal.length;
    const subMenuLength = menuListHorizontal[activeMenuIndex]?.subMenu?.length || 0;
    if (direction === 'reset') {
      setActiveMenuIndex(-1); setActiveSubMenuIndex(-1);
    } else if (direction === 'ArrowRight') {
      setActiveSubMenuIndex(0)
      goNext(menuLength, setActiveMenuIndex);
    } else if (direction === 'ArrowLeft') {
      setActiveSubMenuIndex(0)
      goPrev(menuLength, setActiveMenuIndex);
    } else if (direction === 'ArrowDown' && subMenuLength > 0) {
      goNext(subMenuLength, setActiveSubMenuIndex);
    } else if (direction === 'ArrowUp' && subMenuLength > 0) {
      activeSubMenuIndex == -1
        ? setActiveSubMenuIndex(subMenuLength - 1)
        :goPrev(subMenuLength, setActiveSubMenuIndex)
    }
  }, [activeMenuIndex, activeSubMenuIndex]);

  const salir = useCallback((event, focus = true) => {
    event?.preventDefault(); event.stopPropagation();
    setIsNavActive(false)
    focus && lastFocusedElement.current?.focus();
    navigate('reset');
  },[navigate])

  const go = useCallback((event) => {
    const { href: menuHref, subMenu } = menuListHorizontal?.[activeMenuIndex];
    const subMenuHref = subMenu?.[activeSubMenuIndex]?.href
    push(subMenuHref || menuHref || "" )
    salir(event, false);
  },[activeMenuIndex, activeSubMenuIndex, push, salir])


  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Alt') {
        if (activeMenuIndex === -1) {
          lastFocusedElement.current = document.activeElement;
          setIsNavActive(true)
          setActiveMenuIndex(0);
        } else {
          salir(event)
        }} else if (activeMenuIndex !== -1 && isNavActive) {
          if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) { navigate(event.key) }
          else if (event.key === "Escape" ) { salir(event) }
          else if (event.key === 'Enter') { go(event) }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [activeMenuIndex, go, isNavActive, navigate, salir]);

  return (
    <div
      style={{ zIndex: zIndexNavBar }}
      className={`${theme.background}
        px-2 py-1 min-w-full w-full text-2xl lg:text-xl mb-2
    `}>
      <ul className="flex flex-row flex-wrap gap-0.5" >
        {menuListHorizontal.map(({menu, subMenu, href}, menuIndex) => (
          <li key={menuIndex}
              className={`
                ${theme.menuItemHover}
                ${activeMenuIndex === menuIndex ? theme.menuItemActive : theme.menuItem}
                ${theme.text}
                px-4
                relative
                w-fit
                cursor-pointer
              `}
              onClick={() => {
                setActiveMenuIndex(menuIndex);
                setActiveSubMenuIndex(-1);
                subMenu?.length ? navigate('ArrowDown') :push(href);
              }}
              style={{ zIndex: zIndexNavBar + 1 }}
          >
            <span>{menu}</span>
            {subMenu && subMenu?.length > 0 && activeMenuIndex === menuIndex && (
              <ul className="absolute left-0 mt-2 bg-gray-500" style={{ zIndex: zIndexNavBar + 2 }}>
                {subMenu?.map(({menu, href}, subIndex) => (
                  <li key={subIndex}
                      className={`
                        ${theme.menuItemHover}
                        ${activeSubMenuIndex === subIndex ? theme.menuItemActive : theme.menuItem}
                        ${theme.text}
                        bg-gray-600
                        px-4
                        py-2
                        mb-0.5
                        cursor-pointer
                      `}
                      onClick={(e)=> {push(href); salir(e)}}
                      style={{ zIndex: zIndexNavBar + 2 }}
                  >
                    <Link className="whitespace-nowrap" href={href}>
                      {menu}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
});
NavBarHorizontal.displayName = "NavBarHorizontal"
export default NavBarHorizontal;
