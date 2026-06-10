export default function FloatingHearts() {
  const hearts = Array.from({ length: 8 }, (_, i) => ({
    key: i,
    content: i % 2 ? '💗' : '🌸',
    style: {
      left: `${8 + i * 12}%`,
      animationDuration: `${9 + (i % 4) * 3}s`,
      animationDelay: `${i * 1.4}s`,
      fontSize: `${0.9 + (i % 3) * 0.4}rem`,
    },
  }))

  return (
    <div className="hearts" aria-hidden="true">
      {hearts.map(({ key, content, style }) => (
        <span key={key} className="heart" style={style}>
          {content}
        </span>
      ))}
    </div>
  )
}
