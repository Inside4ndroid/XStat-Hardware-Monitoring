/**
 * Reusable Phase-2 UI primitives:
 *   <GaugeBar />      – animated horizontal fill bar with colour gradient
 *   <Sparkline />     – tiny 60-pt area chart
 *   <StatTile />      – large-value display card
 */
import React from 'react'
import { Box, Typography, alpha, useTheme } from '@mui/material'
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts'
import type { HistoryPoint } from '@/hooks/useSensorHistory'

// ─── GaugeBar ────────────────────────────────────────────────────────────────

interface GaugeBarProps {
  value: number | null   // 0–max
  max?: number
  unit?: string
  label: string
  color?: string
  height?: number
  showValue?: boolean
}

function gaugeColor(pct: number, baseColor: string, theme: ReturnType<typeof useTheme>): string {
  if (pct >= 90) return theme.palette.error.main
  if (pct >= 70) return theme.palette.warning.main
  return baseColor
}

export const GaugeBar: React.FC<GaugeBarProps> = ({
  value,
  max = 100,
  unit = '%',
  label,
  color,
  height = 6,
  showValue = true,
}) => {
  const theme = useTheme()
  const pct = value !== null ? Math.min(100, (value / max) * 100) : 0
  const base = color ?? theme.palette.primary.main
  const fill = gaugeColor(pct, base, theme)

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.7rem' }}>
          {label}
        </Typography>
        {showValue && (
          <Typography variant="caption" sx={{ color: fill, fontWeight: 700, fontSize: '0.7rem', ml: 1, flexShrink: 0 }}>
            {value !== null ? `${typeof max === 'number' && max !== 100 ? value.toFixed(0) : value.toFixed(1)} ${unit}` : '—'}
          </Typography>
        )}
      </Box>
      <Box
        sx={{
          width: '100%',
          height,
          borderRadius: height / 2,
          background: alpha(fill, 0.12),
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: height / 2,
            background: fill,
            transition: 'width 0.4s ease, background 0.4s ease',
          }}
        />
      </Box>
    </Box>
  )
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

interface SparklineProps {
  data: HistoryPoint[]
  color?: string
  height?: number
  unit?: string
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  color,
  height = 40,
  unit = '',
}) => {
  const theme = useTheme()
  const fill = color ?? theme.palette.primary.main

  if (data.length < 2) {
    return <Box sx={{ height, opacity: 0.2, background: alpha(fill, 0.05), borderRadius: 1 }} />
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <defs>
          <linearGradient id={`sg-${fill.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={fill} stopOpacity={0.4} />
            <stop offset="95%" stopColor={fill} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <RechartsTooltip
          contentStyle={{
            background: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 8,
            fontSize: 11,
            padding: '4px 8px',
          }}
          itemStyle={{ color: fill }}
          formatter={(v: number) => [`${v.toFixed(1)} ${unit}`, '']}
          labelFormatter={() => ''}
          cursor={{ stroke: alpha(fill, 0.3), strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="v"
          stroke={fill}
          strokeWidth={1.5}
          fill={`url(#sg-${fill.replace('#', '')})`}
          dot={false}
          animationDuration={300}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── StatTile ─────────────────────────────────────────────────────────────────

interface StatTileProps {
  label: string
  value: number | null
  unit: string
  color?: string
  sub?: string
}

export const StatTile: React.FC<StatTileProps> = ({ label, value, unit, color, sub }) => {
  const theme = useTheme()
  const c = color ?? theme.palette.primary.main

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        border: `1px solid ${alpha(c, 0.18)}`,
        background: alpha(c, 0.05),
        minWidth: 100,
        flex: '1 1 100px',
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </Typography>
      <Typography sx={{ color: c, fontWeight: 800, fontSize: '1.35rem', lineHeight: 1.1, mt: 0.25 }}>
        {value !== null ? value.toFixed(value >= 100 ? 0 : 1) : '—'}
        <Typography component="span" sx={{ fontSize: '0.7rem', fontWeight: 500, color: 'text.secondary', ml: 0.4 }}>
          {unit}
        </Typography>
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
          {sub}
        </Typography>
      )}
    </Box>
  )
}
