// The feel of the motion is the app's to choose: the curve (one of the four of CSS for every movement, or Fluent's
// own, one per kind of movement) and the pace. What moves by script reads it at each movement; what moves by the
// stylesheet reads the variables written on the document root. At first every movement eases in and out.
import { render } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { DEFAULT_MOTION_FEEL, MOTION_EASES, MOTION_EASE_NAMES, MOTION_PACE, MotionProvider, applyMotionFeel, isMotionEase, motionFeel, motionVariables } from '../src'

afterEach(() => void applyMotionFeel(DEFAULT_MOTION_FEEL))

describe('the feel of the motion', () => {
  test('at first every movement eases in and out, at the toolkit\'s own times', () => {
    expect(motionFeel()).toEqual({ ease: 'ease-in-out', pace: 1 })
    expect(motionVariables(DEFAULT_MOTION_FEEL)).toEqual({
      '--motion-faster': '100ms',
      '--motion-fast': '150ms',
      '--motion-normal': '200ms',
      '--motion-ease-enter': 'cubic-bezier(0.42, 0, 0.58, 1)',
      '--motion-ease-leave': 'cubic-bezier(0.42, 0, 0.58, 1)',
      '--motion-ease-move': 'cubic-bezier(0.42, 0, 0.58, 1)',
    })
  })

  test('the four curves are those of CSS, and none is a straight line', () => {
    expect(MOTION_EASES).toEqual({ ease: [0.25, 0.1, 0.25, 1], 'ease-in': [0.42, 0, 1, 1], 'ease-out': [0, 0, 0.58, 1], 'ease-in-out': [0.42, 0, 0.58, 1] })
    // A straight line is a curve whose control points lie on it.
    for (const curve of Object.values(MOTION_EASES)) {
      const [x1, y1, x2, y2]: readonly number[] = curve
      expect(x1 === y1 && x2 === y2).toBe(false)
    }
    expect(MOTION_EASE_NAMES.every(isMotionEase)).toBe(true)
    expect(isMotionEase('linear')).toBe(false)
  })

  test('a chosen curve is the one of every movement; `fluent` keeps one for each kind', () => {
    expect(new Set(Object.values(motionVariables({ ease: 'ease-out', pace: 1 })).slice(3))).toEqual(new Set(['cubic-bezier(0, 0, 0.58, 1)']))
    const fluent = motionVariables({ ease: 'fluent', pace: 1 })
    expect([fluent['--motion-ease-enter'], fluent['--motion-ease-leave'], fluent['--motion-ease-move']]).toEqual(['cubic-bezier(0, 0, 0, 1)', 'cubic-bezier(0.8, 0, 0.78, 1)', 'cubic-bezier(0.33, 0, 0.67, 1)'])
  })

  test('the pace multiplies the times, within its limits; what is not given stays as it is', () => {
    expect(applyMotionFeel({ pace: 1.5 })).toEqual({ ease: 'ease-in-out', pace: 1.5 })
    expect(document.documentElement.style.getPropertyValue('--motion-normal')).toBe('300ms')
    expect(applyMotionFeel({ ease: 'ease' })).toEqual({ ease: 'ease', pace: 1.5 })
    expect(applyMotionFeel({ pace: 99 }).pace).toBe(MOTION_PACE.max)
    expect(applyMotionFeel({ pace: 0 }).pace).toBe(MOTION_PACE.min)
    // A value that is not a curve (from what the app kept) changes nothing.
    expect(applyMotionFeel({ ease: 'bouncy' as never }).ease).toBe('ease')
  })

  test('what moves by script follows: a movement takes the curve and the pace chosen', async () => {
    const { MOTION, tr } = await import('../src/internal/motion-impl')
    expect(tr('slide')).toEqual({ duration: MOTION.slide.duration, ease: [...MOTION_EASES['ease-in-out']] })
    applyMotionFeel({ ease: 'fluent', pace: 2 })
    expect(tr('slide')).toEqual({ duration: MOTION.slide.duration * 2, ease: [...MOTION.slide.ease] })
    expect(tr('leave').ease).toEqual([...MOTION.leave.ease])
  })

  test('`MotionProvider` sets the feel it is given, and leaves it alone when given none', () => {
    render(<MotionProvider animated ease="ease-out" pace={1.5}>x</MotionProvider>)
    expect(motionFeel()).toEqual({ ease: 'ease-out', pace: 1.5 })
    render(<MotionProvider animated>y</MotionProvider>)
    expect(motionFeel()).toEqual({ ease: 'ease-out', pace: 1.5 })
  })
})
