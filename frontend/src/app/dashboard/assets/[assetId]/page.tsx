import { AssetDetailClient } from "./AssetDetailClient";

type AssetDetailPageProps = {
  params: Promise<{ assetId: string }>;
};

export default async function AssetDetailPage({ params }: AssetDetailPageProps) {
  const { assetId } = await params;
  return <AssetDetailClient assetId={Number(assetId)} />;
}
