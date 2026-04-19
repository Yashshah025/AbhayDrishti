import { Routes, Route, Navigate } from 'react-router-dom'
import StateOverview  from './views/StateOverview.jsx'
import SiteDashboard  from './views/SiteDashboard.jsx'
import Analytics      from './views/Analytics.jsx'
import RedAlertOverlay from './components/RedAlertOverlay.jsx'
import { useTheme } from './hooks/useTheme'

export default function App() {
  useTheme() // Initialize theme class on mount

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <div className="bg-mesh" />
      <div className="bg-grid" />
      <div className="relative z-10 min-h-screen flex flex-col">
        <Routes>
          <Route path="/"               element={<StateOverview />} />
          <Route path="/site/:siteId"   element={<SiteDashboard />} />
          <Route path="/analytics/:siteId" element={<Analytics />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {/* Mounted globally — listens for any tier-3 escalation */}
      <RedAlertOverlay />
    </div>
  )
}
