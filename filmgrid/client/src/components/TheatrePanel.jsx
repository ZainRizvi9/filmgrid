import { useState, useEffect } from 'react'
import axios from 'axios'
import './TheatrePanel.css'

const API = 'https://filmgrid-production.up.railway.app/api'

const FORMAT_COLORS = {
  'IMAX': '#4a9eff',
  'Dolby': '#a78bfa',
  'UltraAVX': '#f59e0b',
  'ScreenX': '#34d399',
  'D-BOX': '#f87171',
  'Standard': '#555',
}

export default function TheatrePanel({ theatre, showtimes, loading, onClose }) {
  const [movieDetails, setMovieDetails] = useState({})

  useEffect(() => {
    setMovieDetails({})
  }, [theatre])

  useEffect(() => {
    showtimes.forEach(async movie => {
      if (movieDetails[movie.title]) return
      try {
        const res = await axios.get(`${API}/movies/details`, {
          params: { title: movie.title }
        })
        if (res.data) {
          setMovieDetails(prev => ({ ...prev, [movie.title]: res.data }))
        }
      } catch {}
    })
  }, [showtimes])

  const groupByFormat = (times) => {
    return times.reduce((acc, t) => {
      const fmt = t.format || 'Standard'
      const timeStr = t.time || t
      if (!acc[fmt]) acc[fmt] = []
      acc[fmt].push(timeStr)
      return acc
    }, {})
  }

  const parseChip = (time) => {
    if (typeof time === 'string' && time.includes(',')) {
      const parts = time.split(', ')
      return { date: parts[0], time: parts[1] }
    }
    return { date: null, time }
  }

  return (
    <div className="theatre-panel">
      <div className="panel-header">
        <div>
          <h2>{theatre.name}</h2>
          <p>{theatre.address}</p>
          <div className="panel-badges">
            {theatre.isIndie && <span className="badge indie">Independent</span>}
            {theatre.distance && <span className="badge distance">{theatre.distance} km away</span>}
            {theatre.rating && <span className="badge rating">★ {theatre.rating}</span>}
          </div>
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="panel-body">
        {loading && (
          <div className="panel-loading">
            <div className="spinner" />
            <p>Loading showtimes...</p>
          </div>
        )}

        {!loading && showtimes.length === 0 && (
          <div className="no-showtimes">
            <p>No showtimes found for today.</p>
            <p className="hint">This theatre may not list showtimes online.</p>
            {theatre.url && (
              <a
                href={theatre.url}
                target="_blank"
                rel="noopener noreferrer"
                className="visit-link"
              >
                Visit their website →
              </a>
            )}
          </div>
        )}

        {!loading && showtimes.map((movie, i) => {
          const details = movieDetails[movie.title]
          const grouped = groupByFormat(movie.times)
          const year = details?.year ? parseInt(details.year) : null
          const isNew = year && year >= new Date().getFullYear() - 1

          return (
            <div key={i} className="movie-row">
              {details?.poster && (
                <img src={details.poster} alt={movie.title} className="movie-poster" />
              )}
              <div className="movie-info">
                <div className="movie-title-row">
                  <h4>{movie.title}</h4>
                  {isNew && <span className="now-showing-badge">New</span>}
                  {details?.rating && (
                    <span className="movie-rating">★ {parseFloat(details.rating).toFixed(1)}</span>
                  )}
                </div>
                {details?.year && <span className="movie-year">{details.year}</span>}
                {details?.overview && (
                  <p className="movie-overview">{details.overview.slice(0, 110)}...</p>
                )}
                <div className="showtimes-section">
                  {Object.entries(grouped).map(([format, times]) => (
                    <div key={format} className="format-group">
                      <span
                        className="format-label"
                        style={{ color: FORMAT_COLORS[format] || FORMAT_COLORS['Standard'] }}
                      >
                        {format}
                      </span>
                      <div className="showtimes-row">
                        {times.map((time, j) => {
                          const { date, time: timeOnly } = parseChip(time)
                          return (
                            <a
                              key={j}
                              href={theatre.url || 'https://www.google.com/search?q=' + encodeURIComponent(movie.title + ' ' + theatre.name + ' tickets')}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="showtime-chip"
                            >
                              {date && <span className="time-date">{date}</span>}
                              <span className="time">{timeOnly}</span>
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}