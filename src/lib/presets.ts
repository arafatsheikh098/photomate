import { mmToPx } from './geometry'

export interface PhotoPreset {
  id: string
  label: string
  detail: string
  widthPx: number
  heightPx: number
  /** Physical size, when the photo is meant to be printed. */
  widthMm?: number
  heightMm?: number
  dpi: number
  /** Upper file-size limit some online forms enforce. */
  maxKB?: number
  /** Head height (chin to crown) as a fraction of photo height, used for the crop guide. */
  head: [min: number, max: number]
  background: string
}

const DPI = 300

function printPreset(
  id: string,
  label: string,
  detail: string,
  widthMm: number,
  heightMm: number,
  head: [number, number],
  extra: Partial<PhotoPreset> = {},
): PhotoPreset {
  return {
    id,
    label,
    detail,
    widthMm,
    heightMm,
    widthPx: mmToPx(widthMm, DPI),
    heightPx: mmToPx(heightMm, DPI),
    dpi: DPI,
    head,
    background: '#ffffff',
    ...extra,
  }
}

/**
 * Common photo specifications. Rules change, so the UI reminds people to check the
 * issuing authority's current requirements before submitting.
 */
export const PHOTO_PRESETS: PhotoPreset[] = [
  printPreset('35x45', 'Passport 35×45 mm', 'UK, Schengen/EU, India, Australia and many others', 35, 45, [0.64, 0.8]),
  printPreset('2x2in', 'US passport / visa 2×2 in', '51×51 mm, head 25–35 mm', 50.8, 50.8, [0.5, 0.69]),
  {
    id: 'bd-job',
    label: 'BD govt. job form (Teletalk)',
    detail: '300×300 px, JPG, max 100 KB',
    widthPx: 300,
    heightPx: 300,
    dpi: DPI,
    maxKB: 100,
    head: [0.5, 0.69],
    background: '#ffffff',
  },
  {
    id: 'dv',
    label: 'US DV Lottery',
    detail: '600×600 px, JPG, max 240 KB',
    widthPx: 600,
    heightPx: 600,
    dpi: DPI,
    maxKB: 240,
    head: [0.5, 0.69],
    background: '#ffffff',
  },
  printPreset('50x70', 'Canada 50×70 mm', 'Head 31–36 mm', 50, 70, [0.44, 0.51]),
  printPreset('33x48', 'China visa 33×48 mm', 'Head 28–33 mm', 33, 48, [0.58, 0.69]),
  printPreset('35x50', 'Malaysia 35×50 mm', 'White background', 35, 50, [0.6, 0.75]),
  printPreset('stamp', 'Stamp size 20×25 mm', 'Small prints for forms', 20, 25, [0.55, 0.7]),
]

export interface PaperSize {
  id: string
  label: string
  widthMm: number
  heightMm: number
}

export const PAPER_SIZES: PaperSize[] = [
  { id: '4x6', label: '4×6 in (4R photo paper)', widthMm: 101.6, heightMm: 152.4 },
  { id: '5x7', label: '5×7 in (5R)', widthMm: 127, heightMm: 177.8 },
  { id: 'a4', label: 'A4', widthMm: 210, heightMm: 297 },
  { id: 'letter', label: 'US Letter', widthMm: 215.9, heightMm: 279.4 },
]

export interface SocialPreset {
  label: string
  width: number
  height: number
}

export const RESIZE_PRESETS: SocialPreset[] = [
  { label: 'Instagram post 1080×1080', width: 1080, height: 1080 },
  { label: 'Instagram portrait 1080×1350', width: 1080, height: 1350 },
  { label: 'Story / Reel 1080×1920', width: 1080, height: 1920 },
  { label: 'Facebook cover 851×315', width: 851, height: 315 },
  { label: 'YouTube thumbnail 1280×720', width: 1280, height: 720 },
  { label: 'LinkedIn banner 1584×396', width: 1584, height: 396 },
  { label: 'Full HD 1920×1080', width: 1920, height: 1080 },
  { label: 'Form photo 300×300', width: 300, height: 300 },
]

export interface SignaturePreset {
  id: string
  label: string
  width: number
  height: number
  maxKB?: number
}

export const SIGNATURE_PRESETS: SignaturePreset[] = [
  { id: 'bd-job', label: 'BD govt. job form — 300×80 px, max 60 KB', width: 300, height: 80, maxKB: 60 },
  { id: 'wide', label: 'Wide 600×200 px', width: 600, height: 200 },
  { id: 'trim', label: 'Trimmed to the signature (no fixed size)', width: 0, height: 0 },
]
