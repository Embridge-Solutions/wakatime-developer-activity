"use client";

import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export interface UserAvatarProps {
  src?: string | null;
  firstName?: string;
  lastName?: string;
  name?: string;
  username?: string;
  email?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showTooltip?: boolean;
  fallbackType?: "initials" | "icon" | "both";
}

const sizeClasses = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
};

const iconSizeClasses = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
  xl: "w-8 h-8",
};

/**
 * Get user initials from name
 */
const getInitials = (
  firstName?: string,
  lastName?: string,
  name?: string,
  username?: string,
  email?: string,
): string => {
  // Try to get initials from firstName and lastName first
  if (firstName && lastName) {
    return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
  }

  // Try to get from full name
  if (name) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0].charAt(0).toUpperCase()}${parts[parts.length - 1].charAt(0).toUpperCase()}`;
    }
    return name.charAt(0).toUpperCase();
  }

  // Try to get from username
  if (username) {
    return username.substring(0, 2).toUpperCase();
  }

  // Try to get from email
  if (email) {
    const emailName = email.split("@")[0];
    return emailName.substring(0, 2).toUpperCase();
  }

  return "U";
};

/**
 * Get full name for display
 */
const getDisplayName = (
  firstName?: string,
  lastName?: string,
  name?: string,
  username?: string,
  email?: string,
): string => {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  if (name) {
    return name;
  }
  if (username) {
    return username;
  }
  if (email) {
    return email.split("@")[0];
  }
  return "User";
};

export function UserAvatar({
  src,
  firstName,
  lastName,
  name,
  username,
  email,
  size = "md",
  className,
  showTooltip = false,
  fallbackType = "initials",
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(firstName, lastName, name, username, email);
  const displayName = getDisplayName(
    firstName,
    lastName,
    name,
    username,
    email,
  );
  const hasImage = src && !imageError;

  // Generate a color based on the user's name/email for consistent avatar colors
  const getAvatarColor = (text: string): string => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-yellow-500",
      "bg-red-500",
      "bg-teal-500",
      "bg-orange-500",
      "bg-cyan-500",
      "text-blue-600",
      "text-emerald-600",
      "text-purple-600",
      "text-pink-600",
      "text-indigo-600",
      "text-amber-600",
      "text-rose-600",
      "text-teal-600",
      "text-orange-600",
      "text-cyan-600",
    ];
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const avatarColor = getAvatarColor(
    firstName || lastName || name || username || email || "user",
  );

  const avatarContent = () => {
    if (hasImage) {
      return (
        <img
          src={src || undefined}
          alt={displayName}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      );
    }

    if (fallbackType === "icon" || (fallbackType === "both" && !initials)) {
      return <User className={cn("text-gray-400", iconSizeClasses[size])} />;
    }

    return (
      <span className="font-semibold text-white select-none">{initials}</span>
    );
  };

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center overflow-hidden shrink-0",
        "border-2 border-gray-200",
        sizeClasses[size],
        !hasImage && avatarColor,
        className,
      )}
      title={showTooltip ? displayName : undefined}
      role="img"
      aria-label={`Avatar for ${displayName}`}
    >
      {avatarContent()}
    </div>
  );
}
