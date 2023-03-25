import { rgba } from 'polished';
import { ReactNode } from 'react';
import useMeasure from 'react-use-measure';
import { transitionCss } from '../styles/mixins';

export const Sidebar = ({
  side,
  className,
  opened,
  children,
}: {
  side: 'left' | 'right';
  className?: string;
  opened: boolean;
  children: ReactNode;
}) => {
  const [sidebarRef, sidebarBBox] = useMeasure();

  return (
    <div className={className}>
      <div
        ref={sidebarRef}
        css={`
          display: flex;
          flex-flow: column;
          /* gap: 16px; */
          width: 100%;
          height: 100%;
          background-color: ${rgba('#34c0b9', 0.8)};
          ${transitionCss}
        `}
        style={{
          transform:
            side === 'left'
              ? opened
                ? 'translateX(0)'
                : 'translateX(calc(-100% - 48px))'
              : opened
              ? 'translateX(0)'
              : 'translateX(calc(100% + 48px))',
        }}
      >
        {children}

        {side === 'left' ? (
          <div
            css={`
              position: absolute;
              top: 0;
              left: 100%;
              background-image: url('wave.svg');
              background-size: auto 40px;
              background-position: center;
              background-repeat: repeat-x;
              transform: translateX(40px) rotateZ(90deg);
              transform-origin: top left;
              opacity: 0.8;
            `}
            style={{
              width: sidebarBBox.height,
              height: 40,
              transform: opened
                ? 'scaleX(100%) translateX(40px) rotateZ(90deg)'
                : 'scaleX(120%) translateX(40px) rotateZ(90deg)',
            }}
          />
        ) : (
          <div
            css={`
              position: absolute;
              top: 0;
              right: 100%;
              background-image: url('wave.svg');
              background-size: auto 40px;
              background-position: center;
              background-repeat: repeat-x;
              /* transform: translateX(40px) rotateZ(90deg); */
              transform-origin: top right;
              opacity: 0.8;
            `}
            style={{
              width: sidebarBBox.height,
              height: 40,
              transform: opened
                ? 'scaleX(100%) rotateZ(-90deg) translateY(-100%)'
                : 'scaleX(120%) rotateZ(-90deg) translateY(-100%)',
            }}
          />
        )}
      </div>
    </div>
  );
};
