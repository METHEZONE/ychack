export const dynamic = "force-dynamic";

import { VendorDetail } from "@/components/vendor/VendorDetail";
import { Nav } from "@/components/ui/Nav";

interface VendorPageProps {
  params: Promise<{ id: string }>;
}

export default async function VendorPage({ params }: VendorPageProps) {
  const { id } = await params;
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--background)]">
      <Nav />
      <div className="flex-1 overflow-y-auto">
        <VendorDetail vendorId={id} />
      </div>
    </div>
  );
}
