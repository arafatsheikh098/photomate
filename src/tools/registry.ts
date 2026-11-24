import { Crop, Eraser, FileText, IdCard, Minimize2, Repeat, Scaling, Signature, type LucideIcon } from 'lucide-react'
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import { importWithReload } from '../pwa'

export interface ToolInfo {
  slug: string
  name: string
  blurb: string
  icon: LucideIcon
  /** Tailwind classes for the icon tile. */
  tint: string
  keywords: string
  Component: LazyExoticComponent<ComponentType>
}

export const TOOLS: ToolInfo[] = [
  {
    slug: 'compress',
    name: 'Compress',
    blurb: 'Shrink photos to an exact size like 100 KB or 50 KB, or by quality.',
    icon: Minimize2,
    tint: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    keywords: 'reduce size kb mb optimize',
    Component: lazy(importWithReload(() => import('./CompressTool'))),
  },
  {
    slug: 'resize',
    name: 'Resize',
    blurb: 'Change dimensions in pixels or percent, with social media presets.',
    icon: Scaling,
    tint: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    keywords: 'dimensions width height scale pixels',
    Component: lazy(importWithReload(() => import('./ResizeTool'))),
  },
  {
    slug: 'convert',
    name: 'Convert',
    blurb: 'Switch between JPG, PNG, WebP and AVIF. Strips location metadata.',
    icon: Repeat,
    tint: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    keywords: 'format jpg png webp avif exif',
    Component: lazy(importWithReload(() => import('./ConvertTool'))),
  },
  {
    slug: 'passport',
    name: 'Passport photo',
    blurb: 'Passport, visa and job-form photos with face guide, background colour and print sheet.',
    icon: IdCard,
    tint: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    keywords: 'visa id job application teletalk print 4x6',
    Component: lazy(importWithReload(() => import('./PassportTool'))),
  },
  {
    slug: 'remove-background',
    name: 'Remove background',
    blurb: 'AI cut-out on your device. Keep it transparent or put a new colour behind it.',
    icon: Eraser,
    tint: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    keywords: 'bg remover cutout transparent ai',
    Component: lazy(importWithReload(() => import('./BackgroundTool'))),
  },
  {
    slug: 'crop',
    name: 'Crop & rotate',
    blurb: 'Crop to any ratio, rotate, straighten and flip.',
    icon: Crop,
    tint: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
    keywords: 'cut aspect ratio rotate flip straighten',
    Component: lazy(importWithReload(() => import('./CropTool'))),
  },
  {
    slug: 'signature',
    name: 'Signature',
    blurb: 'Turn a photo of your signature into clean ink at 300×80 px under 60 KB.',
    icon: Signature,
    tint: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    keywords: 'sign job application form transparent',
    Component: lazy(importWithReload(() => import('./SignatureTool'))),
  },
  {
    slug: 'pdf',
    name: 'Images to PDF',
    blurb: 'Combine photos or scanned pages into one PDF, ordered how you like.',
    icon: FileText,
    tint: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    keywords: 'document scan merge a4 combine',
    Component: lazy(importWithReload(() => import('./PdfTool'))),
  },
]

export const toolBySlug = (slug: string | undefined) => TOOLS.find((t) => t.slug === slug)
