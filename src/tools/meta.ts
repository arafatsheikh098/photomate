/**
 * Names, blurbs and search metadata for every tool. Plain data with no React imports, so
 * vite.config.ts can also read it to generate a real HTML page per tool (good for search).
 */
export interface ToolMeta {
  slug: string
  name: string
  /** Visible page heading (h1). */
  heading: string
  blurb: string
  /** <title> and social title. Leads with the words people actually search for. */
  title: string
  /** Meta description, about 150 characters. */
  description: string
  keywords: string
}

export const APP_NAME = 'PhotoMate'
export const APP_TAGLINE = 'Resize, Compress & Passport Photo Maker'
export const HOME_TITLE = `${APP_NAME} — Free Image Resizer, Compressor & Passport Photo Maker`
export const HOME_DESCRIPTION =
  'Free, private image tools in your browser: compress to 100 KB, resize, convert JPG/PNG/WebP, passport size photo, remove background, signature resize and images to PDF. No upload.'

export const TOOL_META: ToolMeta[] = [
  {
    slug: 'compress-image',
    name: 'Compress',
    heading: 'Compress image',
    blurb: 'Shrink photos to an exact size like 100 KB or 50 KB, or by quality.',
    title: 'Compress Image to 100 KB, 50 KB or Any Size — Free, No Upload',
    description:
      'Reduce photo size to 20 KB, 50 KB, 100 KB, 200 KB or any limit at the best possible quality. Batch compress JPG, PNG and WebP in your browser.',
    keywords: 'reduce size kb mb optimize shrink',
  },
  {
    slug: 'resize-image',
    name: 'Resize',
    heading: 'Resize image',
    blurb: 'Change dimensions in pixels or percent, with social media presets.',
    title: 'Resize Image in Pixels or Percent — Free Online Photo Resizer',
    description:
      'Resize photos to exact pixels, percent or longest side. Presets for Instagram, Facebook, YouTube and 300×300 form photos. Batch resize with ZIP download.',
    keywords: 'dimensions width height scale pixels',
  },
  {
    slug: 'convert-image',
    name: 'Convert',
    heading: 'Convert image',
    blurb: 'Switch between JPG, PNG, WebP and AVIF. Strips location metadata.',
    title: 'Convert Image to JPG, PNG or WebP — Free Image Converter',
    description:
      'Convert PNG to JPG, JPG to PNG, WebP to JPG and more. Choose the background for transparent images and remove GPS/EXIF data. Works offline.',
    keywords: 'format jpg png webp avif exif',
  },
  {
    slug: 'passport-photo',
    name: 'Passport photo',
    heading: 'Passport size photo maker',
    blurb: 'Passport, visa and job-form photos with face guide, background colour and print sheet.',
    title: 'Passport Size Photo Maker — 35×45 mm, 2×2 in, 300×300 px',
    description:
      'Make passport, visa and job application photos: 35×45 mm, 2×2 inch, 300×300 px under 100 KB. White background, face guide and 4×6 print sheet.',
    keywords: 'visa id job application teletalk print 4x6 stamp size',
  },
  {
    slug: 'remove-background',
    name: 'Remove background',
    heading: 'Remove background',
    blurb: 'AI cut-out on your device. Keep it transparent or put a new colour behind it.',
    title: 'Remove Background from Image — Free AI, No Upload',
    description:
      'Remove the background from photos with AI that runs on your device. Make it transparent or add a white, coloured, blurred or photo background.',
    keywords: 'bg remover cutout transparent ai white background',
  },
  {
    slug: 'crop-image',
    name: 'Crop & rotate',
    heading: 'Crop & rotate image',
    blurb: 'Crop to any ratio, rotate, straighten and flip.',
    title: 'Crop, Rotate and Flip Images — Free Online Photo Cropper',
    description: 'Crop photos to 1:1, 4:5, 16:9 or the original ratio, straighten, rotate and flip, at full resolution, in your browser.',
    keywords: 'cut aspect ratio rotate flip straighten',
  },
  {
    slug: 'signature-resize',
    name: 'Signature',
    heading: 'Signature resizer',
    blurb: 'Turn a photo of your signature into clean ink at 300×80 px under 60 KB.',
    title: 'Signature Resizer 300×80 px under 60 KB — Clean Signature Photo',
    description:
      'Turn a phone photo of your signature into clean black or blue ink on white or transparent background, resized to 300×80 px under 60 KB.',
    keywords: 'sign job application form transparent 300x80',
  },
  {
    slug: 'images-to-pdf',
    name: 'Images to PDF',
    heading: 'Images to PDF',
    blurb: 'Combine photos or scanned pages into one PDF, ordered how you like.',
    title: 'Images to PDF — Convert JPG to PDF Free, No Upload',
    description: 'Combine photos and scanned documents into one PDF. Reorder and rotate pages, choose A4 or Letter and control the file size.',
    keywords: 'document scan merge a4 combine jpg to pdf',
  },
]
