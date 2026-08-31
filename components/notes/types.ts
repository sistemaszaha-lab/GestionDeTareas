export type Note = {
  id: string
  title: string
  description: string | null
  color: string | null
  isPinned: boolean
  order: number
  userId: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  deletedById: string | null
}
