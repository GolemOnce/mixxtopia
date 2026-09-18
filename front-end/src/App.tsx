import { Route, Routes } from 'react-router-dom'

import NavBar from './components/NavBar'
import AdminBustercall from './pages/AdminBustercall'
import Board from './pages/Board'
import BoardPost from './pages/BoardPost'
import BusterCall from './pages/BusterCall'
import Home from './pages/Home'
import Schedule from './pages/Schedule'
import Vote from './pages/Vote'

export default function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/vote" element={<Vote />} />
        <Route path="/board" element={<Board />} />
        <Route path="/board/:postId" element={<BoardPost />} />
        <Route path="/bustercall" element={<BusterCall />} />
        <Route path="/admin" element={<AdminBustercall />} />
      </Routes>
    </>
  )
}
