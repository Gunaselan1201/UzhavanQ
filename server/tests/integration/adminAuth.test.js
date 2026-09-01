const request = require('supertest')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const app = require('../../app')
const { connect, closeDatabase, clearCollections } = require('../setup/testDb')
const Admin = require('../../models/Admin')

// Why this matters: the admin panel is what a centre officer uses to
// actually run the queue (mark delayed/postponed/completed, payment
// status). A weak login or a bypassable auth check here means anyone
// could tamper with the real-time queue state the farmers are relying on.

beforeAll(async () => { await connect() })
afterAll(async () => { await closeDatabase() })
afterEach(async () => { await clearCollections() })

async function seedAdmin({ username = 'NKL001', password = 'Tngovnkl', centre = 'namakkal-coop' } = {}) {
    const passwordHash = await bcrypt.hash(password, 10)
    return Admin.create({ username, passwordHash, centre })
}

describe('POST /api/admin/login', () => {
    test('correct credentials return a valid, verifiable JWT', async () => {
        await seedAdmin()
        const res = await request(app).post('/api/admin/login').send({ username: 'NKL001', password: 'Tngovnkl' })
        expect(res.status).toBe(200)
        expect(res.body.token).toBeDefined()
        expect(res.body.centre).toBe('namakkal-coop')

        const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET)
        expect(decoded.username).toBe('NKL001')
        expect(decoded.centre).toBe('namakkal-coop')
    })

    test('wrong password is rejected with 401, same generic message as a nonexistent user (no username enumeration)', async () => {
        await seedAdmin()
        const res = await request(app).post('/api/admin/login').send({ username: 'NKL001', password: 'wrong-password' })
        expect(res.status).toBe(401)
        expect(res.body.error).toBe('Invalid username or password')
    })

    test('a nonexistent username is rejected with 401', async () => {
        const res = await request(app).post('/api/admin/login').send({ username: 'does-not-exist', password: 'anything' })
        expect(res.status).toBe(401)
        expect(res.body.error).toBe('Invalid username or password')
    })

    test('the response never leaks passwordHash', async () => {
        await seedAdmin()
        const res = await request(app).post('/api/admin/login').send({ username: 'NKL001', password: 'Tngovnkl' })
        expect(res.body.passwordHash).toBeUndefined()
        expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/)
    })
})

describe('admin routes require a valid token', () => {
    test('no Authorization header returns 401', async () => {
        const res = await request(app).get('/api/admin/bookings')
        expect(res.status).toBe(401)
    })

    test('a malformed/tampered token returns 401', async () => {
        await seedAdmin()
        const loginRes = await request(app).post('/api/admin/login').send({ username: 'NKL001', password: 'Tngovnkl' })
        const tampered = loginRes.body.token.slice(0, -4) + 'XXXX' // corrupt the signature
        const res = await request(app).get('/api/admin/bookings').set('Authorization', `Bearer ${tampered}`)
        expect(res.status).toBe(401)
    })

    test('a token signed with a different secret is rejected (proves the server actually verifies the signature)', async () => {
        const forged = jwt.sign({ id: 'x', username: 'hacker', centre: 'namakkal-coop' }, 'wrong-secret', { expiresIn: '1h' })
        const res = await request(app).get('/api/admin/bookings').set('Authorization', `Bearer ${forged}`)
        expect(res.status).toBe(401)
    })

    test('an expired token is rejected', async () => {
        const expired = jwt.sign(
            { id: 'x', username: 'NKL001', centre: 'namakkal-coop' },
            process.env.JWT_SECRET,
            { expiresIn: '-1h' } // already expired
        )
        const res = await request(app).get('/api/admin/bookings').set('Authorization', `Bearer ${expired}`)
        expect(res.status).toBe(401)
    })

    test('a valid token is accepted', async () => {
        await seedAdmin()
        const loginRes = await request(app).post('/api/admin/login').send({ username: 'NKL001', password: 'Tngovnkl' })
        const res = await request(app).get('/api/admin/bookings').set('Authorization', `Bearer ${loginRes.body.token}`)
        expect(res.status).toBe(200)
    })
})
