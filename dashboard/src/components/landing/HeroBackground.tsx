'use client'

import React from 'react'

type HeroBackgroundProps = {
  videoWebm?: string
  videoMp4?: string
  poster?: string
}

export default function HeroBackground({
  videoWebm = '/video/ice-truck-loop.webm',
  videoMp4 = '/media/ice-fleet-loop.mp4',
  poster = '/poster/ice-truck-poster.svg',
}: Readonly<HeroBackgroundProps>) {
  return (
    <div className='absolute inset-0 -z-20 overflow-hidden rounded-3xl'>
      <video
        className='h-full w-full object-cover opacity-40'
        autoPlay
        muted
        loop
        playsInline
        preload='metadata'
        poster={poster}
      >
        <source src={videoWebm} type='video/webm' />
        <source src={videoMp4} type='video/mp4' />
      </video>

      <div className='absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.22),transparent_45%),radial-gradient(circle_at_80%_85%,rgba(14,165,233,0.25),transparent_45%),linear-gradient(to_bottom,rgba(2,6,23,0.68),rgba(2,6,23,0.95))]' />
    </div>
  )
}
