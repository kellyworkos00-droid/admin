'use client';

import { useEffect, useState, useCallback } from 'react';
import { ProductForm } from './ProductForm';
import { fetchSellerProductsCached, invalidateProductCache } from '@/lib/product-cache';
import { FiAlertCircle, FiRefreshCw, FiTrash2, FiEdit2, FiPlus, FiSearch } from 'react-icons/fi';

interface ProductsListProps {
  sellerId: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  imageUrl: string;
  price: number;
  bulkPrice: number;
  minOrder: number;
  maxOrder?: number;
  stockQty: number;
  discountPct: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  description?: string;
}

export function ProductsList({ sellerId }: ProductsListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [retrying, setRetrying] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchSellerProductsCached(sellerId, {
        limit: 100,
        offset: 0,
        search: search || undefined,
        category: category || undefined,
      });

      if (data.error) {
        // API call failed but returned fallback
        console.warn('Products loaded with fallback:', data.error);
        setError(data.error);
        setProducts(data.products || []);
      } else {
        setError(null);
        setProducts(data.products || []);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load products';
      setError(message);
      setProducts([]); // Show empty state instead of crashing
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, [sellerId, search, category]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    invalidateProductCache('seller', sellerId);
    await loadProducts();
  }, [loadProducts, sellerId]);

  const handleDelete = useCallback(
    async (productId: string) => {
      if (!confirm('Are you sure you want to delete this product?')) return;

      setDeleteError(null);
      try {
        const res = await fetch(`/api/v1/seller/products/${productId}`, {
          method: 'DELETE',
          headers: { 'X-Seller-ID': sellerId },
        });

        if (!res.ok) {
          throw new Error(`Delete failed: ${res.status}`);
        }

        // Invalidate cache and reload
        invalidateProductCache('seller', sellerId);
        await loadProducts();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete product';
        setDeleteError(message);
      }
    },
    [sellerId, loadProducts]
  );

  // Show form if editing or creating
  if (editingProduct || showForm) {
    return (
      <ProductForm
        sellerId={sellerId}
        productId={editingProduct?.id}
        initialData={editingProduct}
        onSuccess={async () => {
          setShowForm(false);
          setEditingProduct(null);
          invalidateProductCache('seller', sellerId);
          await loadProducts();
        }}
        onCancel={() => {
          setShowForm(false);
          setEditingProduct(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Products</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your product inventory</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition shadow-sm"
        >
          <FiPlus size={18} />
          Add Product
        </button>
      </div>

      {/* Error States */}
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900">Warning</h3>
              <p className="text-sm text-amber-800 mt-1">{error}</p>
              <p className="text-xs text-amber-700 mt-2">
                Showing cached data where available. Click retry to refresh.
              </p>
            </div>
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100 rounded transition disabled:opacity-50"
            >
              <FiRefreshCw size={14} className={retrying ? 'animate-spin' : ''} />
              {retrying ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        </div>
      )}

      {deleteError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-sm text-red-800 mt-1">{deleteError}</p>
            </div>
            <button
              onClick={() => setDeleteError(null)}
              className="text-red-600 hover:text-red-700 font-medium text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Products
          </label>
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition"
          >
            <option value="">All Categories</option>
            <option value="Groceries">Groceries</option>
            <option value="Electronics">Electronics</option>
            <option value="Fashion">Fashion & Apparel</option>
            <option value="Hardware">Tools & Hardware</option>
            <option value="Home & Living">Home & Living</option>
            <option value="Health & Beauty">Health & Beauty</option>
          </select>
        </div>
      </div>

      {/* Loading State with Skeleton */}
      {loading && !products.length && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && products.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="text-gray-600 mb-4 font-medium">No products found</p>
          <p className="text-sm text-gray-500 mb-6">
            {search || category
              ? 'Try adjusting your filters'
              : 'Start by creating your first product'}
          </p>
          {!search && !category && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition"
            >
              <FiPlus size={16} />
              Create Your First Product
            </button>
          )}
        </div>
      )}

      {/* Products Table */}
      {!loading && products.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                    Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-gray-500 line-clamp-1 mt-1">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-sm text-gray-600">
                      {product.sku}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {product.category}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        KES {Number(product.price).toLocaleString()}
                      </div>
                      {product.bulkPrice && product.bulkPrice !== product.price && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          Bulk: KES {Number(product.bulkPrice).toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          product.stockQty > 10
                            ? 'bg-green-100 text-green-800'
                            : product.stockQty > 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {product.stockQty} units
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          product.isActive
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingProduct(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit product"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete product"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 border-t px-4 py-3 text-sm text-gray-600">
            Showing {products.length} products
          </div>
        </div>
      )}
    </div>
  );
}
