import { supportedFormats } from './canvas'
import { asOutputMime, type OutputMime } from './format'

/** Resolves "same as original" to a format this browser can write. */
export async function resolveFormat(choice: OutputMime | 'original', file: File): Promise<OutputMime> {
  if (choice !== 'original') return choice
  const mime = asOutputMime(file.type)
  return (await supportedFormats()).includes(mime) ? mime : 'image/jpeg'
}
