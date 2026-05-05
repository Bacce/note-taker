import { openDB, type IDBPDatabase } from 'idb'
import type { Note } from './types'

const DB_NAME = 'notes-app'
const DB_VERSION = 1
const STORE = 'notes'

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' })
          store.createIndex('updatedAt', 'updatedAt')
        }
      },
    })
  }
  return dbPromise
}

export async function getAllNotes(): Promise<Note[]> {
  const db = await getDb()
  const notes = await db.getAll(STORE)
  return notes.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function putNote(note: Note): Promise<void> {
  const db = await getDb()
  await db.put(STORE, note)
}

export async function removeNote(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE, id)
}
