import { useCallback, useState } from 'react';

/** Retain measured scroll space when a shorter tab replaces a longer one. */
export default function useStableScrollHeight(contentKey: string) {
  const [measured, setMeasured] = useState({ key: contentKey, height: 0 });
  const onContentSizeChange = useCallback(
    (_width: number, height: number) => {
      if (!Number.isFinite(height) || height <= 0) return;
      setMeasured(previous => {
        const current = previous.key === contentKey ? previous.height : 0;
        const next = Math.max(current, Math.ceil(height));
        return previous.key === contentKey && next === current
          ? previous
          : { key: contentKey, height: next };
      });
    },
    [contentKey],
  );
  return {
    minHeight: measured.key === contentKey ? measured.height : 0,
    onContentSizeChange,
  };
}
