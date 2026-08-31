"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { AlignLeft, AlignCenter, AlignRight, ListChecks, ListOrdered, List } from 'lucide-react'
import { useEffect } from 'react'

type NoteEditorProps = {
  content: string
  editable: boolean
  onChange?: (html: string) => void
}

export default function NoteEditor({ content, editable, onChange }: NoteEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // We configure starter kit to handle lists correctly without conflicting
        orderedList: {
          keepMarks: true,
          keepAttributes: false, // TODO : Making this as `false` becase marks are not preserved when I try to preserve attrs, awaiting a bit of help
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false, // TODO : Making this as `false` becase marks are not preserved when I try to preserve attrs, awaiting a bit of help
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: content || '<p></p>',
    editable: editable,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML())
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[150px]',
      },
    },
  })

  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable)
    }
  }, [editor, editable])

  useEffect(() => {
    if (editor && content !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(content || '<p></p>')
    }
  }, [editor, content])

  if (!editor) {
    return null
  }

  return (
    <div className="w-full h-full flex flex-col gap-2">
      {editable && (
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-2 mb-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            icon={<AlignLeft className="h-4 w-4" />}
            title="Alinear a la izquierda"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            icon={<AlignCenter className="h-4 w-4" />}
            title="Centrar"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            icon={<AlignRight className="h-4 w-4" />}
            title="Alinear a la derecha"
          />
          
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive('taskList')}
            icon={<ListChecks className="h-4 w-4" />}
            title="Lista de tareas"
          />
          
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            icon={<List className="h-4 w-4" />}
            title="Lista con viñetas"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            icon={<ListOrdered className="h-4 w-4" />}
            title="Lista numerada"
          />
        </div>
      )}
      
      <div className={`flex-1 text-left ${!editable ? 'pointer-events-none' : ''}`}>
        <EditorContent editor={editor} className="tiptap-editor" />
      </div>
    </div>
  )
}

function ToolbarButton({ onClick, isActive, icon, title }: { onClick: () => void, isActive: boolean, icon: React.ReactNode, title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${
        isActive 
          ? 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100' 
          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400'
      }`}
    >
      {icon}
    </button>
  )
}
