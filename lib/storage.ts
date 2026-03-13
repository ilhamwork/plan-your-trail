import { ParsedRoute } from "./types"

export interface SavedRoute {
  id: string
  name: string
  userName: string
  date: string
  fileName: string
  stats: ParsedRoute["stats"]
  routeData: ParsedRoute
  savedAt: number
}

const DB_NAME = "PlanYourTrailDB"
const STORE_NAME = "routes"
const MAX_ROUTES = 10

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export const storage = {
  async getRoutes(): Promise<SavedRoute[]> {
    if (typeof window === "undefined") return []
    try {
      const db = await getDB()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly")
        const store = transaction.objectStore(STORE_NAME)
        const request = store.getAll()
        request.onsuccess = () => {
          const routes = (request.result as SavedRoute[]).sort((a, b) => b.savedAt - a.savedAt)
          resolve(routes)
        }
        request.onerror = () => reject(request.error)
      })
    } catch (err) {
      console.error("Failed to load routes from IndexedDB:", err)
      return []
    }
  },

  async saveRoute(
    name: string,
    userName: string,
    date: string,
    fileName: string,
    routeData: ParsedRoute
  ): Promise<{ success: boolean; error?: string }> {
    if (typeof window === "undefined") return { success: false, error: "Not in browser" }

    try {
      const routes = await this.getRoutes()
      
      const existingRoute = routes.find(
        (r) => r.fileName === fileName && r.name === name
      )

      const db = await getDB()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite")
        const store = transaction.objectStore(STORE_NAME)
        
        if (existingRoute) {
          // Update existing route
          const updatedRoute: SavedRoute = {
            ...existingRoute,
            savedAt: Date.now(),
            routeData,
            stats: routeData.stats,
            userName,
            date,
          }
          store.put(updatedRoute)
        } else {
          // Add new route
          const newRoute: SavedRoute = {
            id: crypto.randomUUID(),
            name,
            userName,
            date,
            fileName,
            stats: routeData.stats,
            routeData,
            savedAt: Date.now(),
          }
          store.add(newRoute)

          // If we exceeded the limit, delete the oldest
          if (routes.length >= MAX_ROUTES) {
            const oldest = routes[routes.length - 1]
            store.delete(oldest.id)
          }
        }

        transaction.oncomplete = () => resolve({ success: true })
        transaction.onerror = () => reject(transaction.error)
      })
    } catch (err) {
      console.error("Failed to save route to IndexedDB:", err)
      return { success: false, error: "Failed to save to database. Storage might be full." }
    }
  },

  async deleteRoute(id: string): Promise<void> {
    if (typeof window === "undefined") return
    try {
      const db = await getDB()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite")
        const store = transaction.objectStore(STORE_NAME)
        const request = store.delete(id)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (err) {
      console.error("Failed to delete route from IndexedDB:", err)
    }
  },

  async isLimitReached(): Promise<boolean> {
    const routes = await this.getRoutes()
    return routes.length >= MAX_ROUTES
  }
}
