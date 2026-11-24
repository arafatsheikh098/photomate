import { fitOnPage } from './layout'
import { MM_PER_INCH } from './geometry'

export const PT_PER_INCH = 72
export const mmToPt = (mm: number) => (mm / MM_PER_INCH) * PT_PER_INCH

export type PageSize = 'a4' | 'letter' | 'fit'
export type Orientation = 'auto' | 'portrait' | 'landscape'

const PAGES: Record<Exclude<PageSize, 'fit'>, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
}

export interface PdfPageImage {
  /** JPEG bytes. */
  jpeg: Uint8Array
  width: number
  height: number
}

export interface PdfOptions {
  pageSize: PageSize
  orientation: Orientation
  /** Margin in points. */
  margin: number
  title?: string
}

/** Page dimensions in points for one image. "fit" pages are A4-wide with the image's aspect ratio. */
export function pageFor(img: { width: number; height: number }, opts: Pick<PdfOptions, 'pageSize' | 'orientation' | 'margin'>): [number, number] {
  if (opts.pageSize === 'fit') {
    const w = PAGES.a4[0]
    return [w, (w - 2 * opts.margin) * (img.height / img.width) + 2 * opts.margin]
  }
  const [a, b] = PAGES[opts.pageSize]
  const landscape = opts.orientation === 'landscape' || (opts.orientation === 'auto' && img.width > img.height)
  return landscape ? [b, a] : [a, b]
}

export async function imagesToPdf(images: PdfPageImage[], opts: PdfOptions): Promise<Blob> {
  const { PDFDocument } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  doc.setTitle(opts.title ?? 'Images')
  doc.setProducer('Chobi')
  doc.setCreator('Chobi image toolkit')
  for (const img of images) {
    const embedded = await doc.embedJpg(img.jpeg)
    const [pw, ph] = pageFor(img, opts)
    const page = doc.addPage([pw, ph])
    const r = fitOnPage(img, { width: pw, height: ph }, opts.margin)
    page.drawImage(embedded, { x: r.x, y: r.y, width: r.width, height: r.height })
  }
  const bytes = await doc.save()
  return new Blob([bytes as BlobPart], { type: 'application/pdf' })
}

/** A single full-bleed page of an exact physical size, for print sheets that must print at 100%. */
export async function sheetToPdf(jpeg: Uint8Array, widthMm: number, heightMm: number, title: string): Promise<Blob> {
  const { PDFDocument } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  doc.setTitle(title)
  doc.setProducer('Chobi')
  const embedded = await doc.embedJpg(jpeg)
  const w = mmToPt(widthMm)
  const h = mmToPt(heightMm)
  doc.addPage([w, h]).drawImage(embedded, { x: 0, y: 0, width: w, height: h })
  return new Blob([(await doc.save()) as BlobPart], { type: 'application/pdf' })
}
