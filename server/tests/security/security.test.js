const request = require('supertest')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const app = require('../../app')
const { connect, closeDatabase, clearCollections } = require('../setup/testDb')
const Admin = require('../../models/Admin')

// Why this matters: the admin panel controls real queue state (delayed/
// postponed/completed, payment status) for real farmers waiting at a real
// centre. A login bypass or a leaked credential here doesn't just expose
// data — it lets someone falsify the exact status information the problem
// statement says farmers are currently uncertain about.

beforeAll(async () => { await connect() })
afterAll(async () => { await closeDatabase() })
afterEach(async () => { await clearCollections() })

async function seedAdmin(username = 'NKL001', password = 'Tngovnkl', centre = 'namakkal-coop') {
    const passwordHash = await bcrypt.hash(password, 10)
    return Admin.create({ username, passwordHash, centre })
}

describe('password/hash exposure', () => {
    test('login response never contains a passwordHash field', async () => {
        await seedAdmin()
        const res = await request(app).post('/api/admin/login').send({ username: 'NKL001', password: 'Tngovnkl' })
        expect(res.status).toBe(200)
        expect(res.body.passwordHash).toBeUndefined()
        expect(Object.keys(res.body).sort()).toEqual(['centre', 'token', 'username'])
    })

    test('GET /api/admin/bookings response contains no admin/password fields anywhere in the payload', async () => {
        const passwordHash = await bcrypt.hash('Tngovnkl', 10)
        await Admin.create({ username: 'NKL001', passwordHash, centre: 'namakkal-coop' })
        const login = await request(app).post('/api/admin/login').send({ username: 'NKL001', password: 'Tngovnkl' })
        const res = await request(app).get('/api/admin/bookings').set('Authorization', `Bearer ${login.body.token}`)
        expect(res.status).toBe(200)
        expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/i)
    })
})

describe('JWT tampering', () => {
    test('a token with its payload altered but signature left as-is is rejected', async () => {
        await seedAdmin()
        const login = await request(app).post('/api/admin/login').send({ username: 'NKL001', password: 'Tngovnkl' })
        const [header, , signature] = login.body.token.split('.')
        // swap in a payload claiming a different (more privileged-sounding) centre
        const forgedPayload = Buffer.from(JSON.stringify({ id: 'x', username: 'NKL001', centre: 'ANY-CENTRE' })).toString('base64url')
        const tampered = `${header}.${forgedPayload}.${signature}`

        const res = await request(app).get('/api/admin/bookings').set('Authorization', `Bearer ${tampered}`)
        expect(res.status).toBe(401)
    })

    test('a completely unsigned "alg: none" token is rejected', async () => {
        const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
        const nonePayload = Buffer.from(JSON.stringify({ id: 'x', username: 'NKL001', centre: 'namakkal-coop' })).toString('base64url')
        const noneToken = `${noneHeader}.${nonePayload}.`

        const res = await request(app).get('/api/admin/bookings').set('Authorization', `Bearer ${noneToken}`)
        expect(res.status).toBe(401)
    })
})

describe('CORS restriction', () => {
    test('the allowed-origin response header is the configured frontend origin, not a wildcard', async () => {
        const res = await request(app).get('/api/health').set('Origin', 'http://localhost:5173')
        expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173')
        expect(res.headers['access-control-allow-origin']).not.toBe('*')
    })

    test('an arbitrary, non-whitelisted origin does not get reflected back', async () => {
        const res = await request(app).get('/api/health').set('Origin', 'https://evil-example.com')
        expect(res.headers['access-control-allow-origin']).not.toBe('https://evil-example.com')
    })
})

describe('NoSQL operator injection on login', () => {
    // FOUND A REAL VULNERABILITY while writing this test, then fixed it
    // (see adminAuthController.js): { username: { "$gt": "" }, password:
    // <a real password> } returned a valid 200 + JWT — Mongo evaluated
    // $gt as a query operator against Admin.findOne({ username }), matching
    // any admin whose username is a non-empty string (i.e. every admin),
    // so an attacker who knew ANY admin's password but not their username
    // could still log in. Confirmed exploitable BEFORE the fix, confirmed
    // blocked AFTER — this test would fail again if the type check in
    // adminAuthController.js is ever removed.
    test('an operator-shaped username ({"$gt": ""}) paired with a REAL password is rejected with 400, not a successful login', async () => {
        await seedAdmin('NKL001', 'Tngovnkl', 'namakkal-coop')
        const res = await request(app)
            .post('/api/admin/login')
            .send({ username: { $gt: '' }, password: 'Tngovnkl' }) // the real password
        expect(res.status).toBe(400)
        expect(res.body.token).toBeUndefined()
    })

    test('an object-shaped username paired with a wrong password is rejected (defense in depth check)', async () => {
        await seedAdmin('NKL001', 'Tngovnkl', 'namakkal-coop')
        const res = await request(app)
            .post('/api/admin/login')
            .send({ username: { $ne: null }, password: 'anything' })
        expect(res.status).not.toBe(200)
    })

    test('an object-shaped password does not bypass the bcrypt check (and no longer 500s either)', async () => {
        await seedAdmin('NKL001', 'Tngovnkl', 'namakkal-coop')
        const res = await request(app)
            .post('/api/admin/login')
            .send({ username: 'NKL001', password: { $ne: null } })
        expect(res.status).toBe(400)
    })
})

describe('basic input validation on booking creation', () => {
    // Documents the CURRENT behavior (not necessarily desired behavior) —
    // see the written report for why this is flagged as a gap rather than
    // silently patched.
    test('farmerName accepts arbitrary content with no length cap or sanitization (documented gap, not a pass/fail on "should")', async () => {
        const scriptPayload = '<script>alert(1)</script>'.repeat(50)
        const res = await request(app).post('/api/bookings').send({
            farmerName: scriptPayload,
            phone: '+91 90000 00000',
            location: 'Mohanur',
            produce: 'Onion',
            weight: 5,
            centre: 'namakkal-coop',
            slotDateTime: new Date(2026, 8, 12, 10, 30).toISOString(),
        })
        // This currently succeeds — recorded here as a known gap (stored
        // XSS risk if farmerName is ever rendered unescaped anywhere,
        // e.g. a future admin-facing report), not asserted as a bug fix.
        expect(res.status).toBe(201)
        expect(res.body.farmerName).toBe(scriptPayload)
    })

    test('a negative weight is currently accepted (no minimum-value validation)', async () => {
        const res = await request(app).post('/api/bookings').send({
            farmerName: 'Test Farmer',
            phone: '+91 90000 00000',
            location: 'Mohanur',
            produce: 'Onion',
            weight: -5,
            centre: 'namakkal-coop',
            slotDateTime: new Date(2026, 8, 12, 11, 30).toISOString(),
        })
        expect(res.status).toBe(201)
        expect(res.body.weight).toBe(-5)
    })
})
