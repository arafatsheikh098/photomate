import { describe, expect, it } from 'vitest'
import { asOutputMime, formatBytes, renameFile, savedPercent, uniqueNames } from './format'

describe('formatBytes', () => {
  it('picks a sensible unit', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(100 * 1024)).toBe('100 KB')
    expect(formatBytes(3.5 * 1024 * 1024)).toBe('3.50 MB')
    expect(formatBytes(-1)).toBe('—')
  })
})

describe('renameFile', () => {
  it('swaps the extension and keeps the stem', () => {
    expect(renameFile('holiday photo.HEIC', 'jpg')).toBe('holiday photo.jpg')
    expect(renameFile('a.b.png', 'webp', '-small')).toBe('a.b-small.webp')
    expect(renameFile('.hidden', 'png')).toBe('.hidden.png')
    expect(renameFile('', 'png')).toBe('image.png')
  })
})

describe('uniqueNames', () => {
  it('numbers duplicates without colliding with existing names', () => {
    expect(uniqueNames(['a.jpg', 'a.jpg', 'a (2).jpg', 'b'])).toEqual(['a.jpg', 'a (2).jpg', 'a (2) (2).jpg', 'b'])
    expect(uniqueNames(['x', 'x', 'x'])).toEqual(['x', 'x (2)', 'x (3)'])
  })
})

describe('misc', () => {
  it('computes savings and normalises mime types', () => {
    expect(savedPercent(1000, 250)).toBe(75)
    expect(savedPercent(1000, 1200)).toBe(-20)
    expect(savedPercent(0, 10)).toBe(0)
    expect(asOutputMime('image/webp')).toBe('image/webp')
    expect(asOutputMime('image/heic')).toBe('image/jpeg')
  })
})
