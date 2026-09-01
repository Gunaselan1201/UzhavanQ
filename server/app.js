// The Express app itself, separate from server.js's "connect to Mongo and
// listen on a port" bootstrap — so tests can import this directly and drive
// it with supertest against an in-memory database, without ever opening a
// real network port or touching the real MongoDB instance.
const express = require('express')
const cors = require('cors')
const bookingRoutes = require('./routes/bookingRoutes')
const farmerRoutes = require('./routes/farmerRoutes')
const adminRoutes = require('./routes/adminRoutes')

const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }))
app.use(express.json())

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' })
})

app.use('/api/bookings', bookingRoutes)
app.use('/api/farmers', farmerRoutes)
app.use('/api/admin', adminRoutes)

module.exports = app
