const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const Admin = require('../models/Admin')

async function login(req, res) {
    const { username, password } = req.body
    // `typeof` checks, not just truthiness — a JSON body can carry an object
    // where a string is expected (e.g. { "$gt": "" }), which Mongo would
    // otherwise evaluate as a query operator against Admin.findOne({ username })
    // below, matching any/every admin instead of one specific username.
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
        return res.status(400).json({ error: 'username and password are required' })
    }

    try {
        const admin = await Admin.findOne({ username })
        if (!admin) {
            return res.status(401).json({ error: 'Invalid username or password' })
        }

        const match = await bcrypt.compare(password, admin.passwordHash)
        if (!match) {
            return res.status(401).json({ error: 'Invalid username or password' })
        }

        const token = jwt.sign(
            { id: admin._id, username: admin.username, centre: admin.centre },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        )

        res.json({ token, centre: admin.centre, username: admin.username })
    } catch (err) {
        console.error('admin login failed:', err.message)
        res.status(500).json({ error: 'Could not log in' })
    }
}

module.exports = { login }
