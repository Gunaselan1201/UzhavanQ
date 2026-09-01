const jwt = require('jsonwebtoken')

function requireAdmin(req, res, next) {
    const header = req.headers.authorization || ''
    const [scheme, token] = header.split(' ')

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Missing or malformed Authorization header' })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.admin = { id: decoded.id, username: decoded.username, centre: decoded.centre }
        next()
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' })
    }
}

module.exports = requireAdmin
