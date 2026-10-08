import React from 'react'
import { CallsPerDay } from '../../services/db'
import { Activity } from 'lucide-react'

interface DashboardChartsProps {
  callsPerDay: CallsPerDay[]
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ callsPerDay }) => {
  const maxCalls = Math.max(1, ...callsPerDay.map((c) => c.count))

  // Build an SVG polyline for calls-per-day
  const chartWidth = 520
  const chartHeight = 120
  const stepX = callsPerDay.length > 1 ? chartWidth / (callsPerDay.length - 1) : chartWidth
  const points = callsPerDay
    .map((c, i) => {
      const x = i * stepX
      const y = chartHeight - (c.count / maxCalls) * (chartHeight - 20) - 10
      return `${x},${y}`
    })
    .join(' ')

  const totalCalls = callsPerDay.reduce((acc, c) => acc + c.count, 0)

  return (
    <section className="bg-surface-container-low border border-outline-variant/40 rounded-3xl p-6 space-y-5 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-secondary/15 text-secondary flex items-center justify-center font-bold">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-headline-sm text-sm font-bold text-white font-display">Call Activity Telemetry</h2>
            <p className="text-xs text-on-surface-variant">Past {callsPerDay.length} days recording volume</p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-surface-container text-secondary text-xs font-semibold">
          {totalCalls} Calls Ingested
        </span>
      </div>

      {callsPerDay.every((c) => c.count === 0) ? (
        <div className="py-12 text-center border border-dashed border-outline-variant/30 rounded-2xl bg-surface-container-lowest">
          <p className="text-xs text-outline">No calls recorded in this 14-day window.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="overflow-x-auto pt-2">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-32">
              <defs>
                <linearGradient id="callsFillLime" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9ddf2e" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#9ddf2e" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <polygon
                points={`0,${chartHeight} ${points} ${chartWidth},${chartHeight}`}
                fill="url(#callsFillLime)"
              />
              <polyline points={points} fill="none" stroke="#9ddf2e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {callsPerDay.map((c, i) => (
                <circle
                  key={c.date}
                  cx={i * stepX}
                  cy={chartHeight - (c.count / maxCalls) * (chartHeight - 20) - 10}
                  r="3.5"
                  fill="#ffffff"
                  stroke="#9ddf2e"
                  strokeWidth="2"
                />
              ))}
            </svg>
          </div>
          <div className="flex justify-between text-[10px] text-outline font-medium pt-2 border-t border-surface-container">
            <span>{callsPerDay[0]?.date.slice(5)}</span>
            <span>14-day rolling pulse</span>
            <span>{callsPerDay[callsPerDay.length - 1]?.date.slice(5)}</span>
          </div>
        </div>
      )}
    </section>
  )
}
