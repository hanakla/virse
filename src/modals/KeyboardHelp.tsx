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
      header={<h1>{t('keyboardHelp/title')}</h1>}
      onClose={onClose}
      content={
        <div>
          <Grid>
            <Entry keyCode={'H'} desc={t('keyboardHelp/showHelp')} />
          </Grid>

          <Grid>
            <Entry
              keyCode={'R'}
              desc={<Trans i18nKey="keyboardHelp/boneControlMode" />}
            />
            <Entry
              keyCode={'B (Bone)'}
              desc={t('keyboardHelp/changeDisplaySkeleton')}
            />
          </Grid>

          <Grid>
            <Entry keyCode={'A'} desc={t('keyboardHelp/selectSiblingBone')} />
            <Entry keyCode={'S'} desc={t('keyboardHelp/selectParentBone')} />
            <Entry keyCode={'D'} desc={t('keyboardHelp/selectChildBone')} />
          </Grid>

          <Grid>
            <Entry
              keyCode="X"
              desc={
                <Trans
                  i18nKey="keyboardHelp/axisFilter"
                  values={{ axis: 'X' }}
                />
              }
            />
            <Entry
              keyCode="Y"
              desc={
                <Trans
                  i18nKey="keyboardHelp/axisFilter"
                  values={{ axis: 'Y' }}
                />
              }
            />
            <Entry
              keyCode="Z"
              desc={
                <Trans
                  i18nKey="keyboardHelp/axisFilter"
                  values={{ axis: 'Z' }}
                />
              }
            />
          </Grid>
        </div>
      }
      footer={<></>}
    />
  );
}

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  & + & {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid rgba(208, 208, 208, 0.5);
  }
`;

const Key = styled.code`
  display: inline-block;
  padding: 4px;
  margin-right: 16px;
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
          &::before {
            content: '';
            display: block;
            width: 0;
            height: 0;
            margin-top: -2px;
          }
          &::after {
            content: '';
            display: block;
            width: 0;
            height: 0;
            margin-bottom: -2px;
          }
        `}
      >
        {desc}
      </div>
    </div>
  );
};
