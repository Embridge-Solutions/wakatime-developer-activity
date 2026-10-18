'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  RefreshCcw,
  Home,
  MonitorX,
  ShieldAlert,
  Activity,
  FileJson,
} from 'lucide-react';
import { Button } from '../ui/button';
import Link from 'next/link';
import { motion } from 'framer-motion';

export interface ErrorAnimationProps {
  message?: string;
  error?: any;
  onRetry?: () => void;
  isCenter?: boolean;
  fullScreen?: boolean;
  className?: string;
}

const TERMINAL_LINES = [
  { text: 'INITIALIZING_SYSTEM_RECOVERY...', type: 'info' },
  { text: 'SCANNING_VIRTUAL_DOM_INTEGRITY...', type: 'info' },
  { text: 'CRITICAL_EXCEPTION_DETECTED', type: 'error' },
  { text: 'DUMPING_MEMORY_STACK_0x4F92...', type: 'warn' },
  { text: 'KERNEL_PANIC: ANALYSIS_ENGINE_OFFLINE', type: 'error' },
  { text: 'ATTEMPTING_SOCKET_RECALIBRATION...', type: 'info' },
];

export function ErrorAnimation({
  message,
  error,
  onRetry,
  isCenter = true,
  fullScreen = true,
  className,
}: ErrorAnimationProps) {
  const [terminalIndex, setTerminalIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTerminalIndex((prev) => (prev + 1) % TERMINAL_LINES.length);
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  const errorContent = (
    <div
      className={cn(
        'relative flex flex-col lg:flex-row items-center justify-center overflow-hidden transition-all duration-700 animate-in fade-in zoom-in-95',
        fullScreen
          ? 'fixed inset-0 z-100 w-full h-screen bg-white dark:bg-slate-950 p-8 lg:p-24 gap-12 lg:gap-24'
          : cn(
              'bg-transparent p-4 lg:p-8 w-full gap-8 lg:gap-20',
              isCenter ? 'min-h-[400px] max-w-6xl mx-auto' : 'h-full',
            ),
        className,
      )}>
      {/* --- BACKGROUND DECOR --- */}
      <div className='absolute top-0 right-0 w-[40%] h-[40%] bg-rose-500/5 rounded-full blur-[120px] animate-pulse' />
      <div
        className='absolute bottom-0 left-0 w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px] animate-pulse'
        style={{ animationDelay: '2s' }}
      />

      {/* --- LEFT: TECHNICAL GLITCH ILLUSTRATION --- */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        className='relative w-full max-w-[450px] aspect-square flex items-center justify-center'>
        <svg viewBox='0 0 400 400' className='w-full h-full drop-shadow-2xl'>
          <defs>
            <linearGradient id='glitchGrad' x1='0%' y1='0%' x2='100%' y2='100%'>
              <stop offset='0%' stopColor='#f43f5e' />
              <stop offset='100%' stopColor='#881337' />
            </linearGradient>
          </defs>

          {/* Monitor Base */}
          <rect
            x='80'
            y='80'
            width='240'
            height='180'
            rx='20'
            fill='#1e293b'
            stroke='#334155'
            strokeWidth='4'
          />
          <rect x='95' y='95' width='210' height='150' rx='12' fill='#0f172a' />

          {/* Monitor Crack/Glitch SVG */}
          <motion.path
            d='M 200 95 L 210 140 L 180 160 L 220 200 L 195 245'
            fill='none'
            stroke='#f43f5e'
            strokeWidth='4'
            strokeLinecap='round'
            animate={{ opacity: [0.3, 1, 0.3], pathLength: [0, 1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />

          {/* Animated Error Gauge */}
          <motion.circle
            cx='140'
            cy='190'
            r='30'
            fill='none'
            stroke='#f43f5e'
            strokeWidth='6'
            strokeDasharray='188'
            animate={{ strokeDashoffset: [188, 50, 188] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <circle cx='140' cy='190' r='5' fill='#f43f5e' />
          <text
            x='125'
            y='235'
            fontSize='12'
            fontWeight='black'
            className='fill-rose-500 font-mono'>
            DANGER
          </text>

          {/* Pulse Line */}
          <motion.path
            d='M 200 190 L 220 190 L 230 160 L 245 220 L 260 190 L 280 190'
            fill='none'
            stroke='#60a5fa'
            strokeWidth='3'
            animate={{ pathLength: [0, 1, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />

          {/* Monitor Stand */}
          <path d='M 160 260 L 240 260 L 260 300 L 140 300 Z' fill='#334155' />
          <rect x='120' y='300' width='160' height='10' rx='5' fill='#1e293b' />

          {/* Floating Warning Particles */}
          {[...Array(5)].map((_, i) => (
            <motion.circle
              key={i}
              cx={100 + i * 50}
              cy={100 + Math.random() * 200}
              r='3'
              fill='#f43f5e'
              animate={{ scale: [1, 2, 1], opacity: [0.2, 0.8, 0.2] }}
              transition={{ duration: 2 + i, repeat: Infinity }}
            />
          ))}
        </svg>

        {/* Floating Icon Badges */}
        <motion.div
          animate={{ y: [-15, 15, -15] }}
          transition={{ duration: 4, repeat: Infinity }}
          className='absolute top-10 right-10 p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800'>
          <ShieldAlert className='w-8 h-8 text-rose-500' />
        </motion.div>
        <motion.div
          animate={{ y: [15, -15, 15] }}
          transition={{ duration: 5, repeat: Infinity }}
          className='absolute bottom-20 left-10 p-3 rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800'>
          <Activity className='w-6 h-6 text-blue-500' />
        </motion.div>
      </motion.div>

      {/* --- RIGHT: TEXT & DETAILS --- */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          'flex flex-col flex-1 space-y-8 relative z-10',
          fullScreen
            ? 'text-center lg:text-left items-center lg:items-start max-w-xl'
            : 'text-center items-center max-w-2xl',
        )}>
        <div
          className={cn(
            'space-y-4',
            !fullScreen && 'flex flex-col items-center',
          )}>
          <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest border border-rose-100 dark:border-rose-900/40'>
            <MonitorX className='w-3.5 h-3.5' />
            System Alert
          </div>
          <h2 className='text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight'>
            Unexpected <span className='text-rose-600'>Error.</span>
          </h2>
          <p className='text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-lg'>
            {message ||
              "The system encountered an unexpected data anomaly. We're working to restore the connection."}
          </p>
        </div>

        {/* Small Amount of Details */}
        {error && (
          <div className='bg-slate-950/5 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 text-left backdrop-blur-sm w-full'>
            <div className='flex items-center gap-2 mb-2 text-slate-400'>
              <FileJson className='w-3.5 h-3.5' />
              <p className='text-[10px] font-bold uppercase tracking-widest'>
                Error Summary
              </p>
            </div>
            <p className='text-sm font-mono text-rose-500 wrap-break-word leading-relaxed italic'>
              {error.message ||
                'An unknown exception was captured by the core engine.'}
            </p>
          </div>
        )}

        {/* Action Tray */}
        <div
          className={cn(
            'flex flex-col sm:flex-row items-center gap-5 pt-6 w-full sm:w-auto',
            fullScreen ? 'justify-center lg:justify-start' : 'justify-center',
          )}>
          <Button
            onClick={() => {
              if (onRetry) onRetry();
              else if (typeof window !== 'undefined') window.location.reload();
            }}
            className='h-14 px-10 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 hover:from-rose-600 hover:to-rose-800 text-white font-bold transition-all hover:scale-105 active:scale-95 shadow-xl shadow-rose-500/30 border-none flex items-center gap-3 w-full sm:w-auto group/retry'>
            <RefreshCcw className='h-5 w-5 group-active/retry:animate-spin' />
            Try Again
          </Button>

          <Button
            asChild
            variant='outline'
            className='h-14 px-10 rounded-2xl border-2 border-slate-200 dark:border-slate-800 font-bold transition-all hover:scale-105 hover:bg-slate-100 dark:hover:bg-slate-900 flex items-center gap-3 w-full sm:w-auto bg-white dark:bg-slate-950'>
            <Link href='/dashboard'>
              <Home className='h-5 w-5' />
              Go Home
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );

  return errorContent;
}

export default ErrorAnimation;
