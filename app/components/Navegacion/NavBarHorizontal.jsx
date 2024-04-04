"use client"
import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { menuListHorizontal } from "./menuList";
import { useRouter } from "next/navigation";

const theme = {
  background: 'bg-gray-700',
  menuItem: 'bg-gray-600',
  menuItemHover: 'hover:bg-gray-500',
  menuItemActive: 'bg-gray-500',
  text: 'text-white',
};

const NavBar = () => {
  const { push } = useRouter();
  const [activeMenuIndex, setActiveMenuIndex] = useState(-1);
  const [activeSubMenuIndex, setActiveSubMenuIndex] = useState(-1);
  const lastFocusedElement = useRef(null);

  const goNext = (length, set, reset) => set((prevIndex) => (prevIndex + 1) % length) && reset;
  const goPrev = (length, set, reset) => set((prevIndex) => (prevIndex - 1 + length) % length) && reset;

  const navigate = useCallback((direction) => {
    window.addEventListener('keydown', (e) => e.preventDefault(), { once: true });
    const menuLength = menuListHorizontal.length;
    const subMenuLength = menuListHorizontal[activeMenuIndex]?.subMenu?.length || 0;
    if (direction === 'reset') {
      setActiveMenuIndex(-1); setActiveSubMenuIndex(-1);
    } else if (direction === 'ArrowRight') {
      goNext(menuLength, setActiveMenuIndex, () => setActiveSubMenuIndex(-1));
    } else if (direction === 'ArrowLeft') {
      goPrev(menuLength, setActiveMenuIndex, () => setActiveSubMenuIndex(-1));
    } else if (direction === 'ArrowDown' && subMenuLength > 0) {
      goNext(subMenuLength, setActiveSubMenuIndex);
    } else if (direction === 'ArrowUp' && subMenuLength > 0) {
      goPrev(subMenuLength, setActiveSubMenuIndex);
    }
  }, [activeMenuIndex]);

  const salir = useCallback((event, focus = true) => {
    event.preventDefault(); event.stopPropagation();
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
          setActiveMenuIndex(0);
        } else {
          salir(event)
      }} else if (activeMenuIndex !== -1) {
        if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) { navigate(event.key) }
        else if (event.key === "Escape" ) {salir(event) }
        else if (event.key === 'Enter') { go(event) }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [navigate, activeMenuIndex, activeSubMenuIndex, push, go, salir]);

  return (
    <div className={`${theme.background} px-2 py-1 w-full`} style={{ position: 'absolute', top: "0", left: "0", zIndex: '9999' }}>
      <ul className="flex gap-2">
        {menuListHorizontal.map((item, menuIndex) => (
          <li key={menuIndex}
              className={`${theme.menuItemHover} ${activeMenuIndex === menuIndex ? theme.menuItemActive : theme.menuItem} ${theme.text} p-1 px-2 text-xs cursor-pointer`}
              onClick={() => {
                setActiveMenuIndex(menuIndex);
                setActiveSubMenuIndex(-1);
                item.subMenu?.length ? navigate('ArrowDown') : window.location.href = item.href;
              }}
              style={{ position: 'relative' }}
          >
            {item.menu}
            {item.subMenu && item.subMenu.length > 0 && activeMenuIndex === menuIndex && (
              <ul className="absolute left-0 mt-1" style={{ zIndex: '9999', backgroundColor: 'var(--gray-600)' }}>
                {item.subMenu.map((subItem, subIndex) => (
                  <li key={subIndex}
                      className={`${theme.menuItemHover} ${activeSubMenuIndex === subIndex ? theme.menuItemActive : theme.menuItem} ${theme.text} px-3 py-3 cursor-pointer`}
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = subItem.href;
                      }}
                  >
                    <Link className="whitespace-nowrap p-1 " href={subItem.href}>{subItem.menu}</Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NavBar;
