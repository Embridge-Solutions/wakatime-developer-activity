"use client";

import { useState } from "react";
import { BRAND } from "@/config/brand.config";
import { useGetThemeQuery } from "@/redux/slice/themeSlice";
import { cn } from "@/lib/utils";
import { resolveLogoSrc } from "@/utils/theme";

interface BrandLogoProps {
  /** "compact" is used in the collapsed sidebar. */
  variant?: "primary" | "compact";
  className?: string;
}

/**
 * Company logo. Resolution order:
 *   1. logo uploaded through theme settings (DB)
 *   2. `BRAND.logo[variant]` from config/brand.config.ts
 * Falls back to the config logo if the uploaded one fails to load.
 */
const BrandLogo = ({ variant = "primary", className }: BrandLogoProps) => {
  const { data: themeData } = useGetThemeQuery(undefined);
  const configSrc = BRAND.logo[variant] || BRAND.logo.primary;
  // Logo set by the admin on the Appearance page (uploaded files are served by the API)
  const uploadedSrc: string | undefined = resolveLogoSrc(themeData?.data?.logoUrl) || undefined;

  // Remember an uploaded URL that failed so we don't keep retrying it.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = uploadedSrc && uploadedSrc !== failedSrc ? uploadedSrc : configSrc;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={BRAND.logo.alt}
      draggable={false}
      onError={() => src !== configSrc && setFailedSrc(src)}
      className={cn("object-contain w-auto select-none", className)}
    />
  );
};

export default BrandLogo;
