import type { Rect, Size } from './geometry'

export interface SheetLayout {
  cells: Rect[]
  columns: number
  rows: number
  /** True when photos were turned 90° to fit more on the sheet. */
  rotated: boolean
}

function grid(sheet: Size, photo: Size, gap: number, margin: number) {
  const usableW = sheet.width - 2 * margin
  const usableH = sheet.height - 2 * margin
  const columns = Math.max(0, Math.floor((usableW + gap) / (photo.width + gap)))
  const rows = Math.max(0, Math.floor((usableH + gap) / (photo.height + gap)))
  return { columns, rows }
}

/**
 * Packs as many copies of a photo onto a print sheet as fit in a centred grid.
 * Tries both orientations of the photo and keeps whichever fits more.
 */
export function layoutSheet(sheet: Size, photo: Size, gap: number, margin: number, limit = Infinity): SheetLayout {
  const upright = grid(sheet, photo, gap, margin)
  const turned = grid(sheet, { width: photo.height, height: photo.width }, gap, margin)
  const rotated = turned.columns * turned.rows > upright.columns * upright.rows
  const { columns, rows } = rotated ? turned : upright
  const cell = rotated ? { width: photo.height, height: photo.width } : photo

  const blockW = columns * cell.width + Math.max(0, columns - 1) * gap
  const blockH = rows * cell.height + Math.max(0, rows - 1) * gap
  const x0 = (sheet.width - blockW) / 2
  const y0 = (sheet.height - blockH) / 2

  const cells: Rect[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      if (cells.length >= limit) break
      cells.push({
        x: Math.round(x0 + c * (cell.width + gap)),
        y: Math.round(y0 + r * (cell.height + gap)),
        width: cell.width,
        height: cell.height,
      })
    }
  }
  return { cells, columns, rows, rotated }
}

/** Fits an image inside a page with a margin, centred, preserving aspect ratio. */
export function fitOnPage(image: Size, page: Size, margin: number): Rect {
  const boxW = Math.max(1, page.width - 2 * margin)
  const boxH = Math.max(1, page.height - 2 * margin)
  const f = Math.min(boxW / image.width, boxH / image.height)
  const width = image.width * f
  const height = image.height * f
  return { x: (page.width - width) / 2, y: (page.height - height) / 2, width, height }
}
