"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/shadcn/ui/dialog"
import { Button } from "@/components/shadcn/ui/button"
import { Trash2 } from "lucide-react"
import type { Note } from "./types"
import { getNoteColor, NOTE_COLORS } from "./colors"
import NoteEditor from "./NoteEditor"

type Props = {
  note?: Note
  open: boolean
  onClose: () => void
  onSave: (patch: { title?: string; description?: string | null; color?: string | null }) => Promise<void>
  onTrash: () => Promise<void>
}

export default function NoteModal({ note, open, onClose, onSave, onTrash }: Props) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState<string | null>(null)
  
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const titleInputRef = useRef<HTMLInputElement>(null)
  const descInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setTitle(note?.title ?? "")
      setDescription(note?.description ?? "")
      setColor(note?.color ?? null)
      setIsEditingTitle(!note)
      setIsEditingDesc(!note)
    }
  }, [open, note])

  useEffect(() => {
    if (isEditingTitle) titleInputRef.current?.focus()
  }, [isEditingTitle])

  useEffect(() => {
    if (isEditingDesc) descInputRef.current?.focus()
  }, [isEditingDesc])

  async function handleSave() {
    if (!title.trim() && !note) return // Don't save empty new note
    setSaving(true)
    try {
      await onSave({ title: title.trim() || "Nueva nota", description: description.trim() || null, color })
      if (!note) {
        onClose()
      } else {
        setIsEditingTitle(false)
        setIsEditingDesc(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const { bg, border } = getNoteColor(color)

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className={`max-w-md rounded-2xl border ${border} ${bg} transition-colors duration-300`}>
        <DialogHeader className="mb-2">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSave}
              placeholder="Título de la nota"
              className="w-full bg-transparent text-lg font-poppins font-black tracking-tight text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleSave()
                }
              }}
            />
          ) : (
            <DialogTitle 
              className="text-lg font-poppins font-black tracking-tight text-slate-800 dark:text-slate-100 cursor-text"
              onDoubleClick={() => setIsEditingTitle(true)}
            >
              {title || "Sin título"}
            </DialogTitle>
          )}
        </DialogHeader>

        <div className="relative min-h-[150px] w-full text-sm text-slate-700 dark:text-slate-300">
          <NoteEditor 
            content={description}
            editable={isEditingDesc}
            onChange={setDescription}
          />
          {!isEditingDesc && (
            <div 
              className="absolute inset-0 cursor-text z-10" 
              onDoubleClick={() => setIsEditingDesc(true)} 
              title="Doble clic para editar..."
            />
          )}
        </div>

        <div className="mt-4 flex flex-col gap-4 relative z-20">
          {/* Color selector */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setColor(null); if (note) onSave({ color: null }); }}
              className={`h-6 w-6 rounded-full border-2 ${color === null ? 'border-slate-400 ring-2 ring-slate-200 dark:ring-slate-700' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-[#1C1D1D] transition-all`}
              aria-label="Sin color"
            />
            {NOTE_COLORS.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={(e) => { 
                  e.stopPropagation();
                  setColor(c.id); 
                  if (note) onSave({ color: c.id }); 
                }}
                className={`h-6 w-6 rounded-full border-2 ${c.border} ${c.bg} ${color === c.id ? 'ring-2 ring-slate-400 dark:ring-slate-500 scale-110' : 'scale-100 hover:scale-105'} transition-all`}
                aria-label={c.label}
              />
            ))}
          </div>

          <DialogFooter className="flex items-center sm:justify-between w-full gap-2">
            {note ? (
              <Button
                type="button"
                variant="ghost"
                onClick={onTrash}
                disabled={saving}
                className="h-9 w-9 p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 rounded-xl"
                aria-label="Eliminar nota"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : <div />}
            
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="rounded-xl h-9 text-xs">
                Cerrar
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
