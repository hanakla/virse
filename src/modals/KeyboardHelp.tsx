import { ModalProps } from '@fleur/mordred/dist/react-bind';
import { ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { Button } from '../components/Button';
import { ModalBase } from '../components/ModalBase';
import { Trans } from '../components/Trans';
import { humanizeShortcutKey, rightHandShortcuts } from '../domains/ui';
import { useTranslation } from '../hooks/useTranslation';
import { useFocusRestore } from '../utils/hooks';

export function KeyboardHelp({
  temporalyShow,
  onClose,
}: ModalProps<{ temporalyShow?: boolean }, void>) {
  const t = useTranslation('common');

  useFocusRestore({ restoreOnUnmount: true });

  return (
    <ModalBase
      css={transparentStyle}
      header={<h1>{t('keyboardHelp/title')}</h1>}
      footer={
        temporalyShow ? (
          void 0
        ) : (
          <>
            <Button kind="primary" onClick={onClose}>
              {t('ok')}
            </Button>
          </>
        )
      }
      onClose={onClose}
      content={
        <div>
          <Grid>
            <Entry
              keyCode={humanizeShortcutKey(
                rightHandShortcuts.keyboardShortcutHelp
              )}
              desc={t('keyboardHelp/showHelp')}
            />
          </Grid>

          <Grid>
            <Entry
              keyCode={humanizeShortcutKey(rightHandShortcuts.previousAvatar)}
              desc={t('keyboardHelp/previousAvatar')}
            />
            <Entry
              keyCode={humanizeShortcutKey(rightHandShortcuts.nextAvatar)}
              desc={t('keyboardHelp/nextAvatar')}
            />
          </Grid>

          <Grid>
            <Entry
              keyCode={humanizeShortcutKey(
                rightHandShortcuts.changeCamToEditorial
              )}
              desc={t('keyboardHelp/camEditorial')}
            />
            <Entry
              keyCode={humanizeShortcutKey(
                rightHandShortcuts.changeCamToCapture
              )}
              desc={t('keyboardHelp/camCapture')}
            />
          </Grid>

          <Grid>
            <Entry
              keyCode={humanizeShortcutKey(
                rightHandShortcuts.toggleBoneControlMode
              )}
              desc={<Trans i18nKey="keyboardHelp/boneControlMode" />}
            />
            <Entry
              keyCode={humanizeShortcutKey(
                rightHandShortcuts.toggleDisplaySkeleton
              )}
              desc={t('keyboardHelp/changeDisplaySkeleton')}
            />
          </Grid>

          <Grid>
            <Entry
              keyCode={humanizeShortcutKey(rightHandShortcuts.selectParentBone)}
              desc={t('keyboardHelp/selectParentBone')}
            />
            <Entry
              keyCode={humanizeShortcutKey(rightHandShortcuts.selectChildBone)}
              desc={t('keyboardHelp/selectChildBone')}
            />
            <Entry
              keyCode={humanizeShortcutKey(
                rightHandShortcuts.selectSiblingBone
              )}
              desc={t('keyboardHelp/selectSiblingBone')}
            />
          </Grid>

          <Grid>
            <Entry
              keyCode={rightHandShortcuts.axisX}
              desc={
                <Trans
                  i18nKey="keyboardHelp/axisFilter"
                  values={{ axis: 'X' }}
                />
              }
            />
            <Entry
              keyCode={rightHandShortcuts.axisY}
              desc={
                <Trans
                  i18nKey="keyboardHelp/axisFilter"
                  values={{ axis: 'Y' }}
                />
              }
            />
            <Entry
              keyCode={rightHandShortcuts.axisZ}
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

const transparentStyle = css`
  background-color: transparent;
`;
