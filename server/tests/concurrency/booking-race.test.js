const request = require('supertest')
const app = require('../../app')
const { connect, closeDatabase, clearCollections } = require('../setup/testDb')
const SlotCapacity = require('../../models/SlotCapacity')
const Booking = require('../../models/Booking')

// Why this matters MOST for this project: "reduce congestion and waiting
// time at procurement centres" is the actual problem statement. If 20
// farmers' phones all fire their booking request in the same instant
// (exactly what happens when slots open, or right after a delay
// notification goes out) and the app lets more than 10 of them claim a
// 10-capacity slot, the app has just actively caused the overcrowding
// it was built to prevent — a business-logic failure, not just a bug.
//
// This does NOT run one request, wait, run the next — it fires many
// requests at once with Promise.all so they genuinely interleave inside
// Node's event loop, the same way real simultaneous HTTP requests would.

beforeAll(async () => { await connect() })
afterAll(async () => { await closeDatabase() })
afterEach(async () => { await clearCollections() })

const payload = (overrides = {}) => ({
    farmerName: 'Concurrent Farmer',
    phone: '+91 90000 00000',
    location: 'Mohanur',
    produce: 'Onion',
    weight: 5,
    centre: 'namakkal-coop',
    slotDateTime: new Date(2026, 8, 10, 10, 30).toISOString(),
    ...overrides,
})

describe('concurrent bookings against a single 10-capacity slot', () => {
    test('firing 20 simultaneous requests at an empty slot: EXACTLY 10 succeed with 201, the rest fail cleanly with 409', async () => {
        const REQUEST_COUNT = 20
        const requests = Array.from({ length: REQUEST_COUNT }, () =>
            request(app).post('/api/bookings').send(payload())
        )
        const results = await Promise.all(requests)

        const succeeded = results.filter((r) => r.status === 201)
        const rejected = results.filter((r) => r.status === 409)

        expect(succeeded).toHaveLength(10)
        expect(rejected).toHaveLength(10)
        // no request should return anything else (no 500s from a race
        // condition throwing an unhandled error, no silent success at 11+)
        expect(succeeded.length + rejected.length).toBe(REQUEST_COUNT)

        // the DB itself — not just the HTTP responses — must never exceed capacity
        const doc = await SlotCapacity.findOne({ key: 'namakkal-coop-2026-09-10-10:30AM' })
        expect(doc.count).toBe(10)

        const bookingCount = await Booking.countDocuments({})
        expect(bookingCount).toBe(10)
    })

    test('firing 15 simultaneous requests when the slot ALREADY has 7 spots taken: exactly 3 more succeed (filling to 10), 12 fail', async () => {
        // seed 7 real bookings sequentially first, then race the rest
        for (let i = 0; i < 7; i += 1) {
            const res = await request(app).post('/api/bookings').send(payload())
            expect(res.status).toBe(201)
        }

        const REQUEST_COUNT = 15
        const requests = Array.from({ length: REQUEST_COUNT }, () =>
            request(app).post('/api/bookings').send(payload())
        )
        const results = await Promise.all(requests)

        const succeeded = results.filter((r) => r.status === 201)
        const rejected = results.filter((r) => r.status === 409)
        expect(succeeded).toHaveLength(3)
        expect(rejected).toHaveLength(12)

        const doc = await SlotCapacity.findOne({ key: 'namakkal-coop-2026-09-10-10:30AM' })
        expect(doc.count).toBe(10)
    })

    test('20 simultaneous requests across TWO different slots (10 capacity each): all 20 succeed, each slot independently at exactly 10', async () => {
        const slotA = new Date(2026, 8, 10, 10, 30).toISOString()
        const slotB = new Date(2026, 8, 10, 11, 30).toISOString()
        const requests = [
            ...Array.from({ length: 10 }, () => request(app).post('/api/bookings').send(payload({ slotDateTime: slotA }))),
            ...Array.from({ length: 10 }, () => request(app).post('/api/bookings').send(payload({ slotDateTime: slotB }))),
        ]
        const results = await Promise.all(requests)
        expect(results.every((r) => r.status === 201)).toBe(true)

        const docA = await SlotCapacity.findOne({ key: 'namakkal-coop-2026-09-10-10:30AM' })
        const docB = await SlotCapacity.findOne({ key: 'namakkal-coop-2026-09-10-11:30AM' })
        expect(docA.count).toBe(10)
        expect(docB.count).toBe(10)
    })
})

describe('concurrent bookings never collide on the same token', () => {
    test('20 simultaneous bookings in the same (centre, produce, day) bucket — even across 2 slots so more than 10 can succeed — all get unique, gapless tokens', async () => {
        const slotA = new Date(2026, 8, 11, 10, 30).toISOString()
        const slotB = new Date(2026, 8, 11, 11, 30).toISOString()
        const requests = [
            ...Array.from({ length: 10 }, () => request(app).post('/api/bookings').send(payload({ slotDateTime: slotA }))),
            ...Array.from({ length: 10 }, () => request(app).post('/api/bookings').send(payload({ slotDateTime: slotB }))),
        ]
        const results = await Promise.all(requests)
        const tokens = results.map((r) => r.body.token)

        expect(tokens).toHaveLength(20)
        // no two bookings ever received the same token string
        expect(new Set(tokens).size).toBe(20)

        // and they're the exact set O01..O20, not just "20 unique values"
        // (proves the counter is gapless/sequential under concurrency too)
        const expected = Array.from({ length: 20 }, (_, i) => `O${String(i + 1).padStart(2, '0')}`)
        expect([...tokens].sort()).toEqual([...expected].sort())
    })
})
