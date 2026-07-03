import { ProductionView } from '../ProductionView';

/** Production totals for the savory line (*salados*). */
export default function ProductionSaladosPage({
  searchParams,
}: {
  searchParams: { slotId?: string };
}) {
  return (
    <ProductionView
      basePath="/production/salados"
      category="salty"
      slotId={searchParams.slotId}
    />
  );
}
