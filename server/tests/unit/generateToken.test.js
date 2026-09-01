const { connect, closeDatabase, clearCollections } = require('../setup/testDb')
const { generateToken, toDateKey } = require('../../utils/generateToken')

// Why this matters for the project's actual goal: every farmer's token is
// how they know their place in the queue. A duplicate or out-of-order
// token means two farmers show up believing they're "next," which is
// exactly the confusion/congestion the problem statement asks to remove.

beforeAll(async () => { await connect() })
afterAll(async () => { await closeDatabase() })
afterEach(async () => { await clearCollections() })

describe('generateToken', () => {
    test('first token in a new (centre, produce, day) bucket is 01', async () => {
        const token = await generateToken({ centre: 'namakkal-coop', produce: 'onion', dateKey: '2026-09-01' })
        expect(token).toBe('O01')
    })

    test('sequential calls in the same bucket increment 01, 02, 03...', async () => {
        const args = { centre: 'namakkal-coop', produce: 'onion', dateKey: '2026-09-01' }
        const t1 = await generateToken(args)
        const t2 = await generateToken(args)
        const t3 = await generateToken(args)
        expect([t1, t2, t3]).toEqual(['O01', 'O02', 'O03'])
    })

    test('produce-letter prefix is the uppercased first letter of the produce name', async () => {
        const onion = await generateToken({ centre: 'namakkal-coop', produce: 'onion', dateKey: '2026-09-01' })
        const tomato = await generateToken({ centre: 'namakkal-coop', produce: 'tomato', dateKey: '2026-09-01' })
        const wheat = await generateToken({ centre: 'namakkal-coop', produce: 'wheat', dateKey: '2026-09-01' })
        expect(onion[0]).toBe('O')
        expect(tomato[0]).toBe('T')
        expect(wheat[0]).toBe('W')
    })

    test('sequence resets to 01 for a different produce, even same centre and day', async () => {
        await generateToken({ centre: 'namakkal-coop', produce: 'onion', dateKey: '2026-09-01' })
        await generateToken({ centre: 'namakkal-coop', produce: 'onion', dateKey: '2026-09-01' })
        // onion is now at 02 — tomato in the same centre/day must start fresh at 01
        const tomatoToken = await generateToken({ centre: 'namakkal-coop', produce: 'tomato', dateKey: '2026-09-01' })
        expect(tomatoToken).toBe('T01')
    })

    test('sequence resets to 01 for a different centre, even same produce and day', async () => {
        await generateToken({ centre: 'namakkal-coop', produce: 'onion', dateKey: '2026-09-01' })
        const otherCentreToken = await generateToken({ centre: 'salem-regulated', produce: 'onion', dateKey: '2026-09-01' })
        expect(otherCentreToken).toBe('O01')
    })

    test('sequence resets to 01 for a different day, even same centre and produce', async () => {
        await generateToken({ centre: 'namakkal-coop', produce: 'onion', dateKey: '2026-09-01' })
        const nextDayToken = await generateToken({ centre: 'namakkal-coop', produce: 'onion', dateKey: '2026-09-02' })
        expect(nextDayToken).toBe('O01')
    })

    test('sequence numbers are zero-padded to 2 digits', async () => {
        const args = { centre: 'namakkal-coop', produce: 'onion', dateKey: '2026-09-01' }
        let last
        for (let i = 0; i < 10; i += 1) last = await generateToken(args)
        expect(last).toBe('O10')
    })
})

describe('toDateKey', () => {
    test('formats a Date as YYYY-MM-DD using local time components', () => {
        const date = new Date(2026, 8, 1) // month is 0-indexed -> September
        expect(toDateKey(date)).toBe('2026-09-01')
    })

    test('pads single-digit month and day', () => {
        const date = new Date(2026, 0, 5) // January 5th
        expect(toDateKey(date)).toBe('2026-01-05')
    })
})
