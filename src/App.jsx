import { useMemo } from 'react'
import FloatingHearts from './components/FloatingHearts'
import InviteView from './components/InviteView'
import Planner from './components/Planner'
import AdminView from './components/AdminView'

export default function App() {
  const { randeId, isAdmin } = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return { randeId: params.get('id'), isAdmin: params.has('admin') }
  }, [])

  return (
    <>
      <FloatingHearts />
      <div className="card">
        {isAdmin
          ? <AdminView />
          : randeId
            ? <InviteView randeId={randeId} />
            : <Planner />}
      </div>
    </>
  )
}
