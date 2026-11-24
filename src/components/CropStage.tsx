import { useState, type ReactNode } from 'react'
import Cropper, { type Area, type Point } from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'

export interface CropState {
  crop: Point
  zoom: number
  rotation: number
  flipH: boolean
  flipV: boolean
}

export const initialCrop: CropState = { crop: { x: 0, y: 0 }, zoom: 1, rotation: 0, flipH: false, flipV: false }

/**
 * Cropper with an optional overlay drawn inside the crop window (used for the passport face guide).
 * Flip is applied through the media transform so the preview matches what cropTransformed renders.
 */
export function CropStage({
  image,
  aspect,
  state,
  onChange,
  onArea,
  overlay,
  className = 'h-[55vh] min-h-80',
}: {
  image: string
  aspect: number
  state: CropState
  onChange: (s: CropState) => void
  /** Crop area as percentages of the rotated image, and in its pixels. */
  onArea: (pixels: Area, percent: Area) => void
  overlay?: (size: { width: number; height: number }) => ReactNode
  className?: string
}) {
  const [cropSize, setCropSize] = useState<{ width: number; height: number } | null>(null)
  const { crop, zoom, rotation, flipH, flipV } = state
  return (
    <div className={`relative overflow-hidden rounded-xl bg-slate-900 ${className}`}>
      <Cropper
        image={image}
        crop={crop}
        zoom={zoom}
        rotation={rotation}
        aspect={aspect}
        minZoom={0.5}
        maxZoom={6}
        restrictPosition={false}
        showGrid={!overlay}
        transform={`translate(${crop.x}px, ${crop.y}px) rotate(${rotation}deg) scale(${zoom * (flipH ? -1 : 1)}, ${zoom * (flipV ? -1 : 1)})`}
        onCropChange={(c) => onChange({ ...state, crop: c })}
        onZoomChange={(z) => onChange({ ...state, zoom: z })}
        onRotationChange={(r) => onChange({ ...state, rotation: r })}
        onCropComplete={(pct, px) => onArea(px, pct)}
        onCropSizeChange={setCropSize}
      />
      {overlay && cropSize && (
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: cropSize.width, height: cropSize.height }}
        >
          {overlay(cropSize)}
        </div>
      )}
    </div>
  )
}
