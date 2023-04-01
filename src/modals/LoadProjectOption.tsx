import { ModalProps } from '@fleur/mordred/dist/react-bind';
import { useObjectState } from '@hanakla/arma';
import { css } from 'styled-components';
import { Button } from '../components/Button';
import { ModalBase } from '../components/ModalBase';
import { useTranslation } from '../hooks/useTranslation';

type Result = {
  loadPoseSet: boolean;
  clearCurrentPoses: boolean;
};

export function LoadProjectOption({ onClose }: ModalProps<{}, Result | null>) {
  const t = useTranslation('common');
  const [state, setState] = useObjectState<Result>({
    loadPoseSet: false,
    clearCurrentPoses: false,
  });

  return (
    <ModalBase
      onClose={onClose}
      content={
        <div
          css={`
            display: flex;
            flex-flow: column;
            gap: 8px;
            line-height: 1.4;
          `}
        >
          <div
            css={css`
              margin-bottom: 16px;
            `}
          >
            {t('loadProjectOption/confirm')}
          </div>

          <div>
            <label>
              <input
                type="checkbox"
                checked={state.loadPoseSet}
                onChange={({ currentTarget }) => {
                  setState({ loadPoseSet: currentTarget.checked });
                }}
              />
              {t('loadProjectOption/poseSets')}
            </label>
            <div
              css={css`
                margin-top: 4px;
                margin-left: 24px;
              `}
            >
              <label>
                <input
                  type="checkbox"
                  checked={state.clearCurrentPoses}
                  onChange={({ currentTarget }) => {
                    setState({ clearCurrentPoses: currentTarget.checked });
                  }}
                  disabled={!state.loadPoseSet}
                />
                {t('loadProjectOption/clearPoses')}
              </label>
              {state.loadPoseSet && !state.clearCurrentPoses && (
                <span
                  css={css`
                    display: block;
                    font-size: 14px;
                    margin-left: 24px;
                    color: #666;
                  `}
                >
                  {t('loadProjectOption/clearPoses/note')}
                </span>
              )}
            </div>
          </div>
        </div>
      }
      footer={
        <>
          <Button kind="primary" onClick={() => onClose(state)}>
            {t('continue')}
          </Button>
          <Button kind="default" onClick={() => onClose(null)}>
            {t('cancel')}
          </Button>
        </>
      }
    />
  );
}
