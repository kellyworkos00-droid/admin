import { ProductsList } from "@/app/admin/components/ProductsList";

interface SellerProductsPageProps {
  params: {
    id: string;
  };
}

export const metadata = {
  title: "My Products | Seller Dashboard",
  description: "Manage your products and inventory",
};

export default function SellerProductsPage({ params }: SellerProductsPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Product Management</h1>
        <p className="text-gray-600 mt-1">
          Create, edit, and manage your products for sale
        </p>
      </div>

      <ProductsList sellerId={params.id} />
    </div>
  );
}
