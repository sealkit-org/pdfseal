/**
 * Local Vault Database Engine (100% In-Browser IndexedDB + Web Crypto SHA-256)
 * Zero server uploads, completely offline-capable.
 */

const DB_NAME = 'pdfseal_vault_db';
const DB_VERSION = 1;

let dbInstance = null;

/**
 * Initializes and upgrades IndexedDB schema
 */
export function getDb() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    // Check IndexedDB support (e.g. in browser / web worker)
    const idb = typeof indexedDB !== 'undefined' ? indexedDB : (typeof window !== 'undefined' ? window.indexedDB : null);
    if (!idb) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = idb.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Files Store
      if (!db.objectStoreNames.contains('files')) {
        const fileStore = db.createObjectStore('files', { keyPath: 'id' });
        fileStore.createIndex('hash', 'hash', { unique: false });
        fileStore.createIndex('folderId', 'folderId', { unique: false });
        fileStore.createIndex('createdAt', 'createdAt', { unique: false });
        fileStore.createIndex('name', 'name', { unique: false });
      }

      // 2. Folders Store
      if (!db.objectStoreNames.contains('folders')) {
        const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
        folderStore.createIndex('name', 'name', { unique: false });
        folderStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/**
 * Computes SHA-256 digital hash fingerprint of an ArrayBuffer
 * @param {ArrayBuffer|Uint8Array} arrayBuffer 
 * @returns {Promise<string>} Hex string
 */
export async function computeSha256(arrayBuffer) {
  const buffer = arrayBuffer.buffer ? arrayBuffer.buffer.slice(arrayBuffer.byteOffset, arrayBuffer.byteOffset + arrayBuffer.byteLength) : arrayBuffer;
  
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback fast hash if subtle crypto is unavailable in test runner
  let hash = 0;
  const view = new Uint8Array(buffer);
  for (let i = 0; i < view.length; i++) {
    hash = ((hash << 5) - hash) + view[i];
    hash |= 0;
  }
  return 'fallback_' + Math.abs(hash).toString(16);
}

/**
 * Checks if a file with the given SHA-256 hash already exists in the vault
 * @param {string} hash 
 * @returns {Promise<Object|null>} Existing file metadata or null
 */
export async function checkDuplicateHash(hash) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readonly');
    const store = tx.objectStore('files');
    const index = store.index('hash');
    const request = index.get(hash);

    request.onsuccess = () => {
      resolve(request.result || null);
    };
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Saves a file to the vault
 * @param {Object} fileData
 * @param {string} fileData.name
 * @param {ArrayBuffer|Uint8Array} fileData.arrayBuffer
 * @param {string} [fileData.folderId='default']
 * @param {string} [fileData.category='upload'] 'upload' | 'export'
 * @param {number} [fileData.pageCount=1]
 * @param {string} [fileData.hash]
 * @returns {Promise<Object>} The saved file record
 */
export async function saveFile({ name, arrayBuffer, folderId = 'default', category = 'upload', pageCount = 1, hash = null, isEncrypted = false }) {
  const db = await getDb();
  const fileHash = hash || await computeSha256(arrayBuffer);
  
  const rawBytes = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);
  const blob = new Blob([rawBytes], { type: 'application/pdf' });

  const record = {
    id: 'file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
    name: name || `Document_${Date.now()}.pdf`,
    size: rawBytes.byteLength,
    hash: fileHash,
    folderId: folderId || 'default',
    category: category, // 'upload' | 'export'
    pageCount: pageCount || 1,
    isEncrypted: Boolean(isEncrypted),
    blob: blob,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    const request = store.add(record);

    request.onsuccess = () => resolve(record);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Retrieves files matching optional folder and search filters, with sorting
 * @param {Object} options
 * @param {string} [options.folderId] 'all' | 'default' | 'export' | customFolderId
 * @param {string} [options.searchQuery]
 * @param {string} [options.sortBy='createdAt'] 'createdAt' | 'size' | 'name'
 * @param {string} [options.sortOrder='desc'] 'asc' | 'desc'
 */
export async function getFiles({ folderId = 'all', searchQuery = '', sortBy = 'createdAt', sortOrder = 'desc' } = {}) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readonly');
    const store = tx.objectStore('files');
    const request = store.getAll();

    request.onsuccess = () => {
      let results = request.result || [];

      // 1. Folder Filtering
      if (folderId && folderId !== 'all') {
        if (folderId === 'export') {
          results = results.filter(f => f.category === 'export');
        } else {
          results = results.filter(f => f.folderId === folderId);
        }
      }

      // 2. Search Query Filtering
      if (searchQuery && searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        results = results.filter(f => f.name.toLowerCase().includes(query));
      }

      // 3. Sorting
      results.sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        if (typeof valA === 'string') {
          return sortOrder === 'asc' 
            ? valA.localeCompare(valB) 
            : valB.localeCompare(valA);
        }

        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });

      resolve(results);
    };

    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Gets a single file record by ID with ArrayBuffer data
 * @param {string} id 
 * @returns {Promise<Object>}
 */
export async function getFileById(id) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readonly');
    const store = tx.objectStore('files');
    const request = store.get(id);

    request.onsuccess = async () => {
      const file = request.result;
      if (!file) {
        resolve(null);
        return;
      }
      if (file.blob && !file.arrayBuffer) {
        file.arrayBuffer = await file.blob.arrayBuffer();
      }
      resolve(file);
    };
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Updates the encryption status of an existing file in the vault
 * @param {string} fileId 
 * @param {boolean} isEncrypted 
 */
export async function updateFileEncryption(fileId, isEncrypted) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    const getReq = store.get(fileId);

    getReq.onsuccess = () => {
      const file = getReq.result;
      if (!file) {
        resolve(null);
        return;
      }
      file.isEncrypted = Boolean(isEncrypted);
      file.updatedAt = Date.now();
      const putReq = store.put(file);
      putReq.onsuccess = () => resolve(file);
      putReq.onerror = (e) => reject(e.target.error);
    };
    getReq.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Deletes a file by ID
 * @param {string} id 
 */
export async function deleteFile(id) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Deletes multiple files by an array of IDs
 * @param {string[]} ids 
 */
export async function deleteFiles(ids) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    
    ids.forEach(id => store.delete(id));

    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Renames a file
 * @param {string} id 
 * @param {string} newName 
 */
export async function renameFile(id, newName) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const file = getReq.result;
      if (!file) return reject(new Error('File not found'));
      file.name = newName;
      file.updatedAt = Date.now();
      store.put(file);
      resolve(file);
    };
    getReq.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Moves a file to another folder
 * @param {string} id 
 * @param {string} targetFolderId 
 */
export async function moveFile(id, targetFolderId) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const file = getReq.result;
      if (!file) return reject(new Error('File not found'));
      file.folderId = targetFolderId;
      file.updatedAt = Date.now();
      store.put(file);
      resolve(file);
    };
    getReq.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Folder CRUD operations
 */
export async function getFolders() {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('folders', 'readonly');
    const store = tx.objectStore('folders');
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function createFolder(name) {
  const db = await getDb();
  const folder = {
    id: 'folder_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    name: name.trim(),
    createdAt: Date.now()
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('folders', 'readwrite');
    const store = tx.objectStore('folders');
    const request = store.add(folder);

    request.onsuccess = () => resolve(folder);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function renameFolder(id, newName) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('folders', 'readwrite');
    const store = tx.objectStore('folders');
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const folder = getReq.result;
      if (!folder) return reject(new Error('Folder not found'));
      folder.name = newName.trim();
      store.put(folder);
      resolve(folder);
    };
    getReq.onerror = (e) => reject(e.target.error);
  });
}

export async function deleteFolder(id) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['folders', 'files'], 'readwrite');
    const folderStore = tx.objectStore('folders');
    const fileStore = tx.objectStore('files');

    // Delete folder record
    folderStore.delete(id);

    // Reset files in this folder back to 'default'
    const index = fileStore.index('folderId');
    const request = index.getAll(id);

    request.onsuccess = () => {
      const files = request.result || [];
      files.forEach(file => {
        file.folderId = 'default';
        fileStore.put(file);
      });
    };

    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Calculates total storage space used by the vault (in bytes and MB)
 * @returns {Promise<{ totalBytes: number, totalMb: string, fileCount: number }>}
 */
export async function getVaultStorageStats() {
  const files = await getFiles({ folderId: 'all' });
  const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);
  return {
    totalBytes,
    totalMb,
    fileCount: files.length
  };
}

/**
 * Clears all files and folders in the vault
 */
export async function clearVault() {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['files', 'folders'], 'readwrite');
    tx.objectStore('files').clear();
    tx.objectStore('folders').clear();

    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e.target.error);
  });
}
