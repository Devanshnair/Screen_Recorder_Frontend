const DB_NAME = 'screenrecorder';
const STORE_NAME = 'pending';
const DB_VERSION = 1;
const KEY = 'latest';

export interface PendingRecording {
	id: string;
	blob: Blob;
	filename: string;
	createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: 'id' });
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

export async function savePendingRecording(input: { blob: Blob; filename: string }): Promise<void> {
	const db = await openDB();
	const tx = db.transaction(STORE_NAME, 'readwrite');
	const store = tx.objectStore(STORE_NAME);
	store.put({ id: KEY, blob: input.blob, filename: input.filename, createdAt: Date.now() } as PendingRecording);
	await new Promise<void>((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
		tx.onabort = () => reject(tx.error);
	});
}

export async function loadPendingRecording(): Promise<{ blob: Blob; filename: string } | null> {
	const db = await openDB();
	const tx = db.transaction(STORE_NAME, 'readonly');
	const store = tx.objectStore(STORE_NAME);
	const req = store.get(KEY);
	const rec = await new Promise<PendingRecording | undefined>((resolve, reject) => {
		req.onsuccess = () => resolve(req.result as PendingRecording | undefined);
		req.onerror = () => reject(req.error);
	});
	return rec ? { blob: rec.blob, filename: rec.filename } : null;
}

export async function clearPendingRecording(): Promise<void> {
	const db = await openDB();
	const tx = db.transaction(STORE_NAME, 'readwrite');
	const store = tx.objectStore(STORE_NAME);
	store.delete(KEY);
	await new Promise<void>((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
		tx.onabort = () => reject(tx.error);
	});
}
