"use client"

import * as React from "react"
import { Button as ShadcnButton, type ButtonProps } from "@/components/shadcn/ui/button"

export type { ButtonProps }

export default function Button(props: ButtonProps) {
  return <ShadcnButton {...props} />
}
