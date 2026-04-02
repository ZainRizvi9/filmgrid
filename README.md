# FilmGrid

A movie theatre finder for Toronto that shows real showtimes for both major chains and independent theatres — including ones that don't appear on Fandango or Google Movies.

**Live:** https://filmgrid-flax.vercel.app  
**Demo:** https://youtu.be/xm3kWe7uH_E

## What it does

FilmGrid detects your location and maps nearby theatres with real-time showtimes. Chain theatres pull data from SerpApi's Google Maps engine. Indie theatres like Revue Cinema and Paradise Theatre are scraped directly using Cheerio — giving you showtime and booking data that mainstream platforms don't have.

Click any showtime chip to book directly on the theatre's website.

## Features

- Geolocation-based theatre discovery with distance sorting
- Real showtimes for 15+ Toronto theatres via SerpApi Google Maps engine
- Cheerio web scrapers for Revue Cinema and Paradise Theatre with direct booking links
- Format detection and color-coded labels (IMAX, Dolby, 3D, D-BOX, UltraAVX)
- Movie posters, ratings, and overviews from TMDB API
- In-memory caching with 2-hour TTL to minimize API usage
- Keyword allowlist and blocklist to filter performing arts venues from results
- Filter by chain vs independent

## Tech Stack

- Frontend: React, Vite, Mapbox GL
- Backend: Node.js, Express, MongoDB
- APIs: SerpApi, TMDB, Mapbox
- Deployed: Vercel (frontend) + Railway (backend)
