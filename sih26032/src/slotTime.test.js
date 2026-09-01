import { describe, test, expect } from 'vitest'
import { isSlotPast, timeLabelToMinutes } from './slotTime.js'

// Why this matters: this is the guardrail against a farmer selecting a
// time slot that has already passed. Get it wrong and either (a) farmers
// can book a slot that's already gone, arriving to find no queue for
// them (the exact "uncertainty about procurement status" the problem
// statement calls out), or (b) it over-blocks and disables slots that
// are still perfectly bookable, frustrating farmers for no reason.

describe('timeLabelToMinutes', () => {
    test('converts AM times correctly', () => {
        expect(timeLabelToMinutes('10:30 AM')).toBe(10 * 60 + 30)
    })

    test('converts PM times correctly (adds 12 hours)', () => {
        expect(timeLabelToMinutes('02:00 PM')).toBe(14 * 60)
    })

    test('12:00 PM is noon (720 minutes), not midnight', () => {
        expect(timeLabelToMinutes('12:00 PM')).toBe(12 * 60)
    })

    test('returns null for an unparseable label', () => {
        expect(timeLabelToMinutes('not a time')).toBeNull()
        expect(timeLabelToMinutes('')).toBeNull()
    })
})

describe('isSlotPast', () => {
    test('a slot earlier than the current time on today\'s date is excluded (past)', () => {
        const dateStr = '2026-09-01'
        const now = new Date(2026, 8, 1, 11, 0) // Sept 1, 11:00 AM
        expect(isSlotPast(dateStr, '10:30 AM', now)).toBe(true)
    })

    test('a slot later than the current time on today\'s date is NOT excluded', () => {
        const dateStr = '2026-09-01'
        const now = new Date(2026, 8, 1, 11, 0) // Sept 1, 11:00 AM
        expect(isSlotPast(dateStr, '11:30 AM', now)).toBe(false)
    })

    test('the exact same time slot on a FUTURE date is never excluded, even though the clock time has "passed" today', () => {
        const futureDateStr = '2026-09-02' // tomorrow relative to `now`
        const now = new Date(2026, 8, 1, 11, 0) // Sept 1, 11:00 AM
        expect(isSlotPast(futureDateStr, '10:30 AM', now)).toBe(false)
    })

    test('the exact same time slot on a PAST date is never excluded either — isSlotPast only judges "today"', () => {
        // Booking a past date isn't this function's job (the date picker's
        // minDate already prevents selecting one) — it only guards today.
        const pastDateStr = '2026-08-30'
        const now = new Date(2026, 8, 1, 11, 0)
        expect(isSlotPast(pastDateStr, '10:30 AM', now)).toBe(false)
    })

    test('a slot exactly at the current minute is not yet past (boundary is strictly "<", not "<=")', () => {
        const dateStr = '2026-09-01'
        const now = new Date(2026, 8, 1, 10, 30)
        expect(isSlotPast(dateStr, '10:30 AM', now)).toBe(false)
    })

    test('one minute after a slot start, it is past', () => {
        const dateStr = '2026-09-01'
        const now = new Date(2026, 8, 1, 10, 31)
        expect(isSlotPast(dateStr, '10:30 AM', now)).toBe(true)
    })
})
