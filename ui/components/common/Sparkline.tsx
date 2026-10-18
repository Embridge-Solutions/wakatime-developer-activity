'use client';

import React from 'react';

export interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  color = '#10b981',
  width = 100,
  height = 36,
  strokeWidth = 2,
  className,
}) => {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} className={className} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 4;

  const effectiveWidth = width - padding * 2;
  const effectiveHeight = height - padding * 2;

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * effectiveWidth;
    const y = padding + effectiveHeight - ((val - min) / range) * effectiveHeight;
    return { x, y };
  });

  // Generate smooth SVG curve using cubic bezier control points
  let pathD = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cp1x = p0.x + (p1.x - p0.x) / 2;
    const cp1y = p0.y;
    const cp2x = p0.x + (p1.x - p0.x) / 2;
    const cp2y = p1.y;
    pathD += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y}`;
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`overflow-visible ${className || ''}`}
    >
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default Sparkline;
