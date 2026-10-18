"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface LoaderProps {
  text?: string;
  size?: "sm" | "md" | "lg";
  variant?: "dots" | "wave" | "pulse";
  fullScreen?: boolean;
  className?: string;
}

export function Loader({
  text = "Loading...",
  size = "md",
  variant = "dots",
  fullScreen = false,
  className,
}: LoaderProps) {
  const textClasses = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm",
  };

  const renderAnimation = () => {
    switch (variant) {
      case "dots": {
        const sizeClasses = {
          sm: "w-2 h-2 gap-1.5",
          md: "w-3 h-3 gap-2",
          lg: "w-4 h-4 gap-2.5",
        };
        const dotSize =
          sizeClasses[size].split(" ")[0] +
          " " +
          sizeClasses[size].split(" ")[1];
        const gapSize = sizeClasses[size].split(" ")[2];
        const dotClass = cn("rounded-full animate-bounce shadow-sm", dotSize);
        return (
          <div className={cn("flex items-center justify-center", gapSize)}>
            <div
              className={cn(dotClass, "bg-emerald-500")}
              style={{ animationDelay: "0ms", animationDuration: "1s" }}
            />
            <div
              className={cn(dotClass, "bg-[#1D6FE8]")}
              style={{ animationDelay: "150ms", animationDuration: "1s" }}
            />
            <div
              className={cn(dotClass, "bg-indigo-500")}
              style={{ animationDelay: "300ms", animationDuration: "1s" }}
            />
          </div>
        );
      }
      case "wave": {
        const sizeClasses = {
          sm: "w-[4px] h-[16px] gap-1",
          md: "w-[6px] h-[28px] gap-1.5",
          lg: "w-[8px] h-[40px] gap-2",
        };
        const barSize =
          sizeClasses[size].split(" ")[0] +
          " " +
          sizeClasses[size].split(" ")[1];
        const gapSize = sizeClasses[size].split(" ")[2];
        const barClass = cn(
          "rounded-full shadow-[0_0_10px_rgba(0,0,0,0.2)] animate-music-bar origin-bottom",
          barSize,
        );
        return (
          <div className="relative flex flex-col items-center justify-center">
            <style>
              {`
                @keyframes music-bar {
                  0%, 100% { transform: scaleY(0.3); opacity: 0.5; }
                  50% { transform: scaleY(1); opacity: 1; }
                }
                .animate-music-bar {
                  animation: music-bar 2s ease-in-out infinite;
                }
              `}
            </style>
            {/* items-end ensures the bars grow upwards from the bottom */}
            <div
              className={cn(
                "flex items-end justify-center",
                gapSize,
                sizeClasses[size].split(" ")[1],
              )}
            >
              <div
                className={cn(barClass, "bg-[#1D6FE8]")}
                style={{ animationDelay: "0ms" }}
              />
              <div
                className={cn(barClass, "bg-emerald-500")}
                style={{ animationDelay: "200ms" }}
              />
              <div
                className={cn(barClass, "bg-indigo-500")}
                style={{ animationDelay: "400ms" }}
              />
              <div
                className={cn(barClass, "bg-[#1D6FE8]")}
                style={{ animationDelay: "100ms" }}
              />
              <div
                className={cn(barClass, "bg-emerald-500")}
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        );
      }
      case "pulse": {
        const sizeClasses = {
          sm: "w-6 h-6",
          md: "w-10 h-10",
          lg: "w-14 h-14",
        };
        const circleSize = sizeClasses[size];
        return (
          <div
            className={cn(
              "relative flex items-center justify-center",
              circleSize,
            )}
          >
            <div
              className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping"
              style={{ animationDuration: "1.5s" }}
            />
            <div
              className="absolute inset-0 rounded-full bg-[#1D6FE8]/30 animate-ping"
              style={{ animationDelay: "500ms", animationDuration: "1.5s" }}
            />
            <div className="relative w-1/2 h-1/2 rounded-full bg-indigo-500 shadow-lg" />
          </div>
        );
      }
      default:
        return null;
    }
  };

  const loaderContent = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2",
        className,
      )}
    >
      <div className="h-14 flex items-center justify-center">
        {renderAnimation()}
      </div>

      {text && (
        <div
          className={cn(
            "font-bold tracking-[0.2em] text-slate-500 uppercase animate-pulse",
            textClasses[size],
          )}
        >
          {text}
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-100 flex items-center justify-center bg-white/60 dark:bg-slate-950/60 backdrop-blur-md">
        {loaderContent}
      </div>
    );
  }

  return loaderContent;
}

export default Loader;
