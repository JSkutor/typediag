"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { clearStoredGuestId, getStoredGuestAuthHeaders } from "@/utils/guestUser";

export function UserSyncEffect() {
  const { isSignedIn, isLoaded } = useAuth();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || syncedRef.current) {
      return;
    }

    syncedRef.current = true;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...getStoredGuestAuthHeaders(),
    };

    fetch("/api/user/sync", {
      method: "POST",
      headers,
    })
      .then((response) => {
        if (!response.ok) {
          syncedRef.current = false;
          return;
        }

        clearStoredGuestId();
      })
      .catch(() => {
        syncedRef.current = false;
      });
  }, [isLoaded, isSignedIn]);

  return null;
}
