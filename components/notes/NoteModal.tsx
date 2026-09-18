"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/shadcn/ui/dialog"
import { Button } from "@/components/shadcn/ui/button"
import { Trash2 } from "lucide-react"
import type { Note } from "./types"
import NoteEditor from "./NoteEditor"

type Props = {
  note?: Note
  open: boolean
  onClose: () => void
  onSave: (patch: { title?: string; description?: string | null }) => Promise<void>
  onTrash: () => Promise<void>
}

export default function NoteModal({ note, open, onClose, onSave, onTrash }: Props) {
  const [title, setTitle] = useState(note?.title ?? "")
  const [description, setDescription] = useState(note?.description ?? "")
  
  const [isEditingTitle, setIsEditingTitle] = useState(!note)
  const [isEditingDesc, setIsEditingDesc] = useState(!note)
  const [saving, setSaving] = useState(false)
  
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditingTitle) titleInputRef.current?.focus()
  }, [isEditingTitle])

  async function handleSave() {
    if (!title.trim() && !note) return // Don't save empty new note
    setSaving(true)
    try {
      await onSave({ title: title.trim() || "Nueva nota", description: description.trim() || null })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md rounded-2xl border border-slate-200/60 bg-white transition-colors duration-300 dark:border-slate-800/60 dark:bg-[#1C1D1D]">
        <DialogHeader className="mb-2">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título de la nota"
              className="w-full bg-transparent text-lg font-poppins font-black tracking-tight text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  setIsEditingDesc(true)
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
              <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="rounded-xl h-9 text-xs">
                Cancelar
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving || (!title.trim() && !note)} className="rounded-xl h-9 text-xs bg-[#016B6B] text-white hover:bg-[#3F9EA2]">
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
