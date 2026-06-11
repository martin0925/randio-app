import { useMemo, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import FloatingHearts from './components/FloatingHearts'
import InviteView from './components/InviteView'
import Planner from './components/Planner'
import AdminView from './components/AdminView'

export default function App() {
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (!user) return
      setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        photoURL: user.photoURL,
      }, { merge: true }).catch(() => {})
    })
  }, [])

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
