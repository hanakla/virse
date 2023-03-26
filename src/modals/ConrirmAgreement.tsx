import { ModalBase } from '../components/ModalBase';
import { css } from 'styled-components';
import { Button } from '../components/Button';
import { ModalProps } from '@fleur/mordred/dist/react-bind';
import { Tooltip } from '../components/Tooltip';
import { useState } from 'react';
import useEvent from 'react-use-event-hook';

import AgreementJa from '../agreements.ja.md';
import AgreementEn from '../agreements.en.md';
import { useRouter } from 'next/router';
import { useTranslation } from '../hooks/useTranslation';

export function ConfirmAgreement({ onClose }: ModalProps<{}, void>) {
  const router = useRouter();
  const t = useTranslation('common');

  const [is強要, setIs強要] = useState(false);

  const handleClickDisagree = useEvent(() => {
    setIs強要(true);
    setTimeout(() => setIs強要(false), 3000);
  });

  const AgreementDocument = router.locale === 'ja' ? AgreementJa : AgreementEn;

  return (
    <ModalBase
      css={css`
        line-height: 1.4;

        h1 {
          font-weight: bold;
        }

        p {
          margin: 24px 0;
        }

        ul {
          list-style: disc;
          padding-left: 20px;
        }

        ol {
          list-style: decimal;
          padding-left: 20px;
        }
      `}
      header={<h1>{t('confirmAgreement/title')}</h1>}
      footer={
        <div
          css={css`
            display: flex;
            gap: 8px;
          `}
        >
          <Tooltip content={t('confirmAgreement/invalid')} open={is強要}>
            <Button kind="default" onClick={handleClickDisagree}>
              {t('confirmAgreement/disagree')}
            </Button>
          </Tooltip>

          <Button kind="primary" onClick={onClose}>
            {t('confirmAgreement/agree')}
          </Button>
        </div>
      }
      content={
        <div>
          <AgreementDocument />
        </div>
      }
      onClose={onClose}
    />
  );
}
