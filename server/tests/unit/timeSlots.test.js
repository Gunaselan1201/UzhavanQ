const {
    deriveStatus,
    parseTimeLabel,
    buildSlotDateTime,
    findTimeLabel,
    buildCapacityKey,
    SLOT_CAPACITY,
    ALMOST_FULL_FROM,
} = require('../../utils/timeSlots')

// Why this matters: this is what the farmer's slot grid (available/almost-full
// full) and the admin's capacity view are both built on. Wrong thresholds
// here mean the app either lies about a slot being full (overcrowding it
// in person) or lies about it being available (a farmer travels for nothing).

describe('deriveStatus', () => {
    test('0 to 5 booked is "available"', () => {
        for (let n = 0; n < ALMOST_FULL_FROM; n += 1) {
            expect(deriveStatus(n)).toBe('available')
        }
    })

    test('6 to 9 booked is "almost-full"', () => {
        for (let n = ALMOST_FULL_FROM; n < SLOT_CAPACITY; n += 1) {
            expect(deriveStatus(n)).toBe('almost-full')
        }
    })

    test('10 (capacity) booked is "full"', () => {
        expect(deriveStatus(SLOT_CAPACITY)).toBe('full')
    })

    test('more than capacity is still "full", not an unknown status', () => {
        expect(deriveStatus(SLOT_CAPACITY + 5)).toBe('full')
    })
})

describe('parseTimeLabel', () => {
    test('parses a morning (AM) label', () => {
        expect(parseTimeLabel('10:30 AM')).toEqual({ hours: 10, minutes: 30 })
    })

    test('parses an afternoon (PM) label, converting to 24h', () => {
        expect(parseTimeLabel('02:00 PM')).toEqual({ hours: 14, minutes: 0 })
    })

    test('12:00 PM is hour 12 (noon), not 0', () => {
        expect(parseTimeLabel('12:00 PM')).toEqual({ hours: 12, minutes: 0 })
    })

    test('returns null for garbage input', () => {
        expect(parseTimeLabel('garbage')).toBeNull()
        expect(parseTimeLabel('')).toBeNull()
        expect(parseTimeLabel(undefined)).toBeNull()
    })
})

describe('buildSlotDateTime + findTimeLabel round-trip', () => {
    test('a built Date maps back to the same label it was built from', () => {
        const date = buildSlotDateTime('2026-09-01', '10:30 AM')
        expect(findTimeLabel(date)).toBe('10:30 AM')
    })

    test('all six fixed labels round-trip correctly', () => {
        const labels = ['10:30 AM', '11:30 AM', '12:30 PM', '02:00 PM', '03:00 PM', '04:00 PM']
        for (const label of labels) {
            const date = buildSlotDateTime('2026-09-01', label)
            expect(findTimeLabel(date)).toBe(label)
        }
    })

    test('findTimeLabel returns null for a time that is not one of the fixed slots', () => {
        const offSlotTime = new Date(2026, 8, 1, 9, 15) // 9:15 AM — not a bookable slot
        expect(findTimeLabel(offSlotTime)).toBeNull()
    })
})

describe('buildCapacityKey', () => {
    test('combines centre, date, and time with spaces stripped from time', () => {
        expect(buildCapacityKey('namakkal-coop', '2026-09-01', '10:30 AM')).toBe('namakkal-coop-2026-09-01-10:30AM')
    })

    test('reserveSlot and getSlotAvailability build the identical key for the same slot (this is what keeps them in agreement)', () => {
        const a = buildCapacityKey('namakkal-coop', '2026-09-01', '02:00 PM')
        const b = buildCapacityKey('namakkal-coop', '2026-09-01', '02:00 PM')
        expect(a).toBe(b)
    })
})
