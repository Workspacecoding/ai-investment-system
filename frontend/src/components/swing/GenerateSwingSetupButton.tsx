"use client";

import { Button } from "@/components/ui/button";

type GenerateSwingSetupButtonProps = {
  assetId: number;
  disabled?: boolean;
  onGenerate: (assetId: number) => void;
};

export function GenerateSwingSetupButton({
  assetId,
  disabled,
  onGenerate,
}: GenerateSwingSetupButtonProps) {
  return (
    <Button
      disabled={disabled}
      onClick={() => onGenerate(assetId)}
      size="sm"
      type="button"
      variant="outline"
    >
      重新產生
    </Button>
  );
}
