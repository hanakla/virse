import { rgba } from 'polished';
import { forwardRef, MouseEvent, ReactNode } from 'react';
import { useFunc } from '../utils/hooks';

type Props = {
  header?: ReactNode;
  content: ReactNode;
  footer?: ReactNode;
  className?: string;
  onClose: (value: null) => void;
};

export const ModalBase = forwardRef<HTMLDivElement, Props>(
  ({ className, header, content, footer, onClose }, ref) => {
    const onBackdropClick = useFunc((e: MouseEvent) => {
      if (e.target === e.currentTarget) onClose(null);
    });

    return (
      <div
        ref={ref}
        css={`
          position: fixed;
          top: 0;
          left: 0;
          display: flex;
          width: 100%;
          height: 100%;
          justify-content: center;
          z-index: 1;
          background-color: ${rgba('#000', 0.5)};
        `}
        className={className}
        onClick={onBackdropClick}
      >
        <div
          css={`
            flex: none;
            width: 50vw;
            min-width: 300px;
            margin: auto;
            border-radius: 8px;
            background-color: #fff;
          `}
        >
          {header && (
            <div
              css={`
                padding: 16px 16px 0;
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
              padding: 16px;
            `}
          >
            {content}
          </div>

          {footer && (
            <div
              css={`
                padding: 0 16px 16px;
              `}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    );
  }
);
