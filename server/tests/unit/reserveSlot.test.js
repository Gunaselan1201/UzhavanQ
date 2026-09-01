const { connect, closeDatabase, clearCollections } = require('../setup/testDb')
const { reserveSlot, releaseSlot } = require('../../utils/reserveSlot')
const SlotCapacity = require('../../models/SlotCapacity')

// Why this matters: this single function is what stands between "reduce
// congestion at procurement centres" (the problem statement) and a
// centre that gets overbooked because the app let more farmers reserve
// a slot than it can physically handle.

beforeAll(async () => { await connect() })
afterAll(async () => { await closeDatabase() })
afterEach(async () => { await clearCollections() })

describe('reserveSlot', () => {
    test('allows the 1st through 10th booking for a fresh slot', async () => {
        const key = 'namakkal-coop-2026-09-01-10:30AM'
        for (let i = 1; i <= 10; i += 1) {
            const result = await reserveSlot(key)
            expect(result.ok).toBe(true)
            expect(result.count).toBe(i)
        }
    })

    test('rejects the 11th booking once count reaches capacity (10)', async () => {
        const key = 'namakkal-coop-2026-09-01-10:30AM'
        for (let i = 0; i < 10; i += 1) {
            const result = await reserveSlot(key)
            expect(result.ok).toBe(true)
        }
        const eleventh = await reserveSlot(key)
        expect(eleventh).toEqual({ ok: false, reason: 'SLOT_FULL' })

        // and the DB itself never exceeded capacity
        const doc = await SlotCapacity.findOne({ key })
        expect(doc.count).toBe(10)
    })

    test('a different slot key starts at its own independent count of 0', async () => {
        const keyA = 'namakkal-coop-2026-09-01-10:30AM'
        const keyB = 'namakkal-coop-2026-09-01-11:30AM'
        for (let i = 0; i < 10; i += 1) await reserveSlot(keyA)

        const resultB = await reserveSlot(keyB)
        expect(resultB).toEqual({ ok: true, count: 1 })
    })

    test('releaseSlot gives back a spot, allowing one more reservation past a prior full state', async () => {
        const key = 'namakkal-coop-2026-09-01-10:30AM'
        for (let i = 0; i < 10; i += 1) await reserveSlot(key)
        expect((await reserveSlot(key)).ok).toBe(false)

        await releaseSlot(key)
        const afterRelease = await reserveSlot(key)
        expect(afterRelease).toEqual({ ok: true, count: 10 })
    })
})
