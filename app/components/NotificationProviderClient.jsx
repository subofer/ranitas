"use client"

import { NotificationProvider } from '@/context/NotificationContext'

export default function NotificationProviderClient({ children }) {
  return (
    <NotificationProvider>
      {children}
    </NotificationProvider>
  )
}
