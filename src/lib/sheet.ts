import { context2d, createCanvas } from './canvas'
import { mmToPx } from './geometry'
import { layoutSheet } from './layout'
import type { PaperSize } from './presets'

export interface SheetOptions {
  paper: PaperSize
  dpi: number
  gapMm: number
  marginMm: number
  copies?: number
  cutLines: boolean
}

/** Tiles a finished photo across a sheet of paper for printing at a photo shop. */
export function renderSheet(photo: HTMLCanvasElement, opts: SheetOptions) {
  const sheet = { width: mmToPx(opts.paper.widthMm, opts.dpi), height: mmToPx(opts.paper.heightMm, opts.dpi) }
  const layout = layoutSheet(
    sheet,
    { width: photo.width, height: photo.height },
    mmToPx(opts.gapMm, opts.dpi),
    mmToPx(opts.marginMm, opts.dpi),
    opts.copies,
  )
  const canvas = createCanvas(sheet.width, sheet.height)
  const ctx = context2d(canvas)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, sheet.width, sheet.height)
  for (const cell of layout.cells) {
    if (layout.rotated) {
      ctx.save()
      ctx.translate(cell.x + cell.width / 2, cell.y + cell.height / 2)
      ctx.rotate(Math.PI / 2)
      ctx.drawImage(photo, -photo.width / 2, -photo.height / 2)
      ctx.restore()
    } else {
      ctx.drawImage(photo, cell.x, cell.y)
    }
    if (opts.cutLines) {
      ctx.strokeStyle = '#b0b0b0'
      ctx.lineWidth = Math.max(1, opts.dpi / 300)
      ctx.strokeRect(cell.x - 0.5, cell.y - 0.5, cell.width + 1, cell.height + 1)
    }
  }
  return { canvas, count: layout.cells.length, max: layout.columns * layout.rows }
}
