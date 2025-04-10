// Database configuration
const DB_NAME = 'vera_project_db';
const DB_VERSION = 1;
const DIRECTORY_STORE = 'directoryHandles';

// TODO: Check with Marcus if the commented code below is needed.
// Type declarations for FileSystemHandle APIs that may not be fully typed in TS
//interface PermissionDescriptor {
//  mode?: 'read' | 'readwrite';
//}

// Initialize the database
export const initDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB error:', event);
      reject('Could not open IndexedDB');
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store for directory handles
      if (!db.objectStoreNames.contains(DIRECTORY_STORE)) {
        const store = db.createObjectStore(DIRECTORY_STORE, {
          keyPath: 'path',
        });
        store.createIndex('path', 'path', { unique: true });
        store.createIndex('lastOpened', 'lastOpened', { unique: false });
      }
    };
  });
};

// Store a directory handle
export const storeDirectoryHandle = async (
  path: string,
  dirHandle: FileSystemDirectoryHandle
): Promise<void> => {
  try {
    // Verify we can persist permissions
    if (
      (await dirHandle.queryPermission({ mode: 'readwrite' })) !== 'granted'
    ) {
      // Request permission explicitly
      const permission = await dirHandle.requestPermission({
        mode: 'readwrite',
      });
      if (permission !== 'granted') {
        console.warn('Permission not granted for directory', path);
      }
    }

    const db = await initDatabase();
    const transaction = db.transaction(DIRECTORY_STORE, 'readwrite');
    const store = transaction.objectStore(DIRECTORY_STORE);

    const entry = {
      path,
      dirHandle,
      lastOpened: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = (event) => {
        console.error('Error storing directory handle:', event);
        reject('Failed to store directory handle');
      };
    });
  } catch (error) {
    console.error('Error in storeDirectoryHandle:', error);
    throw error;
  }
};

// Get a directory handle by path
export const getDirectoryHandle = async (
  path: string
): Promise<FileSystemDirectoryHandle | null> => {
  try {
    const db = await initDatabase();
    const transaction = db.transaction(DIRECTORY_STORE, 'readonly');
    const store = transaction.objectStore(DIRECTORY_STORE);

    return new Promise((resolve, reject) => {
      const request = store.get(path);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // Update the lastOpened timestamp
          updateLastOpened(path).catch(console.error);
          resolve(result.dirHandle);
        } else {
          resolve(null);
        }
      };

      request.onerror = (event) => {
        console.error('Error getting directory handle:', event);
        reject('Failed to get directory handle');
      };
    });
  } catch (error) {
    console.error('Error in getDirectoryHandle:', error);
    return null;
  }
};

// Update lastOpened timestamp
const updateLastOpened = async (path: string): Promise<void> => {
  try {
    const db = await initDatabase();
    const transaction = db.transaction(DIRECTORY_STORE, 'readwrite');
    const store = transaction.objectStore(DIRECTORY_STORE);

    return new Promise((resolve, reject) => {
      // First get the current record
      const getRequest = store.get(path);

      getRequest.onsuccess = () => {
        const data = getRequest.result;
        if (data) {
          // Update lastOpened
          data.lastOpened = new Date().toISOString();

          // Put it back
          const putRequest = store.put(data);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = (event) => {
            console.error('Error updating lastOpened:', event);
            reject('Failed to update lastOpened');
          };
        } else {
          resolve();
        }
      };

      getRequest.onerror = (event) => {
        console.error('Error getting record for update:', event);
        reject('Failed to get record for update');
      };
    });
  } catch (error) {
    console.error('Error in updateLastOpened:', error);
  }
};

// Verify permission for a stored directory handle
export const verifyPermission = async (
  dirHandle: FileSystemDirectoryHandle,
  mode: 'read' | 'readwrite' = 'readwrite'
): Promise<boolean> => {
  try {
    // Check current permission
    let permission = await dirHandle.queryPermission({ mode });

    // If not granted, request it
    if (permission !== 'granted') {
      permission = await dirHandle.requestPermission({ mode });
    }

    return permission === 'granted';
  } catch (error) {
    console.error('Error verifying permission:', error);
    return false;
  }
};
