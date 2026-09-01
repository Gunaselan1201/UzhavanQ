const express = require('express')
const { createBooking, getBookingById, getSlotAvailability } = require('../controllers/bookingController')

const router = express.Router()

router.post('/', createBooking)
// Must be registered before '/:id' — otherwise Express matches
// GET /availability to the :id route with id="availability".
router.get('/availability', getSlotAvailability)
router.get('/:id', getBookingById)

module.exports = router
