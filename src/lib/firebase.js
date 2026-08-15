// We are replacing Firebase with a localStorage-based event emitter system
// This ensures that state is always saved locally across tab refreshes
// without requiring any backend configuration.

const listeners = new Map();

// Helper to get a unique localStorage key for each committee's path
const getStorageKey = (committeeId, path) => `mun_${committeeId}_${path}`;

/**
 * Saves state to localStorage and triggers local listeners
 */
export const syncStateToDB = (committeeId, path, data) => {
  const key = getStorageKey(committeeId, path);
  
  if (data === null || data === undefined) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, JSON.stringify(data));
  }
  
  // Trigger any active listeners in the current tab
  if (listeners.has(key)) {
    listeners.get(key).forEach(callback => callback(data));
  }
};

/**
 * Listens to state changes from localStorage
 */
export const listenToDBState = (committeeId, path, callback) => {
  const key = getStorageKey(committeeId, path);
  
  // Register the listener
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }
  listeners.get(key).add(callback);
  
  // Immediately call with the current stored value
  const stored = localStorage.getItem(key);
  if (stored !== null) {
    try {
      callback(JSON.parse(stored));
    } catch (e) {
      console.error("Error parsing stored data for", key, e);
      callback(null);
    }
  } else {
    callback(null);
  }
  
  // Return an unsubscribe function
  return () => {
    if (listeners.has(key)) {
      listeners.get(key).delete(callback);
      if (listeners.get(key).size === 0) {
        listeners.delete(key);
      }
    }
  };
};

// Listen to changes from other tabs so they stay in sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('mun_')) {
      if (listeners.has(e.key)) {
        try {
          const data = e.newValue ? JSON.parse(e.newValue) : null;
          listeners.get(e.key).forEach(callback => callback(data));
        } catch (err) {
          console.error("Error parsing cross-tab storage data", err);
        }
      }
    }
  });
}
