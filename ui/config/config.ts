'use client';

import { BRAND, COPYRIGHT_TEXT } from './brand.config';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:6689' ||
  'http://127.0.0.1:6689';

export const ACCESS_TOKEN_KEY =
  process.env.NEXT_PUBLIC_ACCESS_TOKEN_KEY || 'accessToken';

export const REFRESH_TOKEN_KEY =
  process.env.NEXT_PUBLIC_REFRESH_TOKEN_KEY || 'refreshToken';

export const USER_DETAILS_KEY =
  process.env.NEXT_PUBLIC_USER_DETAILS_KEY || 'userDetails';

export const REDIRECT_PATH_AFTER_LOGIN =
  process.env.NEXT_PUBLIC_REDIRECT_PATH_AFTER_LOGIN || '/dashboard';

export const TIMEOUT = Number(process.env.NEXT_PUBLIC_TIMEOUT) || 5000;


export const RETRY_ATTEMPTS =
  Number(process.env.NEXT_PUBLIC_RETRY_ATTEMPTS) || 3;

export const INACTIVE_LIMIT =
  Number(process.env.NEXT_PUBLIC_INACTIVE_LIMIT) || 10;

export const COUNTDOWN_LIMIT =
  Number(process.env.NEXT_PUBLIC_COUNTDOWN_LIMIT) || 5;


// Branding (names, logos, copyright) lives in ./brand.config.ts
export const POWERED_BY_TEXT = COPYRIGHT_TEXT;

export const APP_CONFIG = {
  API_URL,
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_DETAILS_KEY,
  REDIRECT_PATH_AFTER_LOGIN,
  TIMEOUT,
  RETRY_ATTEMPTS,
  POWERED_BY_TEXT,
  COMPANY_NAME: BRAND.company.name,
  LOGO_PATH: BRAND.logo.primary,
};
