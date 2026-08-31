"use client"

import { useState } from "react"
import toast from "react-hot-toast"
import { Plus } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shadcn/ui/card"
import { Badge } from "@/components/shadcn/ui/badge"
import { Button } from "@/components/shadcn/ui/button"
import type { Note } from "./types"
import NoteCard from "./NoteCard"
import NoteModal from "./NoteModal"
import { fetchJsonOrThrow } from "@/lib/fetch-json"

type Props = {
  initialNotes: Note[]
}

function sortNotes(notesToSort: Note[]) {
  return [...notesToSort].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    if (a.order !== b.order) return b.order - a.order
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export default function NotesSection({ initialNotes }: Props) {
  const [notes, setNotes] = useState<Note[]>(sortNotes(initialNotes))
  const [activeNote, setActiveNote] = useState<Note | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  async function createNote(patch: { title?: string; description?: string | null; color?: string | null }) {
    try {
      const data = await fetchJsonOrThrow<{ note: Note }>(
        "/api/notes",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch)
        },
        { defaultError: "No se pudo crear la nota" }
      )
      setNotes((prev) => sortNotes([data.note, ...prev]))
      toast.success("Nota creada")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error")
    }
  }

  async function updateNote(id: string, patch: { title?: string; description?: string | null; color?: string | null; isPinned?: boolean; order?: number }) {
    try {
      const data = await fetchJsonOrThrow<{ note: Note }>(
        `/api/notes/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch)
        },
        { defaultError: "No se pudo actualizar la nota" }
      )
      setNotes((prev) => sortNotes(prev.map((n) => (n.id === id ? data.note : n))))
      setActiveNote((prev) => (prev?.id === id ? data.note : prev))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error")
      throw e // rethrow to keep modal from closing if error
    }
  }

  async function trashNote(id: string) {
    try {
      await fetchJsonOrThrow(
        `/api/notes/trash`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ noteIds: [id] })
        },
        { defaultError: "No se pudo eliminar" }
      )
      setNotes((prev) => prev.filter((n) => n.id !== id))
      setActiveNote(null)
      toast.success("Enviada a la papelera")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error")
    }
  }

  async function duplicateNote(note: Note) {
    try {
      const data = await fetchJsonOrThrow<{ note: Note }>(
        "/api/notes",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `${note.title} (copia)`,
            description: note.description,
            color: note.color,
            isPinned: note.isPinned,
            order: note.order
          })
        },
        { defaultError: "No se pudo duplicar" }
      )
      setNotes((prev) => sortNotes([data.note, ...prev]))
      toast.success("Nota duplicada")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error")
    }
  }

  async function togglePin(note: Note) {
    const newPinned = !note.isPinned
    setNotes(prev => sortNotes(prev.map(n => n.id === note.id ? { ...n, isPinned: newPinned } : n)))
    try {
      const data = await fetchJsonOrThrow<{ note: Note }>(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: newPinned })
      })
      setNotes(prev => sortNotes(prev.map(n => n.id === note.id ? data.note : n)))
    } catch (e) {
      setNotes(prev => sortNotes(prev.map(n => n.id === note.id ? { ...n, isPinned: note.isPinned } : n)))
      toast.error("Error al fijar nota")
    }
  }

  async function moveNote(note: Note, direction: "up" | "down") {
    const currentIndex = notes.findIndex(n => n.id === note.id)
    if (currentIndex === -1) return
    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (swapIndex < 0 || swapIndex >= notes.length) return

    const swapNote = notes[swapIndex]
    
    let newNoteOrder = swapNote.order
    let newSwapOrder = note.order

    if (newNoteOrder === newSwapOrder) {
      const maxOrder = Math.max(...notes.map(n => n.order), notes.length)
      newNoteOrder = maxOrder - swapIndex
      newSwapOrder = maxOrder - currentIndex
    }

    setNotes(prev => {
      const copy = [...prev]
      copy[currentIndex] = { ...note, order: newNoteOrder }
      copy[swapIndex] = { ...swapNote, order: newSwapOrder }
      return sortNotes(copy)
    })

    try {
      await Promise.all([
        fetchJsonOrThrow(`/api/notes/${note.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: newNoteOrder })
        }),
        fetchJsonOrThrow(`/api/notes/${swapNote.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: newSwapOrder })
        })
      ])
    } catch(e) {
      toast.error("Error al mover la nota")
    }
  }

  return (
    <>
      <Card className="overflow-hidden snap-start shrink-0 w-[85vw] sm:w-[22rem] md:w-[22rem] md:snap-none rounded-2xl border border-slate-200/60 bg-white dark:border-slate-850 dark:bg-[#1C1D1D] shadow-sm flex flex-col max-h-[85vh]">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 p-3.5 sm:px-4 sm:py-3 bg-slate-50/30 dark:bg-[#121313]/10">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-400 dark:bg-indigo-500" />
                <CardTitle className="text-sm font-poppins font-black text-slate-800 dark:text-slate-100 tracking-tight">Bloc de Notas</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-0 px-2 py-0.5 text-[10px]">
                  {notes.length}
                </Badge>
                <Button 
                  onClick={() => setIsCreating(true)}
                  className="h-7 w-7 sm:w-auto p-0 sm:px-3 bg-[#016B6B] text-white hover:bg-[#3F9EA2] active:scale-[0.98] font-poppins font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#016B6B]/10 rounded-xl"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Nueva nota</span>
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-3.5 sm:p-4 bg-slate-50/10 dark:bg-transparent flex-1 overflow-y-auto">
          {notes.map((note) => (
            <NoteCard 
              key={note.id} 
              note={note} 
              onClick={() => setActiveNote(note)}
              onDuplicate={() => duplicateNote(note)}
              onPin={() => togglePin(note)}
              onMove={(dir) => moveNote(note, dir)}
              onTrash={() => trashNote(note.id)}
            />
          ))}
          {notes.length === 0 ? (
             <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200/60 p-8 text-center dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/10 min-h-[160px]">
               <p className="text-xs text-slate-400 font-medium">No hay notas</p>
             </div>
          ) : null}
        </CardContent>
      </Card>

      <NoteModal 
        open={isCreating}
        onClose={() => setIsCreating(false)}
        onSave={createNote}
        onTrash={async () => {}} // Create modal won't have trash
      />

      {activeNote && (
        <NoteModal
          note={activeNote}
          open={!!activeNote}
          onClose={() => setActiveNote(null)}
          onSave={(patch) => updateNote(activeNote.id, patch)}
          onTrash={() => trashNote(activeNote.id)}
        />
      )}
    </>
  )
}
