import './Sidebar.css'

export default function Sidebar({ theatres, selectedTheatre, onSelect, loading }) {
  if (loading) return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Nearby Theatres</h3>
        <p>Searching...</p>
      </div>
      <div className="skeleton-list">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton-item">
            <div className="skeleton-line wide" />
            <div className="skeleton-line narrow" />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Nearby Theatres</h3>
        <p>{theatres.length} found</p>
      </div>
      <div className="theatre-list">
        {theatres.length === 0 && (
          <div className="empty">No theatres found. Allow location access and try again.</div>
        )}
        {theatres.map(theatre => (
          <div
            key={theatre.id}
            className={`theatre-item ${selectedTheatre?.id === theatre.id ? 'active' : ''}`}
            onClick={() => onSelect(theatre)}
          >
            <div className="theatre-item-header">
              <span className="theatre-name">{theatre.name}</span>
              <span className={`theatre-type-badge ${theatre.type}`}>
                {theatre.type === 'independent' ? 'Indie' : 'Chain'}
              </span>
            </div>
            <p className="theatre-address">{theatre.address}</p>
            <div className="theatre-meta">
              {theatre.rating && <span className="theatre-rating">★ {theatre.rating}</span>}
              {theatre.distance && <span className="theatre-distance">{theatre.distance} km away</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}