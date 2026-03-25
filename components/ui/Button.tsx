"use client"

import * as React from "react"
import Spinner from "@/components/ui/Spinner"
import { Button as ShadcnButton } from "@/components/shadcn/ui/button"

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  variant?: "primary" | "ghost" | "danger"
}

export default function Button({ className, loading, disabled, variant = "primary", ...props }: Props) {
  return (
    <ShadcnButton
      variant={variant}
      className={className}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Spinner />
          Cargando
        </span>
      ) : (
        props.children
      )}
    </ShadcnButton>
  )
}

