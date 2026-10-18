"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, MoveLeft, ShieldOff } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UnauthorizedAccess() {
  const router = useRouter();

  const handleGoBack = () => {
    router.back();
    setTimeout(() => router.refresh(), 100);
  };

  return (
    <div className="relative h-screen overflow-y-auto w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-white font-sans">
      {/* ── Subtle grid overlay ── */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.04]">
        <defs>
          <pattern
            id="g403"
            width="44"
            height="44"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M44 0H0v44"
              fill="none"
              stroke="#64748b"
              strokeWidth="0.8"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#g403)" />
      </svg>

      {/* ── Background blobs ── */}
      <motion.div
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 9, repeat: Infinity }}
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-100 opacity-30 blur-3xl"
      />
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 11, repeat: Infinity, delay: 3 }}
        className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-red-100 opacity-25 blur-3xl"
      />

      {/* ── Main two-column wrapper ── */}
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-12 px-8 py-16 lg:flex-row lg:items-center lg:gap-16">
        {/* ════ LEFT — Heading & Description ════ */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-1 flex-col items-center text-center lg:items-start lg:text-left gap-5"
        >
          {/* 403 badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-red-600">
            <motion.span
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="inline-block h-2 w-2 rounded-full bg-red-500"
            />
            <ShieldOff className="h-3 w-3" />
            403 — Forbidden
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <h1 className="text-5xl font-black leading-tight tracking-tight text-slate-900 md:text-6xl">
              Access
            </h1>
            <h1 className="text-5xl font-black leading-tight tracking-tight md:text-6xl">
              <span className="bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">
                Denied.
              </span>
            </h1>
          </div>

          {/* Description */}
          <p className="max-w-xs text-base leading-relaxed text-slate-500 md:text-lg">
            You don&apos;t have permission to access this resource. Please
            verify your credentials or contact your system administrator.
          </p>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-3 lg:justify-start"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-7 h-11 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-black hover:shadow-xl"
            >
              <Home className="h-4 w-4" />
              Back to Home
            </Link>
            <button
              onClick={handleGoBack}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-7 h-11 text-sm font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md"
            >
              <MoveLeft className="h-4 w-4" />
              Go Back
            </button>
          </motion.div>
        </motion.div>

        {/* ════ RIGHT — Terminal card ════ */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          className="w-full max-w-md shrink-0"
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-left font-mono text-xs text-slate-400 shadow-2xl">
            {/* Traffic-light bar */}
            <div className="mb-4 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-500" />
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span className="h-3 w-3 rounded-full bg-green-400" />
              <span className="ml-2 text-[10px] text-slate-500">
                security - bash
              </span>
            </div>

            {/* Terminal lines */}
            <div className="space-y-2">
              <div>
                <span className="text-green-400"></span>
                <span className="text-slate-500">:</span>
                <span className="text-blue-400">~$</span>{" "}
                <span className="text-slate-300">
                  check_access --user current
                </span>
              </div>
              <div className="text-yellow-400">⚡ Checking permissions...</div>
              <div>
                <span className="text-red-400">✗ ERROR</span> HTTP/1.1 403
                Forbidden
              </div>
              <div>
                <span className="text-slate-500">POLICY:</span>{" "}
                <span className="text-orange-400">INSUFFICIENT_PRIVILEGES</span>
              </div>
              {/* <div>
                <span className="text-slate-500">ENC:</span>{" "}
                <span className="text-blue-400">AES-256-GCM</span>&nbsp;
                <span className="text-slate-500">AUTH:</span>{" "}
                <span className="text-blue-400">JWT_SSO</span>
              </div> */}
              {/* <div className="flex items-center gap-1 pt-1 border-t border-slate-800 mt-2">
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-green-400"
                >
                  ▋
                </motion.span>
                <span className="text-slate-500">
                  Session logged at {new Date().toLocaleTimeString()}
                </span>
              </div> */}
            </div>
          </div>

          {/* Subtle hint below terminal */}
          <p className="mt-4 text-center text-[11px] text-slate-400 font-medium">
            This access attempt has been recorded by the system.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
