import { ProductionView } from '../ProductionView';

/** Production totals for the sweet line (*dulces*). */
export default function ProductionDulcesPage({
  searchParams,
}: {
  searchParams: { slotId?: string };
}) {
  return (
    <ProductionView
      basePath="/production/dulces"
      category="sweet"
      slotId={searchParams.slotId}
    />
  );
}
