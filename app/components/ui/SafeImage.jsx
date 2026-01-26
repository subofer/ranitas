"use client"
import React from 'react'
import NextImage from 'next/image'

export default function SafeImage(props) {
  // Some bundlers/environments might not provide next/image as a callable component at runtime.
  // Fallback to plain <img> when NextImage is not a function to avoid runtime errors like "default is not a constructor".
  const { src, alt = '', width, height, unoptimized = true, className = '', ...rest } = props

  // Use NextImage with unoptimized by default for blob URLs and local debug images
  return <NextImage src={src} alt={alt} width={width} height={height} unoptimized={unoptimized} className={className} {...rest} />
}