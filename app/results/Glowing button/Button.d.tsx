"use client"

import type { ButtonHTMLAttributes } from "react"
import type { MotionProps } from "framer-motion"

export type ButtonProps = {
  children?: string
  hueValue?: number
} & MotionProps &
  ButtonHTMLAttributes<HTMLButtonElement>
