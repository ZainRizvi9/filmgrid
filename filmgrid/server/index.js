console.log('starting...')
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
require('dotenv').config()

const app = express()
app.use(cors())
app.use(express.json())

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB error:', err))

app.use('/api/theatres', require('./routes/theatres'))
app.use('/api/movies', require('./routes/movies'))

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`)
})