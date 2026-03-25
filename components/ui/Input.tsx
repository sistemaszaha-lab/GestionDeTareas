"use client"

import * as React from "react"
import { Input as ShadcnInput } from "@/components/shadcn/ui/input"
import { Label as ShadcnLabel } from "@/components/shadcn/ui/label"

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
}

export default function Input({ className, label, id, ...props }: Props) {
  const inputId = id ?? props.name ?? undefined
  return (
    <div className="space-y-1.5">
      {label ? <ShadcnLabel htmlFor={inputId}>{label}</ShadcnLabel> : null}
      <ShadcnInput
        id={inputId}
        className={className}
        {...props}
      />
    </div>
  )
}

