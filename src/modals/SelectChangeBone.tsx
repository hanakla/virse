import useFocusTrap from '@charlietango/use-focus-trap';
import { ModalComponentType } from '@fleur/mordred';
import { ModalProps } from '@fleur/mordred/dist/react-bind';
import { useCombineRef } from '@hanakla/arma';
import escapeStringRegexp from 'escape-string-regexp';
import { ExtendedKeyboardEvent } from 'mousetrap';
import {
  ChangeEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useEffectOnce } from 'react-use';
import useEvent from 'react-use-event-hook';
import { css } from 'styled-components';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ModalBase } from '../components/ModalBase';
import { useFunc, useBindMousetrap } from '../utils/hooks';

export function SelectChangeBones({
  boneNames,
  activeBoneName,
  onClose,
}: ModalProps<
  { boneNames: string[]; activeBoneName?: string },
  string | null
>) {
  const prevFocusElementRef = useRef<HTMLElement | null>(
    document.activeElement as HTMLElement
  );

  const focusTrapRef = useFocusTrap();
  const listRef = useRef<HTMLSelectElement | null>(null);

  const [selectedIndex, setIndex] = useState(() => {
    return boneNames.indexOf(activeBoneName ?? '') === -1
      ? 0
      : boneNames.indexOf(activeBoneName ?? '');
  });

  const onChange = useFunc(
    ({ currentTarget }: ChangeEvent<HTMLSelectElement>) => {
      setIndex(currentTarget.selectedIndex);
    }
  );

  const handleClickOk = useEvent(() => {
    onClose(boneNames[selectedIndex]);
  });

  const handleClickCancel = useEvent(() => {
    onClose(null);
  });

  useBindMousetrap(listRef, ';', (e: ExtendedKeyboardEvent) => {
    e.stopPropagation();
    setIndex((index) => (index - 1 + boneNames.length) % boneNames.length);
  });

  useBindMousetrap(listRef, "'", (e: ExtendedKeyboardEvent) => {
    e.stopPropagation();
    setIndex((index) => (index + 1) % boneNames.length);
  });

  useBindMousetrap(listRef, 'enter', () => {
    handleClickOk();
  });

  useBindMousetrap(listRef, 'esc', () => {
    handleClickCancel();
  });

  useLayoutEffect(() => {
    const restoreFocusTarget = prevFocusElementRef.current;

    return () => {
      setTimeout(() => {
        restoreFocusTarget?.focus();
      });
    };
  });

  return (
    <ModalBase
      ref={focusTrapRef}
      css={css`
        background-color: transparent;
      `}
      onClose={onClose}
      content={
        <div
          css={`
            display: flex;
            flex-flow: column;
            gap: 8px;
          `}
        >
          <select
            ref={listRef}
            css={`
              width: 100%;
              height: 400px;
            `}
            multiple
            onChange={onChange}
            autoFocus
          >
            {boneNames.map((boneName, idx) => (
              <option
                key={boneName}
                value={boneName}
                selected={idx === selectedIndex}
              >
                {boneName}
              </option>
            ))}
          </select>
        </div>
      }
      footer={
        <>
          <Button kind="primary" onClick={handleClickOk}>
            OK
          </Button>
          <Button kind="default" onClick={handleClickCancel}>
            キャンセル
          </Button>
        </>
      }
    />
  );
}
