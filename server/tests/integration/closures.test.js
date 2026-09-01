const request = require('supertest')
const bcrypt = require('bcrypt')
const app = require('../../app')
const { connect, closeDatabase, clearCollections } = require('../setup/testDb')
const Admin = require('../../models/Admin')
const Booking = require('../../models/Booking')
const SlotCapacity = require('../../models/SlotCapacity')
const CentreClosure = require('../../models/CentreClosure')

// Why this matters: an admin closing a slot/day for a real reason
// (equipment down, holiday) must not silently strand the farmers who
// already booked it — they need to end up in a state (postponed) that's
// visible and actionable, not just vanish from the system.

beforeAll(async () => { await connect() })
afterAll(async () => { await closeDatabase() })
afterEach(async () => { await clearCollections() })

async function adminToken(centre = 'namakkal-coop') {
    const passwordHash = await bcrypt.hash('password123', 10)
    await Admin.create({ username: 'admin1', passwordHash, centre })
    const res = await request(app).post('/api/admin/login').send({ username: 'admin1', password: 'password123' })
    return res.body.token
}

async function createBooking(overrides = {}) {
    const res = await request(app).post('/api/bookings').send({
        farmerName: 'Ramesh Kumar',
        phone: `+91 9${Math.floor(Math.random() * 1000000000)}`,
        location: 'Mohanur',
        produce: 'Onion',
        weight: 5,
        centre: 'namakkal-coop',
        slotDateTime: new Date(2026, 8, 20, 10, 30).toISOString(),
        ...overrides,
    })
    return res.body
}

describe('closing a slot auto-postpones existing bookings', () => {
    test('3 bookings in a slot all flip to postponed, each with a matching history entry, when the slot is closed', async () => {
        const token = await adminToken()
        const bookings = [await createBooking(), await createBooking(), await createBooking()]

        const closeRes = await request(app)
            .patch('/api/admin/slots/close')
            .set('Authorization', `Bearer ${token}`)
            .send({ date: '2026-09-20', time: '10:30 AM' })

        expect(closeRes.status).toBe(200)
        expect(closeRes.body.postponedCount).toBe(3)

        for (const b of bookings) {
            const fresh = await Booking.findById(b._id)
            expect(fresh.status).toBe('postponed')
            const lastEntry = fresh.history[fresh.history.length - 1]
            expect(lastEntry.action).toBe('status_changed')
            expect(lastEntry.admin).toBe('admin1')
            expect(lastEntry.detail).toMatch(/closed by admin/)
        }
    })

    test('an already-completed booking in the slot is left untouched by the closure', async () => {
        const token = await adminToken()
        const booking = await createBooking()
        await request(app)
            .patch(`/api/admin/bookings/${booking._id}/status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'completed' })

        await request(app)
            .patch('/api/admin/slots/close')
            .set('Authorization', `Bearer ${token}`)
            .send({ date: '2026-09-20', time: '10:30 AM' })

        const fresh = await Booking.findById(booking._id)
        expect(fresh.status).toBe('completed') // NOT postponed
    })

    test('reopening a slot does NOT un-postpone bookings (stays a manual decision)', async () => {
        const token = await adminToken()
        const booking = await createBooking()
        await request(app).patch('/api/admin/slots/close').set('Authorization', `Bearer ${token}`).send({ date: '2026-09-20', time: '10:30 AM' })
        await request(app).patch('/api/admin/slots/reopen').set('Authorization', `Bearer ${token}`).send({ date: '2026-09-20', time: '10:30 AM' })

        const fresh = await Booking.findById(booking._id)
        expect(fresh.status).toBe('postponed') // still postponed
        const doc = await SlotCapacity.findOne({ key: 'namakkal-coop-2026-09-20-10:30AM' })
        expect(doc.closed).toBe(false)
    })

    test('a closed slot rejects new bookings with 409', async () => {
        const token = await adminToken()
        await request(app).patch('/api/admin/slots/close').set('Authorization', `Bearer ${token}`).send({ date: '2026-09-21', time: '11:30 AM' })

        const res = await request(app).post('/api/bookings').send({
            farmerName: 'Test Farmer',
            phone: '+91 90000 00001',
            location: 'Mohanur',
            produce: 'Onion',
            weight: 5,
            centre: 'namakkal-coop',
            slotDateTime: new Date(2026, 8, 21, 11, 30).toISOString(),
        })
        expect(res.status).toBe(409)
        expect(res.body.error).toMatch(/closed/i)
    })
})

describe('closing a whole day', () => {
    test('every non-completed booking that day is postponed, across multiple time slots', async () => {
        const token = await adminToken()
        const morning = await createBooking({ slotDateTime: new Date(2026, 8, 22, 10, 30).toISOString() })
        const afternoon = await createBooking({ slotDateTime: new Date(2026, 8, 22, 14, 0).toISOString() })

        const res = await request(app)
            .post('/api/admin/days/close')
            .set('Authorization', `Bearer ${token}`)
            .send({ date: '2026-09-22', reason: 'Public holiday' })

        expect(res.status).toBe(200)
        expect(res.body.postponedCount).toBe(2)

        expect((await Booking.findById(morning._id)).status).toBe('postponed')
        expect((await Booking.findById(afternoon._id)).status).toBe('postponed')
    })

    test('a closed day rejects new bookings with 409, for any time slot on that date', async () => {
        const token = await adminToken()
        await request(app).post('/api/admin/days/close').set('Authorization', `Bearer ${token}`).send({ date: '2026-09-23', reason: 'Staff shortage' })

        const res = await request(app).post('/api/bookings').send({
            farmerName: 'Test Farmer',
            phone: '+91 90000 00002',
            location: 'Mohanur',
            produce: 'Onion',
            weight: 5,
            centre: 'namakkal-coop',
            slotDateTime: new Date(2026, 8, 23, 15, 0).toISOString(),
        })
        expect(res.status).toBe(409)
        expect(res.body.error).toMatch(/closed/i)
    })

    test('DELETE /api/admin/days/close reopens the day — new bookings succeed again', async () => {
        const token = await adminToken()
        await request(app).post('/api/admin/days/close').set('Authorization', `Bearer ${token}`).send({ date: '2026-09-24', reason: 'test' })
        await request(app).delete('/api/admin/days/close').set('Authorization', `Bearer ${token}`).send({ date: '2026-09-24' })

        expect(await CentreClosure.findOne({ centre: 'namakkal-coop', date: '2026-09-24' })).toBeNull()

        const res = await request(app).post('/api/bookings').send({
            farmerName: 'Test Farmer',
            phone: '+91 90000 00003',
            location: 'Mohanur',
            produce: 'Onion',
            weight: 5,
            centre: 'namakkal-coop',
            slotDateTime: new Date(2026, 8, 24, 10, 30).toISOString(),
        })
        expect(res.status).toBe(201)
    })
})

describe('GET /api/bookings/availability reports "closed"', () => {
    test('a slot-level closure reports status "closed" for just that slot', async () => {
        const token = await adminToken()
        await request(app).patch('/api/admin/slots/close').set('Authorization', `Bearer ${token}`).send({ date: '2026-09-25', time: '12:30 PM' })

        const res = await request(app).get('/api/bookings/availability').query({ centre: 'namakkal-coop', date: '2026-09-25' })
        const closedSlot = res.body.find((s) => s.time === '12:30 PM')
        const otherSlot = res.body.find((s) => s.time === '10:30 AM')
        expect(closedSlot.status).toBe('closed')
        expect(otherSlot.status).toBe('available')
    })

    test('a day-level closure reports status "closed" for every slot that day', async () => {
        const token = await adminToken()
        await request(app).post('/api/admin/days/close').set('Authorization', `Bearer ${token}`).send({ date: '2026-09-26', reason: 'test' })

        const res = await request(app).get('/api/bookings/availability').query({ centre: 'namakkal-coop', date: '2026-09-26' })
        expect(res.body.every((s) => s.status === 'closed')).toBe(true)
    })
})

describe('cross-centre isolation for closures', () => {
    test('an admin at Centre A closing a slot does not affect Centre B\'s identical slot', async () => {
        const tokenA = await adminToken('namakkal-coop')
        await request(app).patch('/api/admin/slots/close').set('Authorization', `Bearer ${tokenA}`).send({ date: '2026-09-27', time: '10:30 AM' })

        const res = await request(app).get('/api/bookings/availability').query({ centre: 'salem-regulated', date: '2026-09-27' })
        const slot = res.body.find((s) => s.time === '10:30 AM')
        expect(slot.status).toBe('available')
    })
})

describe('audit trail (history array)', () => {
    test('a status update logs a history entry with the admin\'s username', async () => {
        const token = await adminToken()
        const booking = await createBooking()

        await request(app)
            .patch(`/api/admin/bookings/${booking._id}/status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'delayed', delayMinutes: 20 })

        const fresh = await Booking.findById(booking._id)
        expect(fresh.history).toHaveLength(1)
        expect(fresh.history[0]).toMatchObject({ action: 'status_changed', admin: 'admin1', detail: 'Delayed +20 min' })
    })

    test('payment and arrived updates also log history — every admin write path, not just status', async () => {
        const token = await adminToken()
        const booking = await createBooking()

        await request(app).patch(`/api/admin/bookings/${booking._id}/arrived`).set('Authorization', `Bearer ${token}`).send({ arrived: true })
        await request(app).patch(`/api/admin/bookings/${booking._id}/payment`).set('Authorization', `Bearer ${token}`).send({ status: 'processed' })

        const fresh = await Booking.findById(booking._id)
        expect(fresh.history.map((h) => h.action)).toEqual(['arrived_updated', 'payment_updated'])
    })

    test('multiple actions accumulate in chronological order, oldest first', async () => {
        const token = await adminToken()
        const booking = await createBooking()

        await request(app).patch(`/api/admin/bookings/${booking._id}/status`).set('Authorization', `Bearer ${token}`).send({ status: 'delayed', delayMinutes: 10 })
        await request(app).patch(`/api/admin/bookings/${booking._id}/arrived`).set('Authorization', `Bearer ${token}`).send({ arrived: true })
        await request(app).patch(`/api/admin/bookings/${booking._id}/status`).set('Authorization', `Bearer ${token}`).send({ status: 'completed' })

        const fresh = await Booking.findById(booking._id)
        expect(fresh.history.map((h) => h.action)).toEqual(['status_changed', 'arrived_updated', 'status_changed'])
        expect(fresh.history[fresh.history.length - 1].detail).toBe('Status changed to completed')
    })
})

describe('GET /api/admin/stats', () => {
    test('completedToday includes count and the actual list, scoped to today only', async () => {
        const token = await adminToken()
        const todaySlot = new Date()
        todaySlot.setHours(10, 30, 0, 0)
        if (todaySlot < new Date()) todaySlot.setDate(todaySlot.getDate())
        const booking = await createBooking({ slotDateTime: todaySlot.toISOString() })

        await request(app)
            .patch(`/api/admin/bookings/${booking._id}/status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'completed' })

        const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(200)
        expect(res.body.completedToday.count).toBe(1)
        expect(res.body.completedToday.bookings[0]).toMatchObject({
            token: booking.token,
            farmerName: 'Ramesh Kumar',
            produce: 'Onion',
        })
        expect(res.body.completedToday.bookings[0].timeCompleted).toBeDefined()
    })

    test('recentActivity merges and sorts history across all of this centre\'s bookings, newest first, capped at 10', async () => {
        const token = await adminToken()
        const b1 = await createBooking()
        const b2 = await createBooking()

        await request(app).patch(`/api/admin/bookings/${b1._id}/arrived`).set('Authorization', `Bearer ${token}`).send({ arrived: true })
        await new Promise((r) => setTimeout(r, 10))
        await request(app).patch(`/api/admin/bookings/${b2._id}/arrived`).set('Authorization', `Bearer ${token}`).send({ arrived: true })

        const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${token}`)
        expect(res.body.recentActivity.length).toBeGreaterThanOrEqual(2)
        // newest first
        expect(new Date(res.body.recentActivity[0].timestamp).getTime())
            .toBeGreaterThanOrEqual(new Date(res.body.recentActivity[1].timestamp).getTime())
    })
})

describe('GET /api/admin/history', () => {
    test('paginates and reports totalCount/totalPages correctly', async () => {
        const token = await adminToken()
        const booking = await createBooking()
        // 25 actions -> more than one page at the 20-per-page default
        for (let i = 0; i < 25; i += 1) {
            await request(app).patch(`/api/admin/bookings/${booking._id}/arrived`).set('Authorization', `Bearer ${token}`).send({ arrived: i % 2 === 0 })
        }

        const page1 = await request(app).get('/api/admin/history').set('Authorization', `Bearer ${token}`).query({ page: 1 })
        expect(page1.body.entries).toHaveLength(20)
        expect(page1.body.totalCount).toBe(25)
        expect(page1.body.totalPages).toBe(2)

        const page2 = await request(app).get('/api/admin/history').set('Authorization', `Bearer ${token}`).query({ page: 2 })
        expect(page2.body.entries).toHaveLength(5)
    })
})
