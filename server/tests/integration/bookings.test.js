const request = require('supertest')
const app = require('../../app')
const { connect, closeDatabase, clearCollections } = require('../setup/testDb')
const SlotCapacity = require('../../models/SlotCapacity')

// Why this matters: this is the actual farmer-facing booking flow end to
// end through the real HTTP layer — the same path the app hits in
// production, not just the isolated logic underneath it.

beforeAll(async () => { await connect() })
afterAll(async () => { await closeDatabase() })
afterEach(async () => { await clearCollections() })

const validPayload = () => ({
    farmerName: 'Ramesh Kumar',
    phone: '+91 98765 43210',
    location: 'Mohanur',
    produce: 'Onion',
    weight: 5,
    centre: 'namakkal-coop',
    slotDateTime: new Date(2026, 8, 5, 10, 30).toISOString(), // Sept 5 2026, 10:30 AM
})

describe('POST /api/bookings', () => {
    test('a valid booking succeeds with 201 and a real generated token', async () => {
        const res = await request(app).post('/api/bookings').send(validPayload())
        expect(res.status).toBe(201)
        expect(res.body.token).toBe('O01')
        expect(res.body._id).toBeDefined()
        expect(res.body.status).toBe('confirmed')
    })

    test('missing a required field returns 400, not a 500 or a silent partial booking', async () => {
        const { farmerName, ...incomplete } = validPayload()
        const res = await request(app).post('/api/bookings').send(incomplete)
        expect(res.status).toBe(400)
        expect(res.body.error).toMatch(/farmerName/)
    })

    test('a slotDateTime that is not a real value returns 400', async () => {
        const res = await request(app).post('/api/bookings').send({ ...validPayload(), slotDateTime: 'not-a-date' })
        expect(res.status).toBe(400)
    })

    test('a slotDateTime that does not match one of the fixed bookable times returns 400', async () => {
        const offSlot = new Date(2026, 8, 5, 9, 15).toISOString() // 9:15 AM isn't a real slot
        const res = await request(app).post('/api/bookings').send({ ...validPayload(), slotDateTime: offSlot })
        expect(res.status).toBe(400)
    })

    test('booking a slot that is already at capacity (10) returns 409, and the 11th booking is rejected', async () => {
        const payload = validPayload()
        for (let i = 0; i < 10; i += 1) {
            const res = await request(app).post('/api/bookings').send(payload)
            expect(res.status).toBe(201)
        }
        const eleventh = await request(app).post('/api/bookings').send(payload)
        expect(eleventh.status).toBe(409)

        // the capacity document itself must reflect exactly 10, not 11
        const doc = await SlotCapacity.findOne({ key: 'namakkal-coop-2026-09-05-10:30AM' })
        expect(doc.count).toBe(10)
    })
})

describe('GET /api/bookings/availability', () => {
    test('an empty slot day reports all 6 slots as available with 0 booked', async () => {
        const res = await request(app).get('/api/bookings/availability').query({ centre: 'namakkal-coop', date: '2026-09-06' })
        expect(res.status).toBe(200)
        expect(res.body).toHaveLength(6)
        expect(res.body.every((s) => s.status === 'available' && s.bookedCount === 0)).toBe(true)
    })

    test('after seeding 6 bookings into one slot, it reports "almost-full"', async () => {
        const payload = { ...validPayload(), slotDateTime: new Date(2026, 8, 7, 10, 30).toISOString() }
        for (let i = 0; i < 6; i += 1) {
            await request(app).post('/api/bookings').send(payload)
        }
        const res = await request(app).get('/api/bookings/availability').query({ centre: 'namakkal-coop', date: '2026-09-07' })
        const slot = res.body.find((s) => s.time === '10:30 AM')
        expect(slot).toEqual({ time: '10:30 AM', bookedCount: 6, status: 'almost-full' })
    })

    test('after seeding exactly 10 bookings, it reports "full"', async () => {
        const payload = { ...validPayload(), slotDateTime: new Date(2026, 8, 8, 10, 30).toISOString() }
        for (let i = 0; i < 10; i += 1) {
            await request(app).post('/api/bookings').send(payload)
        }
        const res = await request(app).get('/api/bookings/availability').query({ centre: 'namakkal-coop', date: '2026-09-08' })
        const slot = res.body.find((s) => s.time === '10:30 AM')
        expect(slot).toEqual({ time: '10:30 AM', bookedCount: 10, status: 'full' })
    })

    test('missing centre or date returns 400', async () => {
        const res = await request(app).get('/api/bookings/availability').query({ centre: 'namakkal-coop' })
        expect(res.status).toBe(400)
    })
})
