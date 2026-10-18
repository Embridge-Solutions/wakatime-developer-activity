/**
 * Server-side configuration
 * This file is used by middleware and other server-side code
 * DO NOT add 'use client' directive here
 */

// Server-side constants (can be used in middleware)
export const REDIRECT_PATH_AFTER_LOGIN = '/start';
export const LOGIN_PATH = '/login';

// These can be overridden by environment variables if needed
export const getServerConfig = () => {
  return {
    REDIRECT_PATH_AFTER_LOGIN: process.env.NEXT_PUBLIC_REDIRECT_PATH_AFTER_LOGIN || REDIRECT_PATH_AFTER_LOGIN,
    LOGIN_PATH: process.env.NEXT_PUBLIC_LOGIN_PATH || LOGIN_PATH,
  };
};
