"use client"

import { useEffect, useState } from "react";
import { getSession } from "@/lib/sesion/sesion";

export function useCurrentUser() {
  const [userName, setUserName] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const session = await getSession();
        setUserName(session?.user || null);
      } catch (error) {
        console.error('Error getting user:', error);
        setUserName(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  return { userName, isLoading };
}
