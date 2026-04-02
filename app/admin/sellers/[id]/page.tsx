import { SellerDetailsView } from "@/app/admin/components/SellerDetailsView";

interface SellerDetailPageProps {
  params: { id: string };
}

export const metadata = {
  title: "Seller Details | Eterna Admin",
  description: "View and manage seller details",
};

export default function SellerDetailPage({ params }: SellerDetailPageProps) {
  return (
    <div className="space-y-4">
      <div>
        <a href="/admin/sellers" className="text-blue-600 hover:underline">
          ← Back to Sellers
        </a>
        <h1 className="text-3xl font-bold mt-4">Seller Details</h1>
      </div>

      <SellerDetailsView sellerId={params.id} />
    </div>
  );
}
