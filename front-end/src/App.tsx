import { Route, Routes } from 'react-router-dom'

import NavBar from './components/NavBar'
import RequireAdmin from './components/RequireAdmin'
import AdminBustercall from './pages/AdminBustercall'
import AdminHome from './pages/AdminHome'
import Board from './pages/Board'
import BoardNew from './pages/BoardNew'
import BoardPost from './pages/BoardPost'
import BusterCall from './pages/BusterCall'
import Home from './pages/Home'
import Schedule from './pages/Schedule'
import ScheduleNew from './pages/ScheduleNew'
import Vote from './pages/Vote'
import VoteNew from './pages/VoteNew'

export default function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route
          path="/schedule/new"
          element={
            <RequireAdmin>
              <ScheduleNew />
            </RequireAdmin>
          }
        />
        <Route path="/vote" element={<Vote />} />
        <Route
          path="/vote/new"
          element={
            <RequireAdmin>
              <VoteNew />
            </RequireAdmin>
          }
        />
        <Route path="/board" element={<Board />} />
        <Route path="/board/new" element={<BoardNew />} />
        <Route path="/board/:postId" element={<BoardPost />} />
        <Route path="/bustercall" element={<BusterCall />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminHome />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/bustercall"
          element={
            <RequireAdmin>
              <AdminBustercall />
            </RequireAdmin>
          }
        />
      </Routes>
    </>
  )
}
