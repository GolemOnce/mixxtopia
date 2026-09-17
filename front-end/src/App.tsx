import { Route, Routes } from 'react-router-dom'

import AdminBustercall from './pages/AdminBustercall'
import BusterCall from './pages/BusterCall'
import Home from './pages/Home'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/bustercall" element={<BusterCall />} />
      <Route path="/admin" element={<AdminBustercall />} />
    </Routes>
  )
}
