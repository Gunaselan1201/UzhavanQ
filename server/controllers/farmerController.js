const Farmer = require('../models/Farmer')

// Called right after OTP verification succeeds. Creates the account on a
// phone's first-ever login; on every login after that it just returns the
// existing record untouched — a later login must never silently overwrite
// a name the farmer has since edited (once profile editing exists).
async function upsertFarmer(req, res) {
    const { phone, name } = req.body
    if (!phone || !name) {
        return res.status(400).json({ error: 'phone and name are required' })
    }

    try {
        let farmer = await Farmer.findOne({ phone })
        if (!farmer) {
            farmer = await Farmer.create({ phone, name })
            return res.status(201).json(farmer)
        }
        res.json(farmer)
    } catch (err) {
        console.error('upsertFarmer failed:', err.message)
        res.status(500).json({ error: 'Could not save farmer profile' })
    }
}

async function getFarmerByPhone(req, res) {
    try {
        const farmer = await Farmer.findOne({ phone: req.params.phone })
        if (!farmer) return res.status(404).json({ error: 'Farmer not found' })
        res.json(farmer)
    } catch (err) {
        console.error('getFarmerByPhone failed:', err.message)
        res.status(500).json({ error: 'Could not fetch farmer profile' })
    }
}

module.exports = { upsertFarmer, getFarmerByPhone }
