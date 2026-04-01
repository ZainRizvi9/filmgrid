const express = require('express')
const router = express.Router()
const axios = require('axios')

router.get('/details', async (req, res) => {
  const { title } = req.query
  if (!title) return res.status(400).json({ error: 'title required' })
  try {
    const response = await axios.get('https://api.themoviedb.org/3/search/movie', {
      params: { api_key: process.env.TMDB_KEY, query: title }
    })
    const movie = response.data.results?.[0]
    if (!movie) return res.json(null)
    res.json({
      title: movie.title,
      poster: `https://image.tmdb.org/t/p/w300${movie.poster_path}`,
      overview: movie.overview,
      rating: movie.vote_average,
      year: movie.release_date?.slice(0, 4),
      genre_ids: movie.genre_ids
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch movie details' })
  }
})

router.get('/search', async (req, res) => {
  const { title, lat, lng } = req.query
  if (!title || !lat || !lng) return res.status(400).json({ error: 'title, lat and lng required' })

  try {
    const response = await axios.get('https://serpapi.com/search', {
      params: {
        engine: 'google',
        q: `${title} movie showtimes`,
        location: 'Toronto, Ontario, Canada',
        hl: 'en',
        gl: 'ca',
        api_key: process.env.SERPAPI_KEY
      }
    })

    const allShowtimes = response.data.showtimes || []
    console.log('serpapi keys:', Object.keys(response.data))
    console.log('showtimes count:', allShowtimes.length)
    console.log('movie names:', allShowtimes.flatMap(d => d.movies?.map(m => m.name) || []))

    const results = []

    allShowtimes.forEach(day => {
      day.movies?.forEach(movie => {
        movie.showing?.forEach(showing => {
          const theatreName = showing.name
          if (!theatreName) return
          const times = Array.isArray(showing.time) ? showing.time : [showing.time].filter(Boolean)
          const existing = results.find(r => r.theatre === theatreName)
          if (existing) {
            existing.times.push(...times)
          } else {
            results.push({ theatre: theatreName, times, link: showing.link || null })
          }
        })
      })
    })

    console.log('results count:', results.length)
    res.json(results)
  } catch (err) {
    console.error('Movie search error:', err.response?.data || err.message)
    res.status(500).json({ error: 'Failed to search showtimes' })
  }
})

module.exports = router