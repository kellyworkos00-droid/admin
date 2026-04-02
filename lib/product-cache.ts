/**
 * Product Data Fetching with Caching, Retry, and Fallback
 * Ensures products always display, even with network issues
 */

const CACHE_KEYS = {
  SELLER_PRODUCTS: (sellerId: string) => `products:seller:${sellerId}`,
  PUBLIC_PRODUCTS: (category?: string) => `products:public:${category || 'all'}`,
  PRODUCT_DETAIL: (id: string) => `product:${id}`,
};

const CACHE_TTL = {
  SELLER_PRODUCTS: 5 * 60 * 1000, // 5 minutes
  PUBLIC_PRODUCTS: 10 * 60 * 1000, // 10 minutes
  PRODUCT_DETAIL: 15 * 60 * 1000, // 15 minutes
};

export interface CachedData<T> {
  data: T;
  timestamp: number;
  version: number;
}

/**
 * Simple in-memory cache with TTL
 */
class ProductCache {
  private cache = new Map<string, { data: any; expiry: number }>();

  set(key: string, value: any, ttl: number) {
    this.cache.set(key, {
      data: value,
      expiry: Date.now() + ttl,
    });
  }

  get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(keyPattern?: string) {
    if (!keyPattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(keyPattern)) {
        this.cache.delete(key);
      }
    }
  }
}

const cache = new ProductCache();

/**
 * Retry mechanism with exponential backoff
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3,
  baseDelayMs = 500
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (response.ok) {
        return response;
      }

      // Retry on server errors
      if (response.status >= 500) {
        throw new Error(`Server error: ${response.status}`);
      }

      // Don't retry on client errors
      if (response.status >= 400) {
        return response;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries - 1) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error("Failed to fetch after retries");
}

/**
 * Fetch seller products with caching & retry
 */
export async function fetchSellerProductsCached(
  sellerId: string,
  options?: { limit?: number; offset?: number; search?: string; category?: string }
) {
  const cacheKey = CACHE_KEYS.SELLER_PRODUCTS(sellerId);
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const params = new URLSearchParams({
      limit: String(options?.limit || 50),
      offset: String(options?.offset || 0),
      ...(options?.search && { search: options.search }),
      ...(options?.category && { category: options.category }),
    });

    const response = await fetchWithRetry(
      `/api/v1/seller/products?${params}`,
      { headers: { 'X-Seller-ID': sellerId } }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Cache successful result
    cache.set(cacheKey, data, CACHE_TTL.SELLER_PRODUCTS);

    return data;
  } catch (error) {
    console.error('[ProductCache] Seller products fetch failed:', error);
    
    // Return empty array as fallback
    return {
      products: [],
      pagination: { total: 0, limit: options?.limit || 50, offset: options?.offset || 0 },
      error: error instanceof Error ? error.message : 'Failed to load products',
    };
  }
}

/**
 * Fetch public products with caching & retry
 */
export async function fetchPublicProductsCached(
  options?: { category?: string; search?: string; page?: number; limit?: number }
) {
  const cacheKey = CACHE_KEYS.PUBLIC_PRODUCTS(options?.category);
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const params = new URLSearchParams({
      ...(options?.category && { category: options.category }),
      ...(options?.search && { search: options.search }),
      ...(options?.page && { page: String(options.page) }),
      ...(options?.limit && { limit: String(options.limit) }),
    });

    const response = await fetchWithRetry(`/api/v1/products?${params}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Cache successful result
    cache.set(cacheKey, data, CACHE_TTL.PUBLIC_PRODUCTS);

    return data;
  } catch (error) {
    console.error('[ProductCache] Public products fetch failed:', error);
    
    // Return empty array as fallback
    return {
      data: [],
      meta: { page: options?.page || 1, limit: options?.limit || 20, total: 0 },
      error: error instanceof Error ? error.message : 'Failed to load products',
    };
  }
}

/**
 * Fetch single product with caching & retry
 */
export async function fetchProductDetailCached(productId: string) {
  const cacheKey = CACHE_KEYS.PRODUCT_DETAIL(productId);
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetchWithRetry(`/api/v1/products/${productId}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Cache successful result
    cache.set(cacheKey, data, CACHE_TTL.PRODUCT_DETAIL);

    return data;
  } catch (error) {
    console.error('[ProductCache] Product detail fetch failed:', error);
    
    // Return null as fallback
    return null;
  }
}

/**
 * Invalidate cache for product updates
 */
export function invalidateProductCache(type: 'seller' | 'public' | 'all', sellerId?: string) {
  if (type === 'all') {
    cache.clear();
  } else if (type === 'seller' && sellerId) {
    cache.clear(CACHE_KEYS.SELLER_PRODUCTS(sellerId));
  } else if (type === 'public') {
    cache.clear('products:public');
  }
}

/**
 * Prefetch products to warm up cache
 */
export async function prefetchSellerProducts(sellerId: string) {
  await fetchSellerProductsCached(sellerId);
}

/**
 * Get cache stats for debugging
 */
export function getCacheStats() {
  return {
    timestamp: new Date().toISOString(),
    note: 'In-memory cache - resets on page reload',
  };
}
