const request = require('supertest')
const bcrypt = require('bcrypt')
const app = require('../../app')
const { connect, closeDatabase, clearCollections } = require('../setup/testDb')
const Admin = require('../../models/Admin')
const Booking = require('../../models/Booking')

// Why this matters: multiple procurement centres share this one app.
// If an admin at Centre A could modify Centre B's bookings, one
// centre's staff could mark another centre's farmers "completed" or
// change their payment status — a real security boundary, not a
// cosmetic bug, so it's tested explicitly rather than assumed from
// the happy path.

beforeAll(async () => { await connect() })
afterAll(async () => { await closeDatabase() })
afterEach(async () => { await clearCollections() })

async function seedAdmin(username, centre) {
    const passwordHash = await bcrypt.hash('password123', 10)
    await Admin.create({ username, passwordHash, centre })
    const res = await request(app).post('/api/admin/login').send({ username, password: 'password123' })
    return res.body.token
}

let tokenCounter = 0

// token must be unique per (centre, produce, tokenDate) — see Booking.js's
// compound index — so a fixed 'O01' breaks the moment a test seeds more
// than one booking for the same centre on the same day.
async function seedBooking(centre) {
    tokenCounter += 1
    return Booking.create({
        farmerName: 'Ramesh Kumar',
        phone: '+91 98765 43210',
        location: 'Mohanur',
        produce: 'Onion',
        weight: 5,
        centre,
        slotDateTime: new Date(2026, 8, 5, 10, 30),
        tokenDate: '2026-09-05',
        token: `O${String(tokenCounter).padStart(2, '0')}`,
    })
}

describe('cross-centre security boundary', () => {
    test('an admin from Centre A cannot change the status of a booking belonging to Centre B', async () => {
        const tokenForCentreA = await seedAdmin('adminA', 'namakkal-coop')
        const centreBBooking = await seedBooking('salem-regulated')

        const res = await request(app)
            .patch(`/api/admin/bookings/${centreBBooking._id}/status`)
            .set('Authorization', `Bearer ${tokenForCentreA}`)
            .send({ status: 'completed' })

        expect(res.status).toBe(404) // not found *for this admin* — never leaks that it exists elsewhere

        // the real assertion: the booking's status in the DB must be untouched
        const unchanged = await Booking.findById(centreBBooking._id)
        expect(unchanged.status).toBe('confirmed')
    })

    test('an admin from Centre A CAN change a booking that actually belongs to Centre A (confirms the block above is centre-scoping, not a blanket bug)', async () => {
        const tokenForCentreA = await seedAdmin('adminA', 'namakkal-coop')
        const centreABooking = await seedBooking('namakkal-coop')

        const res = await request(app)
            .patch(`/api/admin/bookings/${centreABooking._id}/status`)
            .set('Authorization', `Bearer ${tokenForCentreA}`)
            .send({ status: 'completed' })

        expect(res.status).toBe(200)
        const updated = await Booking.findById(centreABooking._id)
        expect(updated.status).toBe('completed')
    })

    test('GET /api/admin/bookings only returns the logged-in admin\'s own centre', async () => {
        const tokenForCentreA = await seedAdmin('adminA', 'namakkal-coop')
        await seedBooking('namakkal-coop')
        await seedBooking('salem-regulated')
        await seedBooking('salem-regulated')

        const res = await request(app).get('/api/admin/bookings').set('Authorization', `Bearer ${tokenForCentreA}`)
        expect(res.status).toBe(200)
        expect(res.body).toHaveLength(1)
        expect(res.body[0].centre).toBe('namakkal-coop')
    })

    test('cross-centre payment update is also blocked the same way', async () => {
        const tokenForCentreA = await seedAdmin('adminA', 'namakkal-coop')
        const centreBBooking = await seedBooking('salem-regulated')

        const res = await request(app)
            .patch(`/api/admin/bookings/${centreBBooking._id}/payment`)
            .set('Authorization', `Bearer ${tokenForCentreA}`)
            .send({ status: 'processed' })

        expect(res.status).toBe(404)
        const unchanged = await Booking.findById(centreBBooking._id)
        expect(unchanged.payment.status).toBe('pending')
    })
})
