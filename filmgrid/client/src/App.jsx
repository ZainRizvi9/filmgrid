import { useState, useEffect } from 'react'
import Map, { Marker } from 'react-map-gl'
import axios from 'axios'
import Sidebar from './components/Sidebar'
import TheatrePanel from './components/TheatrePanel'
import './App.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
const API = 'https://filmgrid-production.up.railway.app/api'

export default function App() {
  const [userLocation, setUserLocation] = useState(null)
  const [theatres, setTheatres] = useState([])
  const [selectedTheatre, setSelectedTheatre] = useState(null)
  const [showtimes, setShowtimes] = useState([])
  const [loading, setLoading] = useState(false)
  const [showtimeLoading, setShowtimeLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [viewport, setViewport] = useState({
    latitude: 43.6532,
    longitude: -79.3832,
    zoom: 12
  })

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords
        setUserLocation({ latitude, longitude })
        setViewport(v => ({ ...v, latitude, longitude }))
        fetchTheatres(latitude, longitude)
      },
      () => fetchTheatres(43.6532, -79.3832),
      { timeout: 5000 }
    )
  }, [])

  const fetchTheatres = async (lat, lng) => {
    setLoading(true)
    try {
      const res = await axios.get(`${API}/theatres`, { params: { lat, lng } })
      setTheatres(res.data)
    } catch (err) {
      console.error('Failed to fetch theatres', err)
    }
    setLoading(false)
  }

  const fetchShowtimes = async (theatre) => {
    setSelectedTheatre(theatre)
    setShowtimeLoading(true)
    setShowtimes([])
    try {
      const res = await axios.get(`${API}/theatres/showtimes`, {
        params: {
          theatre_name: theatre.name,
          theatre_id: theatre.id,
          lat: userLocation?.latitude || 43.6532,
          lng: userLocation?.longitude || -79.3832
        }
      })
      setShowtimes(res.data)
    } catch (err) {
      console.error('Failed to fetch showtimes', err)
    }
    setShowtimeLoading(false)
  }

  const filtered = theatres.filter(t => filter === 'all' || t.type === filter)

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span className="logo-icon">◈</span>
          FilmGrid
        </div>
        <div className="filters">
          {['all', 'chain', 'independent'].map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'chain' ? 'Chains' : 'Independent'}
            </button>
          ))}
        </div>
        <div className="header-right">
          {loading && <span className="loading-text">Finding theatres...</span>}
          <span className="count">{filtered.length} theatres nearby</span>
        </div>
      </header>

      <div className="main">
        <Sidebar
          theatres={filtered}
          selectedTheatre={selectedTheatre}
          onSelect={fetchShowtimes}
          loading={loading}
        />

        <div className="map-container">
          <Map
            {...viewport}
            onMove={e => setViewport(e.viewState)}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            mapboxAccessToken={MAPBOX_TOKEN}
          >
            {userLocation && (
              <Marker latitude={userLocation.latitude} longitude={userLocation.longitude}>
                <div className="user-marker">You</div>
              </Marker>
            )}

            {filtered.map(theatre => (
              theatre.lat && theatre.lng && (
                <Marker
                  key={theatre.id}
                  latitude={theatre.lat}
                  longitude={theatre.lng}
                  onClick={() => fetchShowtimes(theatre)}
                >
                  <div className={`theatre-marker ${theatre.type} ${selectedTheatre?.id === theatre.id ? 'selected' : ''}`}>
                    ◈
                  </div>
                </Marker>
              )
            ))}
          </Map>
        </div>

        {selectedTheatre && (
          <TheatrePanel
            theatre={selectedTheatre}
            showtimes={showtimes}
            loading={showtimeLoading}
            onClose={() => { setSelectedTheatre(null); setShowtimes([]) }}
          />
        )}
      </div>
    </div>
  )
}