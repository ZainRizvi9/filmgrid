const express = require('express')
const router = express.Router()
const axios = require('axios')
const { INDIE_THEATRES, getIndieShowtimes } = require('../scrapers/indieTheatres')

const cache = new Map()
const CACHE_TTL = 2 * 60 * 60 * 1000

const THEATRE_KEYWORDS = ['cinema', 'theatre', 'theater', 'cineplex', 'amc', 'imax', 'landmark', 'odeon', 'cinemark', 'tiff', 'revue', 'lightbox', 'drive-in', 'multiplex', 'screenx', 'ultraavx']

const BLOCKLIST = [
  // fake/airbnb listings
  'hotel', 'inn', 'suites', 'marriott', 'hilton', 'fairfield', 'sheraton', 'hyatt',
  'courtyard', 'home w', 'elegant home', 'cozy', 'fireplace', 'airbnb', 'rental',
  'apartment', 'condo', 'house', 'basement', 'room for',
  // malls / retail
  'mall', 'shopping', 'plaza', 'smartcentre',
  // performing arts, not movie theatres
  'factory theatre', 'caa theatre', 'canadian stage', 'harbourfront', 'flack',
  'young centre', 'berkley', 'meridian', 'massey', 'roy thomson', 'four seasons centre',
  'princess of wales', 'mirvish', 'panasonic', 'opera', 'ballet', 'symphony',
  'concert hall', 'performing arts', 'comedy bar', 'second city',
  // misc false positives
  'studio', 'integration', 'unit', 'world brampton', 'meadowvale', 'cityview'
]

function parseTimes(raw) {
  if (!raw || typeof raw !== 'string') return []
  const matches = raw.match(/\d{1,2}:\d{2}\s?[ap]\.?m\.?/gi)
  return matches ? matches.map(t => t.trim()) : [raw]
}

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

router.get('/', async (req, res) => {
  const { lat, lng } = req.query
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' })

  const cacheKey = `${parseFloat(lat).toFixed(2)},${parseFloat(lng).toFixed(2)}`
  if (cache.has(cacheKey)) {
    const { data, timestamp } = cache.get(cacheKey)
    if (Date.now() - timestamp < CACHE_TTL) return res.json(data)
  }

  try {
    const response = await axios.get('https://serpapi.com/search', {
      params: {
        engine: 'google_maps',
        q: 'movie theatre',
        ll: `@${lat},${lng},14z`,
        type: 'search',
        api_key: process.env.SERPAPI_KEY
      }
    })

    const places = response.data.local_results || []

    const chainTheatres = places
      .filter(place => {
        const name = (place.title || '').toLowerCase()
        const hasKeyword = THEATRE_KEYWORDS.some(k => name.includes(k))
        const isBlocked = BLOCKLIST.some(b => name.includes(b))
        return hasKeyword && !isBlocked
      })
      .map(place => {
        const tLat = place.gps_coordinates?.latitude
        const tLng = place.gps_coordinates?.longitude
        const distance = tLat && tLng ? getDistanceKm(parseFloat(lat), parseFloat(lng), tLat, tLng) : null
        return {
          id: place.place_id,
          name: place.title,
          address: place.address,
          rating: place.rating,
          lat: tLat,
          lng: tLng,
          url: place.website || null,
          distance: distance ? parseFloat(distance.toFixed(1)) : null,
          type: ['cineplex','amc','landmark','odeon','cinemark'].some(c =>
            place.title?.toLowerCase().includes(c)) ? 'chain' : 'independent',
          isIndie: false
        }
      })
      .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999))

    const existingNames = new Set(chainTheatres.map(t => t.name.toLowerCase()))
    const newIndies = INDIE_THEATRES
      .filter(t => !existingNames.has(t.name.toLowerCase()))
      .map(t => {
        const distance = t.lat && t.lng ? getDistanceKm(parseFloat(lat), parseFloat(lng), t.lat, t.lng) : null
        return { ...t, isIndie: true, distance: distance ? parseFloat(distance.toFixed(1)) : null }
      })

    const theatres = [...chainTheatres, ...newIndies].sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999))
    cache.set(cacheKey, { data: theatres, timestamp: Date.now() })
    res.json(theatres)
  } catch (err) {
    console.error('SerpApi error:', err.response?.data || err.message)
    res.status(500).json({ error: 'Failed to fetch theatres' })
  }
})

router.get('/showtimes', async (req, res) => {
  const { theatre_name, lat, lng, theatre_id } = req.query
  if (!theatre_name) return res.status(400).json({ error: 'theatre_name required' })

  const cacheKey = `showtimes_${theatre_id || theatre_name}`
  if (cache.has(cacheKey)) {
    const { data, timestamp } = cache.get(cacheKey)
    if (Date.now() - timestamp < CACHE_TTL) return res.json(data)
  }

  const indieTheatre = INDIE_THEATRES.find(t =>
    t.id === theatre_id || t.name.toLowerCase() === theatre_name.toLowerCase()
  )

  if (indieTheatre) {
    const showtimes = await getIndieShowtimes(indieTheatre.id)
    cache.set(cacheKey, { data: showtimes, timestamp: Date.now() })
    return res.json(showtimes)
  }

  try {
    const response = await axios.get('https://serpapi.com/search', {
      params: {
        engine: 'google',
        q: `${theatre_name} showtimes today`,
        ll: `@${lat},${lng},14z`,
        hl: 'en',
        gl: 'ca',
        api_key: process.env.SERPAPI_KEY
      }
    })

    const showtimes = response.data.showtimes?.[0]?.movies || []

    const formatted = showtimes.map(movie => {
      const allTimes = []
      movie.showing?.forEach(s => {
        const times = Array.isArray(s.time) ? s.time : parseTimes(s.time)
        const format = s.type || 'Standard'
        times.forEach(t => allTimes.push({ time: t, format }))
      })
      return {
        title: movie.name,
        times: allTimes,
        prices: movie.showing?.map(s => s.ticket_info?.[0]?.value) || []
      }
    })

    cache.set(cacheKey, { data: formatted, timestamp: Date.now() })
    res.json(formatted)
  } catch (err) {
    console.error('Showtimes error:', err.response?.data || err.message)
    res.status(500).json({ error: 'Failed to fetch showtimes' })
  }
})

module.exports = router