'use client';

import { createSlice } from '@reduxjs/toolkit';

/**
 * ─── SERVER STATUS SLICE ──────────────────────────────────────────────
 *
 * Centralized, cloud-friendly server health tracking.
 *
 * HOW IT WORKS:
 * - The baseQuery wrapper (index.ts) dispatches setServerOnline / setServerOffline
 *   after EVERY API call (dashboard, reports, auth, etc.).
 * - FETCH_ERROR / TIMEOUT_ERROR → server is unreachable → offline
 * - Any successful response or HTTP error (4xx/5xx) → server is reachable → online
 *
 * BENEFITS:
 * - Zero dedicated health-check API calls → no cloud cost
 * - Real-time detection — every user action that hits an API updates status
 * - Automatic recovery — first successful API call flips back to online
 * - Works with RTK Query's refetchOnFocus / refetchOnReconnect (setupListeners)
 */

interface ServerStatusState {
  isOnline: boolean;
  isDbOnline: boolean;
}

const initialState: ServerStatusState = {
  // Optimistic default: assume server is online until a network failure proves otherwise
  isOnline: true,
  isDbOnline: true,
};

const serverStatusSlice = createSlice({
  name: 'serverStatus',
  initialState,
  reducers: {
    setServerOnline: (state) => {
      state.isOnline = true;
    },
    setServerOffline: (state) => {
      state.isOnline = false;
    },
    setDbOnline: (state) => {
      state.isDbOnline = true;
    },
    setDbOffline: (state) => {
      state.isDbOnline = false;
    },
  },
});

export const { setServerOnline, setServerOffline, setDbOnline, setDbOffline } = serverStatusSlice.actions;
export default serverStatusSlice.reducer;
