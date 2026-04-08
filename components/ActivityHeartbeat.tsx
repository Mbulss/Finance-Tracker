"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * ActivityHeartbeat - Pings the system to update 'last_active_at' in user metadata.
 * This makes the 'Last Seen' in Admin Console reflect real engagement, not just login time.
 */
export function ActivityHeartbeat() {
  const supabase = createClient();
  const lastPingRef = useRef<number>(0);

  useEffect(() => {
    async function pingActivity() {
      // Throttle pings to once every 4 minutes to avoid rate limiting
      const now = Date.now();
      if (now - lastPingRef.current < 4 * 60 * 1000) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Update user metadata with current timestamp
      // This will be visible to admins via supabase.auth.admin.listUsers()
      await supabase.auth.updateUser({
        data: { last_active_at: new Date().toISOString() }
      });

      lastPingRef.current = now;
      console.log("Activity heartbeat sent.");
    }

    // Ping on initial load
    pingActivity();

    // Set up heartbeat every 5 minutes while the tab is open
    const interval = setInterval(pingActivity, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [supabase]);

  return null; // This component has no UI
}
