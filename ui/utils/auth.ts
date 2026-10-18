import { APP_CONFIG } from "@/config/config";
import { jwtDecode } from "jwt-decode";

export const getAccessToken = (): string | null | undefined => {
    const accessToken = localStorage.getItem(APP_CONFIG.ACCESS_TOKEN_KEY);
    if (accessToken) return accessToken;
};

export const getRefreshToken = (): string | null | undefined => {
      const refreshToken = localStorage.getItem(APP_CONFIG.REFRESH_TOKEN_KEY);
    if (refreshToken) return refreshToken;
};

export const saveTokens = (accessToken: string, refreshToken: string): void => {
  localStorage.setItem(APP_CONFIG.ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(APP_CONFIG.REFRESH_TOKEN_KEY, refreshToken);
};

/**
 * Save access token to local storage
 * @param accessToken - Access token
 */
export const saveAccessToken = (accessToken: string): void => {
  localStorage.setItem(APP_CONFIG.ACCESS_TOKEN_KEY, accessToken);
};

/**
 * Save refresh token to local storage
 * @param refreshToken - Refresh token
 */
export const saveRefreshToken = (refreshToken: string): void => {
     localStorage.setItem(APP_CONFIG.REFRESH_TOKEN_KEY, refreshToken);

};

/**
 * Clear all authentication tokens from local storage
 */
export const clearTokens = (): void => {
    localStorage.removeItem(APP_CONFIG.ACCESS_TOKEN_KEY);
    localStorage.removeItem(APP_CONFIG.REFRESH_TOKEN_KEY);
    
};

export const decodeToken = ()=>{
  const token = localStorage.getItem(APP_CONFIG.ACCESS_TOKEN_KEY);

  if (!token) return null;
    try {
    const decoded = jwtDecode(token);
    return decoded;
  } catch (error) {
    console.error("Invalid token");
    return null;
  }
}

export const getScopesOnly = (scopes: any) => {
    const result = Object.values(
  scopes.reduce((acc: any, item:any) => {
    const [page, action] = item.scope.split("_");

    if (!acc[page]) {
      acc[page] = {
        page,
        access: [],
      };
    }

    acc[page].access.push({
      value: item.id,
      scope: action,
    });

    return acc;
  }, {})
);

return result;
}

export const getLoginUserName = ()=>{
  const user = decodeToken();
  //@ts-ignore
  return user?.firstName ;
}