import { useState } from 'react'

export default function ShareButtons({ url }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button className={`share-btn${copied ? ' copied' : ''}`} onClick={handleCopy}>
      {copied ? '✓ Odkaz zkopírován' : '📋 Kopírovat odkaz'}
    </button>
  )
}
