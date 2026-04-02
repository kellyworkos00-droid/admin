import { SellersList } from "../components/SellersList";

export const metadata = {
  title: "Sellers Management | Eterna Admin",
  description: "Manage all sellers on the Eterna platform",
};

export default function SellersPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Sellers Management</h1>
        <p className="text-gray-600 mt-1">Manage and verify sellers on your platform</p>
      </div>

      <SellersList />
    </div>
  );
}
