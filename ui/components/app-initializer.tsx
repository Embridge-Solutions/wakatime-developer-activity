'use client';

import { useEffect } from 'react';
import { applyUserTheme, ThemeConfig } from '@/utils/theme';
import { useGetThemeQuery } from '@/redux/slice/themeSlice';

/**
 * Paints the logged-in user's own theme (saved in this browser), falling back
 * to the admin's default. Re-applied once the admin settings load, so a theme
 * the admin no longer allows is replaced by the default.
 */
const AppInitializer = () => {
  const { data: themeData } = useGetThemeQuery(undefined);

  useEffect(() => {
    applyUserTheme(themeData?.data as ThemeConfig | undefined);
  }, [themeData]);

  return null;
};

export default AppInitializer;
