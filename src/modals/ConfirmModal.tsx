import { ModalProps } from '@fleur/mordred/dist/react-bind';
import { ReactNode } from 'react';
import useEvent from 'react-use-event-hook';
import { css } from 'styled-components';
import { Button, ButtonKind } from '../components/Button';
import { ModalBase } from '../components/ModalBase';
import { useTranslation } from '../hooks/useTranslation';
import { useFocusRestore } from '../utils/hooks';

export function ConfirmModal({
  message,
  onClose,
  primaryButtonKind = 'primary',
  okText,
  cancelText,
}: ModalProps<
  {
    message: ReactNode;
    primaryButtonKind?: ButtonKind;
    okText?: string;
    cancelText?: string;
  },
  boolean
>) {
  const t = useTranslation('common');

  useFocusRestore({ restoreOnUnmount: true });

  const handleClickOk = useEvent(() => {
    onClose(true);
  });

  const handleClickCancel = useEvent(() => {
    onClose(false);
  });

  return (
    <ModalBase
      css={`
        .modal-content {
          max-width: 400px;
        }
      `}
      content={
        <div
          css={`
            line-height: 1.4;
          `}
        >
          {message}
        </div>
      }
      footer={
        <div
          css={css`
            display: flex;
            gap: 8px;
          `}
        >
          <Button kind="default" onClick={handleClickCancel} autoFocus>
            {cancelText ?? t('cancel')}
          </Button>
          <Button kind={primaryButtonKind} onClick={handleClickOk}>
            {okText ?? t('ok')}
          </Button>
        </div>
      }
      onClose={handleClickCancel}
    />
  );
}
