"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Home, MoveLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFoundAnimation() {
  return (
    <div className="flex min-h-screen flex-col relative overflow-hidden items-center justify-center p-6 bg-app-canvas text-slate-900 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-4xl px-4 flex flex-col items-center relative z-10"
      >
        {/* Main 404 Illustration Area */}
        <div className="relative w-full max-w-[700px] aspect-16/10 mb-8 select-none">
          {/* Header Text Labels (Absolute positioned to match image) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="absolute top-[8%] left-[18%] z-20"
          >
            <h2 className="text-4xl md:text-5xl font-black text-slate-800 rotate-[-5deg]">
              Oops!
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="absolute top-[3%] right-[10%] z-20"
          >
            <p className="text-3xl md:text-4xl font-extrabold text-gray-900 italic tracking-tight">
              Page not found
            </p>
          </motion.div>

          <svg viewBox="0 0 800 500" className="w-full h-full drop-shadow-xl">
            <defs>
              <filter
                id="gear-shadow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feDropShadow
                  dx="0"
                  dy="2"
                  stdDeviation="2"
                  floodOpacity="0.1"
                />
              </filter>
            </defs>

            {/* --- THE LARGE 4 0 4 --- */}

            {/* Left 4 */}
            <motion.text
              initial={{ opacity: 0, x: -50 }}
              animate={{
                opacity: 1,
                x: 200,
                y: [315, 310, 315],
              }}
              transition={{
                opacity: { duration: 0.6 },
                x: { duration: 0.6 },
                y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
              }}
              y="315"
              fontSize="240"
              fontWeight="900"
              fill="#3b82f6"
              textAnchor="middle"
              className="font-sans drop-shadow-xl"
            >
              4
            </motion.text>

            {/* The Zero (Oval with Gears) */}
            <g transform="translate(400, 215)">
              <motion.path
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                d="M 0 -105 A 75 105 0 0 0 -75 0 A 75 105 0 0 0 0 105 A 75 105 0 0 0 75 0 A 75 105 0 0 0 0 -105 Z"
                fill="#3b82f6"
              />

              {/* Inner Dark Oval */}
              <path
                d="M 0 -85 A 55 85 0 0 0 -55 0 A 55 85 0 0 0 0 85 A 55 85 0 0 0 55 0 A 55 85 0 0 0 0 -85 Z"
                fill="#1e293b"
              />

              {/* Rotating Gears inside Zero */}
              {/* Sparks */}
              <motion.circle
                animate={{
                  opacity: [1, 0, 1],
                  scale: [1, 1.5, 1],
                  x: [0, 5, -2],
                  y: [0, -5, 2],
                }}
                transition={{ duration: 0.1, repeat: Infinity, repeatDelay: 3 }}
                cx="10"
                cy="-30"
                r="2"
                fill="#fbbf24"
              />
              <motion.circle
                animate={{
                  opacity: [1, 0, 1],
                  scale: [1, 1.2, 1],
                  x: [0, -3, 4],
                  y: [0, 6, -3],
                }}
                transition={{ duration: 0.1, repeat: Infinity, repeatDelay: 5 }}
                cx="-10"
                cy="10"
                r="1.5"
                fill="#fbbf24"
              />

              {/* Top Gear */}
              <motion.g
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                transform="translate(0, -35)"
              >
                <circle r="22" fill="#3b82f6" />
                <rect
                  x="-24"
                  y="-3"
                  width="48"
                  height="6"
                  fill="#3b82f6"
                  rx="2"
                />
                <rect
                  x="-3"
                  y="-24"
                  width="6"
                  height="48"
                  fill="#3b82f6"
                  rx="2"
                  transform="rotate(45)"
                />
                <rect
                  x="-3"
                  y="-24"
                  width="6"
                  height="48"
                  fill="#3b82f6"
                  rx="2"
                  transform="rotate(90)"
                />
                <rect
                  x="-3"
                  y="-24"
                  width="6"
                  height="48"
                  fill="#3b82f6"
                  rx="2"
                  transform="rotate(135)"
                />
                <circle r="10" fill="#1e293b" />
              </motion.g>

              {/* Bottom Left Gear */}
              <motion.g
                animate={{ rotate: -360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                transform="translate(-15, 20)"
              >
                <circle r="18" fill="white" />
                <rect
                  x="-20"
                  y="-3"
                  width="40"
                  height="6"
                  fill="white"
                  rx="2"
                />
                <rect
                  x="-3"
                  y="-20"
                  width="6"
                  height="40"
                  fill="white"
                  rx="2"
                  transform="rotate(60)"
                />
                <rect
                  x="-3"
                  y="-20"
                  width="6"
                  height="40"
                  fill="white"
                  rx="2"
                  transform="rotate(120)"
                />
                <circle r="8" fill="#1e293b" />
              </motion.g>

              {/* Bottom Right Gear */}
              <motion.g
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                transform="translate(18, 15)"
              >
                <circle r="15" fill="#3b82f6" />
                <rect
                  x="-17"
                  y="-2.5"
                  width="34"
                  height="5"
                  fill="#3b82f6"
                  rx="1.5"
                  transform="rotate(30)"
                />
                <rect
                  x="-17"
                  y="-2.5"
                  width="34"
                  height="5"
                  fill="#3b82f6"
                  rx="1.5"
                  transform="rotate(90)"
                />
                <rect
                  x="-17"
                  y="-2.5"
                  width="34"
                  height="5"
                  fill="#3b82f6"
                  rx="1.5"
                  transform="rotate(150)"
                />
                <circle r="6" fill="#1e293b" />
              </motion.g>
            </g>

            {/* Right 4 */}
            <motion.text
              initial={{ opacity: 0, x: 50 }}
              animate={{
                opacity: 1,
                x: 600,
                y: [315, 320, 315],
              }}
              transition={{
                opacity: { duration: 0.6 },
                x: { duration: 0.6 },
                y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
              }}
              y="315"
              fontSize="240"
              fontWeight="900"
              fill="#3b82f6"
              textAnchor="middle"
              className="font-sans drop-shadow-xl"
            >
              4
            </motion.text>
            {/* Measuring Tape lines on 4 (from image) */}
            <g stroke="rgba(0,0,0,0.1)" strokeWidth="1">
              <line x1="685" y1="180" x2="695" y2="180" />
              <line x1="685" y1="200" x2="695" y2="200" />
              <line x1="685" y1="220" x2="695" y2="220" />
              <line x1="685" y1="240" x2="695" y2="240" />
              <line x1="685" y1="260" x2="695" y2="260" />
            </g>

            {/* --- THE MALFUNCTIONING ROBOT --- */}
            <g transform="translate(300, 310)">
              {/* Sitting on ground shadow */}
              <ellipse
                cx="100"
                cy="180"
                rx="120"
                ry="10"
                fill="rgba(0,0,0,0.05)"
              />

              {/* Robot Arms/Legs (Simple lines like image) */}
              <path
                d="M 50 140 L 0 170 L -30 150"
                stroke="#111827"
                strokeWidth="12"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 150 140 L 200 170 L 230 160"
                stroke="#111827"
                strokeWidth="12"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 60 180 L 20 200 L -20 185"
                stroke="#111827"
                strokeWidth="12"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 140 180 L 180 200 L 220 185"
                stroke="#111827"
                strokeWidth="12"
                strokeLinecap="round"
                fill="none"
              />

              {/* Shoes/Hands */}
              <rect
                x="-35"
                y="145"
                width="18"
                height="12"
                rx="4"
                fill="#3b82f6"
                transform="rotate(-15, -25, 150)"
              />
              <rect
                x="225"
                y="155"
                width="18"
                height="12"
                rx="4"
                fill="#3b82f6"
                transform="rotate(15, 235, 160)"
              />

              {/* Robot Body Box */}
              <motion.rect
                animate={{ rotate: [-0.5, 0.5, -0.5] }}
                transition={{ duration: 4, repeat: Infinity }}
                x="50"
                y="80"
                width="140"
                height="110"
                rx="12"
                fill="#3b82f6"
              />
              <path
                d="M 60 85 L 60 100"
                stroke="rgba(0,0,0,0.2)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <rect
                x="65"
                y="100"
                width="110"
                height="80"
                rx="10"
                fill="#1e293b"
              />

              {/* Screen Content */}
              <motion.text
                animate={{
                  opacity: [1, 0.5, 1, 0.8, 1],
                  x: [120, 122, 118, 120],
                }}
                transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 2 }}
                x="120"
                y="135"
                textAnchor="middle"
                fill="white"
                fontWeight="900"
                fontSize="24"
                className="font-sans"
              >
                ERROR
              </motion.text>
              <path
                d="M 80 150 L 100 170 L 120 150 L 140 170 L 160 150"
                stroke="white"
                strokeWidth="3"
                fill="none"
                className="animate-pulse"
              />

              {/* Robot Head (Semi-oval) */}
              <motion.path
                animate={{ y: [-1, 1, -1] }}
                transition={{ duration: 3, repeat: Infinity }}
                d="M 70 80 Q 70 40 120 40 Q 170 40 170 80 [Z]"
                fill="#1e293b"
              />
              {/* Single Blinking Eye */}
              <rect
                x="105"
                y="55"
                width="30"
                height="20"
                rx="10"
                fill="white"
              />
              <motion.rect
                animate={{ x: [110, 125, 110], opacity: [1, 0.6, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                x="115"
                y="60"
                width="10"
                height="10"
                rx="5"
                fill="#1e293b"
              />

              {/* Antenna/Wires springs */}
              <path
                d="M 170 100 C 180 80 200 110 210 90"
                stroke="#111827"
                strokeWidth="2"
                fill="none"
              />
              <path
                d="M 30 150 C 40 130 60 160 70 140"
                stroke="#111827"
                strokeWidth="2"
                fill="none"
              />
            </g>

            {/* Loose Bolts/Nuts on ground */}
            <g transform="translate(450, 480)" stroke="#111827" strokeWidth="1">
              <motion.circle
                animate={{ rotate: 360, x: [20, 22, 20] }}
                transition={{ duration: 8, repeat: Infinity }}
                cx="20"
                cy="0"
                r="4"
                fill="none"
              />
              <motion.rect
                animate={{ rotate: [45, 55, 45] }}
                transition={{ duration: 5, repeat: Infinity }}
                x="50"
                y="-2"
                width="10"
                height="4"
                rx="1"
                fill="#111827"
                transform="rotate(45, 55, 0)"
              />
              <motion.circle
                animate={{ x: [-100, -98, -100] }}
                transition={{ duration: 10, repeat: Infinity }}
                cx="-100"
                cy="-5"
                r="3"
                fill="#111827"
              />
            </g>

            {/* Small floating circles like in image */}
            <motion.circle
              animate={{ y: [110, 120, 110], x: [500, 505, 500] }}
              transition={{ duration: 6, repeat: Infinity }}
              cx="500"
              cy="110"
              r="4"
              fill="#3b82f6"
            />
            <circle cx="240" cy="200" r="6" fill="#1e293b" opacity="0.1" />
          </svg>
        </div>

        {/* Explicit Error Message */}
        <div className="text-center mb-6 space-y-3">
          <h1 className="text-5xl md:text-6xl font-black text-slate-800 tracking-tight">
            404
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 font-semibold">
            Page Not Found
          </p>
        </div>

        {/* Action Buttons Section */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center relative z-20 mt-4">
          <Button
            asChild
            className="h-12 px-8 text-base font-bold rounded-xl shadow-lg shadow-blue-500/20 min-w-[200px]"
          >
            <Link href="/">
              <Home className="mr-2 h-5 w-5" />
              Return To Home
            </Link>
          </Button>

          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="h-12 px-8 text-base font-bold rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 min-w-[160px] shadow-sm transition-all group"
          >
            <MoveLeft className="mr-2 h-5 w-5 transition-transform group-hover:-translate-x-1" />
            Go Back
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
