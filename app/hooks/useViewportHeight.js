'use client'
import { useEffect } from 'react'

export default function useViewportHeight () {
  useEffect(() => {
    if (!('visualViewport' in window)) return

    const set = () =>
      document.documentElement.style.setProperty(
        '--vvh', `${window.visualViewport.height}px`
      )

    set()                                 // al montar
    window.visualViewport.addEventListener('resize', set)
    return () =>
      window.visualViewport.removeEventListener('resize', set)
  }, [])
}