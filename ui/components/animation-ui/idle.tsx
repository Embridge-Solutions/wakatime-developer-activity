"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { MonitorPlay, Moon, SearchX, FolderOpen, LucideIcon } from "lucide-react";

export interface IdleProps {
  message?: string;
  variant?: "breathing" | "floating" | "sleeping" | "empty-folder";
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
  className?: string;
}

export function Idle({
  message = "No tools found",
  variant = "floating",
  size = "md",
  icon: IconComponent,
  className,
}: IdleProps) {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-20 h-20",
    lg: "w-28 h-28",
  };

  const iconSizes = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const textClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const renderAnimation = () => {
    switch (variant) {
      case "floating": {
        const Icon = IconComponent || SearchX;
        return (
          <div className="relative flex flex-col items-center justify-center">
            {/* Custom subtle float keyframes injected purely for this component */}
            <style>
              {`
                @keyframes slow-float {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-6px); }
                }
                .animate-slow-float {
                  animation: slow-float 4s ease-in-out infinite;
                }
              `}
            </style>

            <div className={cn("relative flex items-center justify-center rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-800/30 shadow-sm animate-slow-float", sizeClasses[size])}>
              {/* Very subtle pulse behind the icon */}
              <div className="absolute inset-2 rounded-xl bg-indigo-100 dark:bg-indigo-800/20 animate-pulse opacity-50" style={{ animationDuration: "3s" }} />
              <Icon className={cn("text-indigo-400 relative z-10", iconSizes[size])} strokeWidth={1.5} />
            </div>

            {/* Shadow that shrinks and fades as the element floats up */}
            <div className="mt-4 w-2/3 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-[100%] blur-[2px] opacity-60 animate-pulse" style={{ animationDuration: "4s" }} />
          </div>
        );
      }
      case "breathing": {
        const Icon = IconComponent || MonitorPlay;
        return (
          <div className={cn("relative flex items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20", sizeClasses[size])}>
            <div className="absolute inset-0 rounded-full bg-blue-400/10 dark:bg-blue-500/10 animate-[ping_3s_ease-in-out_infinite]" />
            <div className="absolute inset-1 rounded-full border border-blue-200 dark:border-blue-800 animate-[pulse_4s_ease-in-out_infinite]" />
            <Icon className={cn("text-blue-500 relative z-10", iconSizes[size])} strokeWidth={1.5} />
          </div>
        );
      }
      case "sleeping": {
        const Icon = IconComponent || Moon;
        return (
          <div className={cn("relative flex items-center justify-center rounded-3xl bg-slate-100 dark:bg-slate-800/50", sizeClasses[size])}>
            <Icon className={cn("text-slate-400", iconSizes[size])} strokeWidth={1.5} />
            <div className="absolute -top-2 -right-2 flex flex-col items-center">
              <span className="text-slate-400 font-black text-[8px] animate-[pulse_2s_ease-in-out_infinite_0ms] opacity-60">Z</span>
              <span className="text-slate-400 font-black text-[10px] animate-[pulse_2s_ease-in-out_infinite_0.4s] opacity-70 ml-2">Z</span>
              <span className="text-slate-400 font-black text-[12px] animate-[pulse_2s_ease-in-out_infinite_0.8s] opacity-80 ml-4">Z</span>
            </div>
          </div>
        );
      }
      case "empty-folder": {
        const Icon = IconComponent || FolderOpen;
        return (
          <div className="relative flex flex-col items-center justify-center">
            <style>
              {`
                @keyframes folder-shake {
                  0%, 100% { transform: rotate(0deg); }
                  25% { transform: rotate(-8deg); }
                  75% { transform: rotate(8deg); }
                }
                .animate-folder-shake {
                  animation: folder-shake 2.5s ease-in-out infinite;
                  transform-origin: bottom center;
                }
              `}
            </style>
            <div className={cn("relative flex items-center justify-center rounded-2xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100/50 dark:border-amber-800/30 shadow-sm", sizeClasses[size])}>
              <div className="absolute inset-2 rounded-xl bg-amber-100 dark:bg-amber-800/20 animate-pulse opacity-50" style={{ animationDuration: "3s" }} />
              <Icon className={cn("text-amber-500 relative z-10 animate-folder-shake", iconSizes[size])} strokeWidth={1.5} />
            </div>
            <div className="mt-4 w-2/3 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-[100%] blur-[2px] opacity-60" />
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 opacity-90 transition-opacity duration-300 hover:opacity-100",
        className
      )}
    >
      {renderAnimation()}
      {message && (
        <p className={cn("font-medium text-slate-400 dark:text-slate-500 tracking-wide text-center", textClasses[size])}>
          {message}
        </p>
      )}
    </div>
  );
}

export default Idle;
