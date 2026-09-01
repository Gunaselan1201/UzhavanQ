const mongoose = require('mongoose')

async function connectDB() {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 8000,
        })
        console.log(`MongoDB connected: ${conn.connection.host}`)
    } catch (err) {
        console.error(`MongoDB connection failed: ${err.message}`)
        process.exit(1)
    }
}

module.exports = connectDB
