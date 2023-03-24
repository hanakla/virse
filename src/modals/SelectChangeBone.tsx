import useFocusTrap from '@charlietango/use-focus-trap';
import { ModalProps } from '@fleur/mordred/dist/react-bind';
import { ExtendedKeyboardEvent } from 'mousetrap';
import { ChangeEvent, useRef, useState } from 'react';
import useEvent from 'react-use-event-hook';
import { css } from 'styled-components';
import { Button } from '../components/Button';

import { ModalBase } from '../components/ModalBase';
import { useTranslation } from '../hooks/useTranslation';
import { useFunc, useBindMousetrap, useFocusRestore } from '../utils/hooks';

export function SelectChangeBones({
  boneNames,
  activeBoneName,
  onClose,
}: ModalProps<
  { boneNames: string[]; activeBoneName?: string },
  string | null
>) {
  const t = useTranslation('common');

  useFocusRestore({ restoreOnUnmount: true });

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

  useBindMousetrap(listRef, 's', (e: ExtendedKeyboardEvent) => {
    e.stopPropagation();
    setIndex((index) => (index - 1 + boneNames.length) % boneNames.length);
  });

  useBindMousetrap(listRef, 'd', (e: ExtendedKeyboardEvent) => {
    e.stopPropagation();
    setIndex((index) => (index + 1) % boneNames.length);
  });

  useBindMousetrap(listRef, 'f', (e: ExtendedKeyboardEvent) => {
    e.stopPropagation();
    handleClickOk();
  });

  useBindMousetrap(listRef, 'enter', () => {
    handleClickOk();
  });

  useBindMousetrap(listRef, 'esc', () => {
    handleClickCancel();
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
            {t('ok')} (F)
          </Button>
          <Button kind="default" onClick={handleClickCancel}>
            {t('cancel')}
          </Button>
        </>
      }
    />
  );
}
