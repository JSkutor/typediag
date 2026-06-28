"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import posthog from "posthog-js";
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
      .then(async (response) => {
        if (!response.ok) {
          syncedRef.current = false;
          return;
        }

        const data = await response.json();
        if (data.userId) {
          posthog.identify(data.userId);
        }
        clearStoredGuestId();
      })
      .catch(() => {
        syncedRef.current = false;
      });
  }, [isLoaded, isSignedIn]);

  return null;
}
