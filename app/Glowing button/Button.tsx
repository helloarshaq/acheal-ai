"use client"

import type React from "react"
import { useState } from "react"
import styles from "./button.module.css"

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}

const Button = ({ children, onClick, className = "" }: ButtonProps) => {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isHovering) return

    const button = e.currentTarget
    const rect = button.getBoundingClientRect()

    // Calculate position relative to the button
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setPosition({ x, y })
  }

  return (
    <button
      className={`${styles.glowingButton} ${className}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleMouseMove}
    >
      <span className={styles.buttonContent}>{children}</span>
      {isHovering && (
        <div
          className={styles.glow}
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
          }}
        />
      )}
    </button>
  )
}

export default Button
