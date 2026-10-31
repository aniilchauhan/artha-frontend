/**
 * Optimized API Client for Axion Dashboard
 * Features:
 * - Request deduplication (prevent multiple simultaneous calls)
 * - In-memory caching with TTL
 * - Automatic retry with exponential backoff
 * - Request cancellation on component unmount
 * - Type-safe responses
 */

import { axionFetch, axionApiPath } from './in-process';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface RequestOptions {
  cache?: boolean;
  cacheTTL?: number; // milliseconds
  retries?: number;
  retryDelay?: number; // milliseconds
  signal?: AbortSignal;
}

class ApiClient {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();
  private readonly DEFAULT_CACHE_TTL = 30000; // 30 seconds
  private readonly DEFAULT_RETRIES = 2;
  private readonly DEFAULT_RETRY_DELAY = 1000; // 1 second

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear specific cache entry
   */
  clearCacheKey(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cached data if available and not expired
   */
  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Set cache entry
   */
  private setCache<T>(key: string, data: T, ttl: number): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });
    
    // Cleanup expired entries periodically
    if (this.cache.size > 100) {
      this.cleanupExpiredCache();
    }
  }

  /**
   * Make API request with caching and deduplication
   */
  async request<T>(
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      cache = true,
      cacheTTL = this.DEFAULT_CACHE_TTL,
      retries = this.DEFAULT_RETRIES,
      retryDelay = this.DEFAULT_RETRY_DELAY,
      signal,
    } = options;

    const cacheKey = path;

    // Return cached data if available
    if (cache) {
      const cached = this.getCached<T>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    // Return existing pending request if available (deduplication)
    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      return pending as Promise<T>;
    }

    // Create new request
    const requestPromise = this.executeRequest<T>(
      path,
      retries,
      retryDelay,
      signal
    ).then((data) => {
      // Cache successful response
      if (cache) {
        this.setCache(cacheKey, data, cacheTTL);
      }
      // Remove from pending
      this.pendingRequests.delete(cacheKey);
      return data;
    }).catch((error) => {
      // Remove from pending
      this.pendingRequests.delete(cacheKey);
      throw error;
    });

    // Store pending request
    this.pendingRequests.set(cacheKey, requestPromise);

    return requestPromise;
  }

  /**
   * Execute HTTP request with retry logic
   */
  private async executeRequest<T>(
    path: string,
    retries: number,
    retryDelay: number,
    signal?: AbortSignal
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await axionFetch(axionApiPath(path), {
          signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry if request was aborted
        if (signal?.aborted || lastError.name === 'AbortError') {
          throw lastError;
        }

        // Don't retry on last attempt
        if (attempt < retries) {
          // Exponential backoff
          const delay = retryDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Request failed');
  }

  /**
   * POST request
   */
  async post<T>(
    path: string,
    body: any,
    options: Omit<RequestOptions, 'cache'> = {}
  ): Promise<T> {
    const { signal, retries = this.DEFAULT_RETRIES, retryDelay = this.DEFAULT_RETRY_DELAY } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await axionFetch(axionApiPath(path), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (signal?.aborted || lastError.name === 'AbortError') {
          throw lastError;
        }

        if (attempt < retries) {
          const delay = retryDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('POST request failed');
  }

  /**
   * Batch multiple requests (executes in parallel)
   */
  async batch<T extends Record<string, any>>(
    requests: Record<keyof T, string>,
    options: RequestOptions = {}
  ): Promise<T> {
    const entries = Object.entries(requests);
    const promises = entries.map(([key, path]) =>
      this.request(path as string, options).then((data) => [key, data])
    );

    const results = await Promise.all(promises);
    return Object.fromEntries(results) as T;
  }

  /**
   * Prefetch data (fire-and-forget caching)
   */
  prefetch(path: string, cacheTTL?: number): void {
    this.request(path, { cache: true, cacheTTL }).catch(() => {
      // Silently ignore prefetch errors
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export types
export type { RequestOptions };
