// Global data cache for better performance
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

class DataCache {
  private cache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_TTL = 2 * 60 * 1000; // 2 minutes
  private readonly STORAGE_PREFIX = 'social_connect_cache_';

  constructor() {
    // Load from localStorage on initialization
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_PREFIX)) {
          const cacheKey = key.replace(this.STORAGE_PREFIX, '');
          const item = localStorage.getItem(key);
          if (item) {
            const parsed = JSON.parse(item);
            this.cache.set(cacheKey, parsed);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
    }
  }

  private saveToStorage(key: string, item: CacheItem<any>): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    
    try {
      localStorage.setItem(this.STORAGE_PREFIX + key, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  private removeFromStorage(key: string): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    
    try {
      localStorage.removeItem(this.STORAGE_PREFIX + key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const item = {
      data,
      timestamp: Date.now(),
      expiresIn: ttl
    };
    this.cache.set(key, item);
    this.saveToStorage(key, item);
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.expiresIn) {
      this.cache.delete(key);
      this.removeFromStorage(key);
      return null;
    }

    return item.data;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    if (Date.now() - item.timestamp > item.expiresIn) {
      this.cache.delete(key);
      this.removeFromStorage(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.removeFromStorage(key);
  }

  clear(): void {
    this.cache.clear();
    // Clear localStorage cache items
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear localStorage cache:', error);
    }
  }

  // Cache keys
  KEYS = {
    FEED_POSTS: 'feed_posts',
    EXPLORE_POSTS: 'explore_posts',
    RECENT_USERS: 'recent_users',
    USER_PROFILE: (userId: string) => `user_profile_${userId}`,
    USER_POSTS: (userId: string) => `user_posts_${userId}`,
    NOTIFICATIONS: (userId: string) => `notifications_${userId}`,
  };
}

export const dataCache = new DataCache();
