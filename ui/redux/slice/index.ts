// src/redux/api/baseApi.ts
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getRefreshToken, saveAccessToken, clearTokens } from "@/utils/auth";
import { APP_CONFIG } from "@/config/config";
import { setServerOnline, setServerOffline, setDbOnline, setDbOffline } from "./serverStatusSlice";


const rawBaseQuery = fetchBaseQuery({
  baseUrl: APP_CONFIG.API_URL,
  credentials: "include",
});

let isProbing = false;
async function probeHealth(dispatch: any) {
  if (isProbing) return;
  isProbing = true;
  try {
    const response = await fetch(`${APP_CONFIG.API_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      if (data.database === 'healthy') {
        dispatch(setServerOnline());
        dispatch(setDbOnline());
      } else {
        dispatch(setServerOnline());
        dispatch(setDbOffline());
      }
    } else {
      const data = await response.json().catch(() => ({}));
      if (data.database === 'unhealthy') {
        dispatch(setServerOnline());
        dispatch(setDbOffline());
      } else {
        dispatch(setServerOffline());
      }
    }
  } catch (err) {
    dispatch(setServerOffline());
  } finally {
    isProbing = false;
  }
}

//@ts-ignore
const baseQuery = async (args: any, api: any, extraOptions: any) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  // ── Server status detection (from every API call) ─────────────────
  // FETCH_ERROR / TIMEOUT_ERROR = network unreachable = server offline
  // Any HTTP response (even 4xx/5xx) = server is reachable = online
  if (
    result.error &&
    (result.error.status === "FETCH_ERROR" ||
      result.error.status === "TIMEOUT_ERROR")
  ) {
    api.dispatch(setServerOffline());
    return result;
  } else {
    api.dispatch(setServerOnline());
  }

  // If access token expired (401 = Unauthorized)
  if (result.error?.status === 401) {
    console.warn("Access token expired. Trying refresh...");

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      console.error("Refresh token missing.");

      clearTokens();
      return result;
    }

    // Call refresh token API
    const refreshResult = await rawBaseQuery(
      {
        url: "/auth/refresh",
        method: "POST",
        body: { refreshToken },
      },
      api,
      extraOptions,
    );

    // //Refresh successful → save new access token
    //@ts-ignore
    if (refreshResult.data?.accessToken) {
      //@ts-ignore
      saveAccessToken(refreshResult.data.accessToken);

      // Retry original request
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      console.error("Refresh failed. Logging out...");
      clearTokens();
    }
  }

  if (
    result.error &&
    (result.error.status === "FETCH_ERROR" ||
      result.error.status === "TIMEOUT_ERROR")
  ) {
    api.dispatch(setServerOffline());
    probeHealth(api.dispatch);
    return result;
  } else if (result.error && result.error.status === 500) {
    probeHealth(api.dispatch);
  } else {
    api.dispatch(setServerOnline());
    api.dispatch(setDbOnline());
  }

  // Check for refreshed token in headers (from silent refresh in middleware)
  const refreshedToken = result.meta?.response?.headers.get("x-access-token");
  if (refreshedToken) {
    saveAccessToken(refreshedToken);
  }

  if (result?.data) {
    return result;
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: "baseApi",
  baseQuery,
  tagTypes: ["Auth", "Role", "Scope", "User", "Theme", "Developer", "Sync", "Activity", "Team", "Mail", "Security"],
  endpoints: () => ({}),
});
