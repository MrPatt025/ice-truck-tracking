'use client'

import { useEffect, useRef } from 'react'

interface TemperatureSparklineProps {
  values: number[]
  width?: number
  height?: number
  stroke?: string
  fill?: string
}

export function TemperatureSparkline({
  values,
  width = 92,
  height = 28,
  stroke = '#22d3ee',
  fill = 'rgba(34,211,238,0.16)',
}: Readonly<TemperatureSparklineProps>) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || values.length < 2) return

    const dpr = Math.max(globalThis.devicePixelRatio || 1, 1)
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = Math.max(max - min, 0.001)
    const stepX = width / (values.length - 1)

    const toY = (value: number): number => {
      const normalized = (value - min) / range
      return height - 2 - normalized * (height - 4)
    }

    ctx.beginPath()
    ctx.moveTo(0, toY(values[0]))
    for (let i = 1; i < values.length; i += 1) {
      ctx.lineTo(stepX * i, toY(values[i]))
    }

    ctx.strokeStyle = stroke
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()

    ctx.lineTo(width, height - 1)
    ctx.lineTo(0, height - 1)
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
  }, [fill, height, stroke, values, width])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className='rounded-sm'
      aria-label='Temperature sparkline'
      data-testid='temperature-sparkline'
    />
  )
}
