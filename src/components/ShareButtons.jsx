import { useState } from 'react'

export default function ShareButtons({ url, text }) {
  const [copied, setCopied] = useState(false)

  const items = [
    {
      label: 'WhatsApp',
      href: `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`,
      em: '💬',
    },
    {
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      em: '✈️',
    },
    {
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      em: '👍',
    },
    {
      label: 'X / Twitter',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      em: '🐦',
    },
  ]

  function handleCopy() {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="share-btns">
      {items.map(({ label, href, em }) => (
        <a
          key={label}
          className="share-btn"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {em} {label}
        </a>
      ))}
      <button
        className={`share-btn${copied ? ' copied' : ''}`}
        onClick={handleCopy}
      >
        {copied ? '✓ Zkopírováno' : '📋 Kopírovat'}
      </button>
    </div>
  )
}
