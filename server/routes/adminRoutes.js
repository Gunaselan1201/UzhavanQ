const express = require('express')
const { login } = require('../controllers/adminAuthController')
const {
    getBookings,
    updateStatus,
    updateArrived,
    updatePayment,
    closeSlot,
    reopenSlot,
    closeDay,
    reopenDay,
    getSlotsForDate,
    getStats,
    getHistory,
} = require('../controllers/adminBookingController')
const { getTrends } = require('../controllers/adminTrendsController')
const requireAdmin = require('../middleware/requireAdmin')

const router = express.Router()

// Public — this is how an admin obtains a token in the first place.
router.post('/login', login)

// Everything below requires a valid admin token.
router.get('/bookings', requireAdmin, getBookings)
router.patch('/bookings/:id/status', requireAdmin, updateStatus)
router.patch('/bookings/:id/arrived', requireAdmin, updateArrived)
router.patch('/bookings/:id/payment', requireAdmin, updatePayment)

router.get('/slots', requireAdmin, getSlotsForDate)
router.patch('/slots/close', requireAdmin, closeSlot)
router.patch('/slots/reopen', requireAdmin, reopenSlot)
router.post('/days/close', requireAdmin, closeDay)
router.delete('/days/close', requireAdmin, reopenDay)

router.get('/stats', requireAdmin, getStats)
router.get('/history', requireAdmin, getHistory)
router.get('/trends', requireAdmin, getTrends)

module.exports = router
