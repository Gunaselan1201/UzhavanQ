require('dotenv').config()

const app = require('./app')
const connectDB = require('./config/db')
const Booking = require('./models/Booking')
const Counter = require('./models/Counter')

const PORT = process.env.PORT || 5000

connectDB().then(async () => {
    // Drops any index no longer declared in the schema and creates any
    // missing one — exactly what fixed the stale token unique-index bug.
    // Dev-only: syncIndexes() drops indexes, which is safe against a local
    // throwaway database but must never run unattended against production.
    if (process.env.NODE_ENV !== 'production') {
        await Booking.syncIndexes()
        await Counter.syncIndexes()
        console.log('Indexes synced (dev mode)')
    }

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`)
    })
})
