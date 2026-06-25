import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, CompositionEvent } from 'react';

type ImeTextControl = HTMLInputElement | HTMLTextAreaElement;
type CompositionAwareEvent = { nativeEvent?: unknown };
type KeyboardAwareEvent = CompositionAwareEvent & { nativeEvent?: { keyCode?: number } };

export function isImeComposing(event?: CompositionAwareEvent | null): boolean {
  if (!event || typeof event.nativeEvent !== 'object' || event.nativeEvent === null) {
    return false;
  }
  const native = event.nativeEvent as { isComposing?: boolean; inputType?: string };
  return Boolean(
    native.isComposing ||
      (typeof native.inputType === 'string' &&
        native.inputType.toLowerCase().includes('composition')),
  );
}

export function shouldIgnoreImeAction(
  event?: KeyboardAwareEvent | null,
  composingRef?: { current: boolean },
): boolean {
  return Boolean(composingRef?.current) || isImeComposing(event) || event?.nativeEvent?.keyCode === 229;
}

function shouldSyncImeDraft(
  currentValue: string,
  nextValue: string,
  composing: boolean,
): boolean {
  return !composing && currentValue !== nextValue;
}

export function useImeBufferedInput(
  value: string,
  onCommit?: (value: string) => void,
) {
  const [draft, setDraft] = useState(value);
  const composingRef = useRef(false);

  useEffect(() => {
    setDraft((current) =>
      shouldSyncImeDraft(current, value, composingRef.current) ? value : current,
    );
  }, [value]);

  const commit = (next: string) => {
    setDraft(next);
    onCommit?.(next);
  };

  const handleChange = (event: ChangeEvent<ImeTextControl>) => {
    const next = event.target.value;
    setDraft(next);
    if (composingRef.current || isImeComposing(event)) return;
    onCommit?.(next);
  };

  const handleCompositionStart = () => {
    composingRef.current = true;
  };

  const handleCompositionEnd = (event: CompositionEvent<ImeTextControl>) => {
    composingRef.current = false;
    const next = event.currentTarget.value;
    setDraft(next);
    onCommit?.(next);
  };

  return {
    value: draft,
    commit,
    composingRef,
    inputProps: {
      value: draft,
      onChange: handleChange,
      onCompositionStart: handleCompositionStart,
      onCompositionUpdate: handleCompositionStart,
      onCompositionEnd: handleCompositionEnd,
    },
  };
}
