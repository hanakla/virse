import { ModalProps } from '@fleur/mordred/dist/react-bind';
import { ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { ModalBase } from '../components/ModalBase';
import { Trans } from '../components/Trans';
import { useTranslation } from '../hooks/useTranslation';
import { useFocusRestore } from '../utils/hooks';

export function KeyboardHelp({ onClose }: ModalProps<{}, string[] | null>) {
  const t = useTranslation('common');

  useFocusRestore({ restoreOnUnmount: true });

  return (
    <ModalBase
      css={css`
        background-color: transparent;
      `}
      onClose={onClose}
      content={
        <div
          css={css`
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          `}
        >
          <Entry keyCode={'H'} desc={t('keyboardHelp/showHelp')} />
          <Entry
            keyCode={'R'}
            desc={<Trans i18nKey="keyboardHelp/boneControlMode" />}
          />
          <Entry
            keyCode={'B (Bone)'}
            desc={t('keyboardHelp/changeDisplaySkeleton')}
          />
          <Entry keyCode={'A'} desc={t('keyboardHelp/selectSiblingBone')} />
          <Entry keyCode={'S'} desc={t('keyboardHelp/selectParentBone')} />
          <Entry keyCode={'D'} desc={t('keyboardHelp/selectChildBone')} />
        </div>
      }
      footer={<></>}
    />
  );
}

const Key = styled.code`
  display: inline-block;
  padding: 4px;
  margin-right: 4px;
  min-width: 20px;
  text-align: center;
  background-color: #eee;
  border: 1px solid #c8c8c8;
  border-radius: 4px;
  flex: none;
`;

const Entry = ({ keyCode, desc }: { keyCode: string; desc: ReactNode }) => {
  return (
    <div
      css={css`
        display: flex;
        align-items: flex-start;
      `}
    >
      <Key>{keyCode}</Key>
      <div
        css={css`
          display: flow-root;
          padding: 2px 0;
          line-height: 1.4;
        `}
      >
        {desc}
      </div>
    </div>
  );
};
