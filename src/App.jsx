import { useMemo } from 'react'
import FloatingHearts from './components/FloatingHearts'
import InviteView from './components/InviteView'
import Planner from './components/Planner'

export default function App() {
  const randeId = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('id')
  }, [])

  return (
    <>
      <FloatingHearts />
      <div className="card">
        {randeId ? <InviteView randeId={randeId} /> : <Planner />}
      </div>
    </>
  )
}
