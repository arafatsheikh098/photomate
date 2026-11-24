import { Crop, Eraser, FileText, IdCard, Minimize2, Repeat, Scaling, Signature, type LucideIcon } from 'lucide-react'
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import { importWithReload } from '../pwa'
import { TOOL_META, type ToolMeta } from './meta'

export interface ToolInfo extends ToolMeta {
  icon: LucideIcon
  /** Tailwind classes for the icon tile. */
  tint: string
  Component: LazyExoticComponent<ComponentType>
}

const UI: Record<string, Pick<ToolInfo, 'icon' | 'tint' | 'Component'>> = {
  'compress-image': {
    icon: Minimize2,
    tint: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    Component: lazy(importWithReload(() => import('./CompressTool'))),
  },
  'resize-image': {
    icon: Scaling,
    tint: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    Component: lazy(importWithReload(() => import('./ResizeTool'))),
  },
  'convert-image': {
    icon: Repeat,
    tint: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    Component: lazy(importWithReload(() => import('./ConvertTool'))),
  },
  'passport-photo': {
    icon: IdCard,
    tint: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    Component: lazy(importWithReload(() => import('./PassportTool'))),
  },
  'remove-background': {
    icon: Eraser,
    tint: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    Component: lazy(importWithReload(() => import('./BackgroundTool'))),
  },
  'crop-image': {
    icon: Crop,
    tint: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
    Component: lazy(importWithReload(() => import('./CropTool'))),
  },
  'signature-resize': {
    icon: Signature,
    tint: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    Component: lazy(importWithReload(() => import('./SignatureTool'))),
  },
  'images-to-pdf': {
    icon: FileText,
    tint: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    Component: lazy(importWithReload(() => import('./PdfTool'))),
  },
}

export const TOOLS: ToolInfo[] = TOOL_META.map((m) => ({ ...m, ...UI[m.slug] }))

export const toolBySlug = (slug: string | undefined) => TOOLS.find((t) => t.slug === slug)
