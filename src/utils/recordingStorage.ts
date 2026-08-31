type PendingRecording = {
  blob: Blob
  filename: string
  createdAt: number
}

const DB_NAME = "screenrecorder"
const STORE_NAME = "pendingRecordings"
const KEY = "pending"

/**
 * Open (or create) an IndexedDB database and object store.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"))
      return
    }
    
    const req = indexedDB.open(DB_NAME, 1)
    
    req.onupgradeneeded = () => {
      const db = req.result
      // Clear any existing object stores that might be corrupted
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME)
      }
      // Create the object store
      db.createObjectStore(STORE_NAME)
    }
    
    req.onsuccess = () => {
      const db = req.result
      // Verify the object store exists
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // If object store doesn't exist, close and try to recreate with higher version
        db.close()
        const deleteReq = indexedDB.deleteDatabase(DB_NAME)
        deleteReq.onsuccess = () => {
          // Retry opening with fresh database
          const retryReq = indexedDB.open(DB_NAME, 1)
          retryReq.onupgradeneeded = () => {
            const retryDb = retryReq.result
            retryDb.createObjectStore(STORE_NAME)
          }
          retryReq.onsuccess = () => resolve(retryReq.result)
          retryReq.onerror = () => reject(retryReq.error)
        }
        deleteReq.onerror = () => reject(new Error("Failed to reset database"))
        return
      }
      resolve(db)
    }
    
    req.onerror = () => reject(req.error)
  })
}

/**
 * Save a pending recording (Blob + filename).
 */
export async function savePendingRecording(rec: { blob: Blob; filename: string }): Promise<void> {
  try {
    const db = await openDB()
    
    // Verify the object store exists before creating transaction
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      throw new Error(`Object store ${STORE_NAME} not found in database`)
    }
    
    await new Promise<void>((resolve, reject) => {
      let tx: IDBTransaction
      try {
        tx = db.transaction(STORE_NAME, "readwrite")
      } catch (e) {
        reject(new Error(`Failed to create transaction: ${e}`))
        return
      }
      
      const store = tx.objectStore(STORE_NAME)
      const value: PendingRecording = { blob: rec.blob, filename: rec.filename, createdAt: Date.now() }
      const putReq = store.put(value, KEY)
      
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch (e) {
    console.warn("[recordingStorage] Falling back to memory store:", e)
    ;(window as any).__pendingRecording = {
      blob: rec.blob,
      filename: rec.filename,
      createdAt: Date.now(),
    } as PendingRecording
  }
}

/**
 * Load the pending recording if it exists. Returns null if not found.
 */
export async function loadPendingRecording(): Promise<PendingRecording | null> {
  try {
    const db = await openDB()
    
    // Verify the object store exists
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.close()
      return null
    }
    
    const result = await new Promise<PendingRecording | null>((resolve, reject) => {
      let tx: IDBTransaction
      try {
        tx = db.transaction(STORE_NAME, "readonly")
      } catch (e) {
        reject(new Error(`Failed to create transaction: ${e}`))
        return
      }
      
      const store = tx.objectStore(STORE_NAME)
      const getReq = store.get(KEY)
      
      getReq.onsuccess = () => resolve((getReq.result as PendingRecording) || null)
      getReq.onerror = () => reject(getReq.error)
      tx.onerror = () => reject(tx.error)
    })
    db.close()
    return result
  } catch (e) {
    console.warn("[recordingStorage] Load failed, checking memory store:", e)
    const mem = (window as any).__pendingRecording as PendingRecording | undefined
    return mem || null
  }
}

/**
 * Clear the pending recording.
 */
export async function clearPendingRecording(): Promise<void> {
  try {
    const db = await openDB()
    
    // Verify the object store exists
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.close()
      return
    }
    
    await new Promise<void>((resolve, reject) => {
      let tx: IDBTransaction
      try {
        tx = db.transaction(STORE_NAME, "readwrite")
      } catch (e) {
        reject(new Error(`Failed to create transaction: ${e}`))
        return
      }
      
      const store = tx.objectStore(STORE_NAME)
      const delReq = store.delete(KEY)
      
      delReq.onsuccess = () => resolve()
      delReq.onerror = () => reject(delReq.error)
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch (e) {
    console.warn("[recordingStorage] Clear failed, clearing memory store:", e)
  }
  
  // Always clear memory store as fallback
  if ((window as any).__pendingRecording) {
    delete (window as any).__pendingRecording
  }
}

/**
 * Reset the entire database (useful for debugging or when database is corrupted)
 */
export async function resetDatabase(): Promise<void> {
  try {
    const deleteReq = indexedDB.deleteDatabase(DB_NAME)
    await new Promise<void>((resolve, reject) => {
      deleteReq.onsuccess = () => resolve()
      deleteReq.onerror = () => reject(deleteReq.error)
    })
    console.log("[recordingStorage] Database reset successfully")
  } catch (e) {
    console.warn("[recordingStorage] Failed to reset database:", e)
  }
  
  // Clear memory store as well
  if ((window as any).__pendingRecording) {
    delete (window as any).__pendingRecording
  }
}

// Expose reset function globally for debugging
if (typeof window !== "undefined") {
  (window as any).resetRecordingDatabase = resetDatabase
}

export type { PendingRecording }
