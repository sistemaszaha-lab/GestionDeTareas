"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { Card, CardContent } from "@/components/shadcn/ui/card"
import { MoreHorizontal, Pin, Copy, Trash2 } from "lucide-react"
import type { Note } from "./types"
import DOMPurify from "dompurify"

type Props = {
  note: Note
  onClick: () => void
  onDuplicate: () => void
  onPin: () => void
  onMove: (dir: "up" | "down") => void
  onTrash: () => void
  onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void
  isDragging?: boolean
  isDropTarget?: boolean
}

export default function NoteCard({ note, onClick, onDuplicate, onPin, onMove: _onMove, onTrash, onPointerDown, isDragging, isDropTarget }: Props) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })

  function updateMenuPosition() {
    const button = menuButtonRef.current
    const menu = menuRef.current
    if (!button) return
    const buttonRect = button.getBoundingClientRect()
    const menuWidth = menu?.offsetWidth || 144
    const menuHeight = menu?.offsetHeight || 220
    const gap = 4
    const left = Math.max(8, Math.min(buttonRect.right - menuWidth, window.innerWidth - menuWidth - 8))
    const openUp = buttonRect.bottom + gap + menuHeight > window.innerHeight && buttonRect.top - gap - menuHeight >= 8
    const top = openUp ? buttonRect.top - menuHeight - gap : buttonRect.bottom + gap
    setMenuPosition({ top: Math.max(8, top), left })
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && !menuButtonRef.current?.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (!showMenu) return
    updateMenuPosition()
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setShowMenu(false)
    }
    window.addEventListener("resize", updateMenuPosition)
    window.addEventListener("scroll", updateMenuPosition, true)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      window.removeEventListener("resize", updateMenuPosition)
      window.removeEventListener("scroll", updateMenuPosition, true)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [showMenu])

  return (
    <Card 
      data-note-id={note.id}
      onClick={onClick}
      onPointerDown={onPointerDown}
      className={`relative overflow-visible rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 cursor-grab touch-none group dark:bg-[#1C1D1D] ${isDragging ? "opacity-50 scale-[0.98] border-[#016B6B]" : isDropTarget ? "border-[#3F9EA2] ring-2 ring-[#3F9EA2]/30" : "border-slate-200/60 dark:border-slate-800/60"} ${showMenu ? "z-50" : "z-auto"}`}
    >
      <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
        {note.isPinned && <Pin className="h-3.5 w-3.5 text-slate-400 fill-slate-400" />}
        <div ref={menuRef} className="relative">
          <button 
            ref={menuButtonRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all"
          >
            <MoreHorizontal className="h-4 w-4 text-slate-500" />
          </button>
          
          {showMenu && typeof document !== "undefined" ? createPortal(
            <div ref={menuRef} style={{ top: menuPosition.top, left: menuPosition.left }} className="fixed w-36 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 shadow-lg z-[100] flex flex-col gap-0.5 text-sm font-medium">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); onPin(); }}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left text-slate-700 dark:text-slate-300 w-full transition-colors"
              >
                <Pin className="h-3.5 w-3.5" />
                {note.isPinned ? "Desfijar" : "Fijar"}
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDuplicate(); }}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left text-slate-700 dark:text-slate-300 w-full transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                Duplicar
              </button>
              <div className="h-px bg-slate-100 dark:bg-slate-800 my-0.5 mx-1" />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); onTrash(); }}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg text-left text-rose-600 dark:text-rose-400 w-full transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar
              </button>
            </div>, document.body
          ) : null}
        </div>
      </div>

      <CardContent className="p-3.5 sm:p-4 pt-4 sm:pt-5">
        <h3 className="line-clamp-2 text-sm font-poppins font-black tracking-tight text-slate-800 dark:text-slate-100 mb-1 pr-5">
          {note.title || "Sin título"}
        </h3>
        {note.description ? (
          <div 
            className="line-clamp-3 text-xs text-slate-600 dark:text-slate-400"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.description, { ALLOWED_TAGS: [] }) }}
          />
        ) : (
          <p className="text-xs text-slate-400 italic">Doble clic para escribir...</p>
        )}
      </CardContent>
    </Card>
  )
}
