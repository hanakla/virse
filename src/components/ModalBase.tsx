import { rgba } from 'polished';
import { forwardRef, MouseEvent, ReactNode, useEffect } from 'react';
import { css } from 'styled-components';
import { useFunc } from '../utils/hooks';

type Props = {
  header?: ReactNode;
  content: ReactNode;
  footer?: ReactNode;
  className?: string;
  closeOnBackdropClick?: boolean;
  onClose: (value: null) => void;
};

export const ModalBase = forwardRef<HTMLDivElement, Props>(function ModalBase(
  { className, header, content, footer, onClose, closeOnBackdropClick = true },
  ref
) {
  const onBackdropClick = useFunc((e: MouseEvent) => {
    if (!closeOnBackdropClick) return;
    if (e.target === e.currentTarget) onClose(null);
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      if (e.key === 'Escape') onClose(null);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      css={css`
        position: fixed;
        top: 0;
        left: 0;
        display: flex;
        width: 100%;
        height: 100%;
        justify-content: center;
        z-index: 1;
        background-color: ${rgba('#000', 0.5)};
        overflow: auto;
      `}
      className={className}
      onClick={onBackdropClick}
      tabIndex={-1}
    >
      <div
        css={`
          flex: none;
          width: 50vw;
          min-width: 300px;
          margin: auto;
          border-radius: 8px;
          background-color: #fff;
          box-shadow: 0 0 16px ${rgba('#222', 0.2)};
        `}
        className="modal-content"
      >
        {header && (
          <div
            css={`
              padding: 24px 24px 0;
              h1 {
                text-align: center;
                font-weight: bold;
                font-size: 16px;
              }
            `}
          >
            {header}
          </div>
        )}

        <div
          css={`
            padding: 24px;
          `}
        >
          {content}
        </div>

        {footer && (
          <div
            css={`
              margin-top: 8px;
              padding: 0 16px 16px;
            `}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
});
