"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Search, Database, Terminal } from "lucide-react";
import { Button } from "../ui/button";

export interface TableNoDataProps {
  title?: string;
  description?: string;
  onReset?: () => void;
  className?: string;
}

/**
 * A specialized, high-fidelity "No Data" component for Tables.
 * Optimized for contained spaces (table rows) with a premium 'Tech-Scan' aesthetic.
 */
export function TableNoData({
  title = "No Results Found",
  description = "",
  onReset,
  className,
}: TableNoDataProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-8 px-6 w-full animate-in fade-in zoom-in-95 duration-700",
        className,
      )}
    >
      <div className="relative w-full max-w-[180px] aspect-square flex items-center justify-center select-none group">
        {/* Ambient Depth Layers */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-visible">
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 6, repeat: Infinity }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-teal-500/10 rounded-full blur-[60px]"
          />

          {/* Floating Data Particles */}
          <div className="absolute inset-0 opacity-40">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                style={{
                  left: `${15 + Math.random() * 70}%`,
                  top: `${15 + Math.random() * 70}%`,
                }}
                animate={{
                  y: [0, -20, 0],
                  opacity: [0.3, 0.7, 0.3],
                }}
                transition={{
                  duration: 3 + Math.random() * 3,
                  repeat: Infinity,
                  delay: i * 0.4,
                }}
                className="absolute"
              >
                {i % 2 === 0 ? (
                  <Database className="w-2.5 h-2.5 text-teal-400" />
                ) : (
                  <Terminal className="w-2.5 h-2.5 text-cyan-400" />
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Main Illustration - Digital Magnifier */}
        <svg
          viewBox="0 0 400 400"
          className="w-full h-full relative z-10 drop-shadow-[0_15px_30px_rgba(0,0,0,0.1)]"
        >
          <defs>
            <linearGradient id="scanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0" />
              <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
            </linearGradient>
            <filter id="glow-soft">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Radar Circles */}
          {[1, 0.7, 0.4].map((scale, i) => (
            <motion.circle
              key={i}
              cx="200"
              cy="180"
              r={150 * scale}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1"
              strokeDasharray="4 6"
              className="opacity-20 dark:opacity-30"
              animate={{ rotate: 360 }}
              transition={{
                duration: 15 + i * 5,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}

          {/* Scanning Beam */}
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            className="origin-[200px_180px]"
          >
            <path
              d="M 200 180 L 350 180 A 150 150 0 0 0 306 74 Z"
              fill="url(#scanGrad)"
            />
            <line
              x1="200"
              y1="180"
              x2="350"
              y2="180"
              stroke="#14b8a6"
              strokeWidth="2"
              strokeLinecap="round"
              filter="url(#glow-soft)"
            />
          </motion.g>

          {/* Magnifier Body */}
          <motion.g
            animate={{ y: [-3, 3, -3], rotate: [-1, 1, -1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Handle */}
            <rect
              x="260"
              y="260"
              width="20"
              height="100"
              rx="10"
              transform="rotate(-45 260 260)"
              fill="#1e293b"
            />
            {/* Outer Ring */}
            <circle
              cx="200"
              cy="180"
              r="100"
              fill="#0f172a"
              stroke="#334155"
              strokeWidth="6"
            />
            {/* Inner Lens */}
            <circle cx="200" cy="180" r="85" fill="#f8fafc" />

            {/* Search Icon Silhouette */}
            <Search className="text-slate-200 w-24 h-24 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

            {/* Lens Reflection */}
            <path
              d="M 140 140 Q 180 120 220 140"
              fill="none"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.6"
            />
          </motion.g>

          {/* "Null" Result Bits */}
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <text
              x="175"
              y="195"
              fill="#ef4444"
              fontSize="40"
              fontWeight="900"
              className="font-mono"
            >
              ?
            </text>
          </motion.g>
        </svg>
      </div>

      <div className="mt-4 text-center space-y-2.5 max-w-[280px] mx-auto">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-[9px] font-black uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          No Matches
        </div>

        <h3 className="text-lg font-black dark:text-white tracking-tighter uppercase">
          {title}
        </h3>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
          {description}
        </p>

        {onReset && (
          <Button
            variant="outline"
            onClick={onReset}
            className="mt-3 h-8 px-5 rounded-lg border-2 border-slate-200 dark:border-slate-800 font-bold hover:bg-slate-50 dark:hover:bg-slate-900 transition-all hover:scale-105 active:scale-95 text-[10px] uppercase tracking-widest flex items-center gap-2 mx-auto"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Filters
          </Button>
        )}
      </div>
    </div>
  );
}

// Dummy Icon to avoid import issues if RotateCcw is missing
function RotateCcw({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

export default TableNoData;
