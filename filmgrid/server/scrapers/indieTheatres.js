const axios = require('axios')
const cheerio = require('cheerio')

const INDIE_THEATRES = [
  {
    id: 'tiff-lightbox',
    name: 'TIFF Lightbox',
    address: '350 King St W, Toronto',
    lat: 43.6468,
    lng: -79.3905,
    type: 'independent',
    rating: 4.7,
    url: 'https://www.tiff.net/whats-on',
    scraper: 'tiff'
  },
  {
    id: 'revue-cinema',
    name: 'Revue Cinema',
    address: '400 Roncesvalles Ave, Toronto',
    lat: 43.6461,
    lng: -79.4484,
    type: 'independent',
    rating: 4.8,
    url: 'https://revuecinema.ca/films',
    scraper: 'revue'
  },
  {
    id: 'paradise-theatre',
    name: 'Paradise Theatre',
    address: '1006 Bloor St W, Toronto',
    lat: 43.6614,
    lng: -79.4287,
    type: 'independent',
    rating: 4.6,
    url: 'https://www.paradiseonbloor.com',
    scraper: 'paradise'
  },
  {
    id: 'hot-docs-ted-rogers',
    name: 'Hot Docs Ted Rogers Cinema',
    address: '506 Bloor St W, Toronto',
    lat: 43.6657,
    lng: -79.4063,
    type: 'independent',
    rating: 4.6,
    url: 'https://hotdocs.ca/whats-on',
    scraper: 'hotdocs'
  },
  {
    id: 'fox-theatre',
    name: 'Fox Theatre',
    address: '2236 Queen St E, Toronto',
    lat: 43.6687,
    lng: -79.3007,
    type: 'independent',
    rating: 4.5,
    url: 'https://foxtheatre.ca',
    scraper: 'fox'
  }
]

async function scrapeTIFF() {
  try {
    const today = new Date().toISOString().split('T')[0]
    const res = await axios.get(`https://www.tiff.net/api/films?date=${today}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      timeout: 8000
    })

    const films = res.data?.films || res.data?.data || res.data || []
    if (!Array.isArray(films)) return []

    return films.slice(0, 10).map(film => ({
      title: film.title || film.name || '',
      times: film.showtimes?.map(s => s.time || s.startTime) || [],
      prices: [],
      link: film.url ? `https://www.tiff.net${film.url}` : 'https://www.tiff.net/whats-on'
    })).filter(f => f.title)
  } catch (err) {
    console.error('TIFF scrape failed:', err.message)
    return []
  }
}

async function scrapeRevue() {
  try {
    const res = await axios.get('https://revuecinema.ca/films', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000
    })
    const $ = cheerio.load(res.data)
    const movies = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    $('.brxe-vvpuki').each((_, el) => {
      const titleEl = $(el).find('h5.brxe-xqcpwc a')
      const title = titleEl.text().trim()
      const link = titleEl.attr('href') || 'https://revuecinema.ca/films'
      if (!title) return

      const times = []
      $(el).find('.brxe-ndxpjc').each((_, timeEl) => {
        const raw = $(timeEl).text().trim()
        if (!raw) return
        try {
          const dateMatch = raw.match(/(\w+ \w+ \d+), (\d+:\d+ [AP]M)/)
          if (!dateMatch) return
          const showDate = new Date(`${dateMatch[1]} ${today.getFullYear()} ${dateMatch[2]}`)
          if (showDate >= today) times.push(raw)
        } catch {}
      })

      if (times.length > 0) {
        movies.push({ title, times, prices: [], link })
      }
    })

    return movies.slice(0, 10)
  } catch (err) {
    console.error('Revue scrape failed:', err.message)
    return []
  }
}

async function scrapeParadise() {
  try {
    const res = await axios.get('https://paradiseonbloor.com/home', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000
    })
    const $ = cheerio.load(res.data)
    const movies = []

    $('.panel[data-type="now-playing"] .show').each((_, el) => {
      const titleEl = $(el).find('h2')
      const title = titleEl.text().trim()
      if (!title) return

      const link = $(el).find('a[href*="/movies/"]').first().attr('href')
        || 'https://paradiseonbloor.com'

      const showtimesEl = $(el).next('ol.showtimes')
      const times = []
      const links = []
      showtimesEl.find('a.showtime').each((_, t) => {
        const time = $(t).text().trim()
        const bookingLink = $(t).attr('href')
        if (time) {
          times.push(time)
          links.push(bookingLink || link)
        }
      })

      if (times.length > 0) {
        movies.push({ title, times, links, prices: [], link })
      }
    })

    return movies
  } catch (err) {
    console.error('Paradise scrape failed:', err.message)
    return []
  }
}

async function scrapeHotDocs() {
  try {
    const res = await axios.get('https://hotdocs.ca/whats-on', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 8000
    })
    const $ = cheerio.load(res.data)
    const movies = []

    $('[class*="film"], [class*="event"], article, [class*="card"]').each((_, el) => {
      const title = $(el).find('h1, h2, h3, [class*="title"]').first().text().trim()
      const time = $(el).find('[class*="time"], [class*="date"], time').first().text().trim()
      const link = $(el).find('a').first().attr('href')
      if (title && title.length > 2) {
        movies.push({
          title,
          times: time ? [time] : [],
          prices: [],
          link: link ? (link.startsWith('http') ? link : `https://hotdocs.ca${link}`) : 'https://hotdocs.ca/whats-on'
        })
      }
    })
    return movies.slice(0, 8)
  } catch (err) {
    console.error('Hot Docs scrape failed:', err.message)
    return []
  }
}

async function scrapeFox() {
  try {
    const res = await axios.get('https://foxtheatre.ca', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 8000
    })
    const $ = cheerio.load(res.data)
    const movies = []

    $('article, [class*="film"], [class*="movie"], [class*="show"], .entry').each((_, el) => {
      const title = $(el).find('h1, h2, h3, [class*="title"]').first().text().trim()
      const time = $(el).find('[class*="time"], [class*="showtime"]').first().text().trim()
      const link = $(el).find('a').first().attr('href')
      if (title && title.length > 2) {
        movies.push({
          title,
          times: time ? [time] : [],
          prices: [],
          link: link ? (link.startsWith('http') ? link : `https://foxtheatre.ca${link}`) : 'https://foxtheatre.ca'
        })
      }
    })
    return movies.slice(0, 8)
  } catch (err) {
    console.error('Fox scrape failed:', err.message)
    return []
  }
}

const scrapers = { tiff: scrapeTIFF, revue: scrapeRevue, paradise: scrapeParadise, hotdocs: scrapeHotDocs, fox: scrapeFox }

async function getIndieShowtimes(theatreId) {
  const theatre = INDIE_THEATRES.find(t => t.id === theatreId)
  if (!theatre) return []
  const scraper = scrapers[theatre.scraper]
  if (!scraper) return []
  return scraper()
}

module.exports = { INDIE_THEATRES, getIndieShowtimes }