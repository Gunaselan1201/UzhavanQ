// Artillery processor — generates realistic-ish varied request data so the
// load test spreads across a handful of slots/days like a real morning
// rush would (farmers don't all pick the exact same second AND the exact
// same slot; they cluster onto a small number of popular slots), rather
// than either "everyone hits one slot" (unrealistically pathological) or
// "everyone hits a different slot" (never actually exercises contention).
const CENTRES = ['namakkal-coop', 'salem-regulated', 'erode-coop']
const PRODUCE = ['Onion', 'Tomato', 'Wheat']
const TIMES = [
    [10, 30], [11, 30], [12, 30], [14, 0], [15, 0], [16, 0],
]

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

function randomSlotDateTime() {
    const dayOffset = 1 + Math.floor(Math.random() * 3) // tomorrow..+3 days, always future
    const date = new Date()
    date.setDate(date.getDate() + dayOffset)
    const [h, m] = pick(TIMES)
    date.setHours(h, m, 0, 0)
    return date
}

module.exports.setBookingPayload = function setBookingPayload(context, events, done) {
    const slotDateTime = randomSlotDateTime()
    context.vars.farmerName = `Load Test Farmer ${Math.floor(Math.random() * 100000)}`
    context.vars.phone = `+91 9${String(Math.floor(Math.random() * 1000000000)).padStart(9, '0')}`
    context.vars.location = 'Load Test Location'
    context.vars.produce = pick(PRODUCE)
    context.vars.weight = (1 + Math.random() * 9).toFixed(1)
    context.vars.centre = pick(CENTRES)
    context.vars.slotDateTime = slotDateTime.toISOString()
    context.vars.dateOnly = slotDateTime.toISOString().slice(0, 10)
    return done()
}
