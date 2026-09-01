const express = require('express')
const { upsertFarmer, getFarmerByPhone } = require('../controllers/farmerController')

const router = express.Router()

router.post('/', upsertFarmer)
router.get('/phone/:phone', getFarmerByPhone)

module.exports = router
