'use client';
import { cn } from '@/lib/utils';
import { RefreshCcw, Home } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '../ui/button';

export interface InternalServerErrorProps {
  className?: string;
  fullScreen?: boolean;
  error?: any;
  onRetry?: () => void;
}

export default function InternalServerError({
  className,
  fullScreen = true,
  error,
  onRetry,
}: InternalServerErrorProps) {
  return (
    <div
      className={cn(
        fullScreen
          ? 'fixed inset-0 z-100 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-6 py-12 overflow-y-auto'
          : 'relative w-full h-full flex flex-col items-center justify-center bg-transparent py-8',
        'transition-all duration-500 animate-in fade-in',
        className,
      )}>
      <div className='flex flex-col lg:flex-row items-center justify-center w-full max-w-6xl mx-auto gap-8 lg:gap-20 py-8'>
        {/* --- SERVER RACK ANIMATION --- */}
        <div className='relative w-full max-w-[280px] md:max-w-[380px] aspect-square mb-6 lg:mb-0 select-none shrink-0'>
          {/* Ambient Glow */}
          <motion.div
            animate={{ opacity: [0.1, 0.2, 0.1], scale: [1, 1.1, 1] }}
            transition={{ duration: 5, repeat: Infinity }}
            className='absolute inset-0 bg-rose-500/20 rounded-full blur-[80px] pointer-events-none'
          />

          <svg
            viewBox='0 0 500 500'
            className='w-full h-full drop-shadow-2xl relative z-10'>
            <defs>
              <filter id='led-glow'>
                <feGaussianBlur stdDeviation='3' result='blur' />
                <feComposite in='SourceGraphic' in2='blur' operator='over' />
              </filter>
              <linearGradient
                id='serverGrad'
                x1='0%'
                y1='0%'
                x2='100%'
                y2='100%'>
                <stop offset='0%' stopColor='#1e293b' />
                <stop offset='100%' stopColor='#0f172a' />
              </linearGradient>
            </defs>

            {/* Server Rack Case */}
            <rect
              x='150'
              y='80'
              width='200'
              height='340'
              rx='14'
              fill='url(#serverGrad)'
              stroke='#334155'
              strokeWidth='2'
            />
            <rect
              x='165'
              y='95'
              width='170'
              height='310'
              rx='10'
              fill='#020617'
              stroke='#1e293b'
              strokeWidth='1'
            />

            {/* Units/Slots */}
            {[110, 165, 220, 275].map((y, i) => (
              <g key={y}>
                <rect
                  x='175'
                  y={y}
                  width='150'
                  height='42'
                  rx='6'
                  fill='#0f172a'
                  stroke='#1e293b'
                  strokeWidth='1'
                />
                <motion.circle
                  cx='190'
                  cy={y + 21}
                  r='3.5'
                  fill={i === 1 || i === 2 ? '#f43f5e' : '#10b981'}
                  animate={i === 1 || i === 2 ? { opacity: [1, 0.3, 1] } : {}}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  filter='url(#led-glow)'
                />
                {/* Simulated Data Activity */}
                <motion.rect
                  x='210'
                  y={y + 18}
                  width='70'
                  height='6'
                  rx='3'
                  fill='#1e293b'
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                />
                <rect
                  x='295'
                  y={y + 16}
                  width='22'
                  height='10'
                  rx='3'
                  fill='#1e293b'
                />
              </g>
            ))}

            {/* Main Error Shield */}
            <motion.g
              animate={{
                y: [-8, 8, -8],
                rotate: [-1, 1, -1],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
              <path
                d='M 250 180 L 310 220 L 310 300 L 250 340 L 190 300 L 190 220 Z'
                fill='#f43f5e'
                className='drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]'
              />
              <text
                x='250'
                y='280'
                textAnchor='middle'
                fill='white'
                fontSize='52'
                fontWeight='900'
                className='font-mono tracking-tighter'>
                500
              </text>
            </motion.g>

            {/* Smoke/Sparks */}
            <motion.g>
              {[0, 1].map((delay) => (
                <motion.circle
                  key={delay}
                  cx='330'
                  cy='120'
                  r='10'
                  stroke='#f43f5e'
                  strokeWidth='2'
                  fill='none'
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 2.5, opacity: [0, 0.3, 0], y: -80, x: 335 }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: delay * 1.5,
                  }}
                />
              ))}
            </motion.g>
          </svg>
        </div>

        {/* --- TEXT & ACTIONS --- */}
        <div className='space-y-8 flex flex-col text-center lg:text-left z-10 px-6 shrink-0 max-w-xl'>
          <div className='space-y-4'>
            <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest border border-rose-100 dark:border-rose-900/40 mx-auto lg:mx-0'>
              <span className='relative flex h-2 w-2'>
                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75'></span>
                <span className='relative inline-flex rounded-full h-2 w-2 bg-rose-500'></span>
              </span>
              Connection Failure
            </div>
            <h2 className='text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tighter'>
              Internal <span className='text-rose-600'>Server Error.</span>
            </h2>
            <p className='text-base lg:text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed'>
              The system encountered an unexpected bottleneck. Our engineers
              have been notified and are investigating.
            </p>

            {/* Captured Error Snippet */}
            {error && (
              <div className='mt-4 p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/20 text-left'>
                <p className='text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1'>
                  Captured Exception
                </p>
                <p className='text-xs font-mono text-slate-600 dark:text-slate-400 truncate italic'>
                  {typeof error === 'string'
                    ? error
                    : error.message || JSON.stringify(error).substring(0, 100)}
                </p>
              </div>
            )}
          </div>

          {/* --- ACTIONS --- */}
          <div className='flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 shrink-0 w-full sm:w-auto'>
            <Button
              onClick={onRetry || (() => window.location.reload())}
              className='h-12 px-8 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all shadow-lg shadow-rose-500/20 hover:scale-105 active:scale-95 flex items-center gap-2.5 w-full sm:w-auto'>
              <RefreshCcw className='w-4.5 h-4.5' />
              Retry System
            </Button>

            <Button
              asChild
              variant='outline'
              className='h-12 px-8 rounded-xl border-2 border-slate-200 dark:border-slate-800 font-bold hover:bg-slate-50 dark:hover:bg-slate-900 transition-all hover:scale-105 active:scale-95 flex items-center gap-2.5 w-full sm:w-auto'>
              <Link href='/dashboard'>
                <Home className='w-4.5 h-4.5 text-slate-500' />
                Go Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
