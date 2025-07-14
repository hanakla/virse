import { rgba } from 'polished';
import { ReactNode } from 'react';
import useMeasure from 'react-use-measure';
import { transitionCss } from '../styles/mixins';
import { css } from 'styled-components';
import { twx } from '@/utils/twx';

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
    <div
      css={css`
        ${transitionCss}
      `}
      className={className}
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
      <div
        ref={sidebarRef}
        className="flex flex-col w-full h-full bg-[#34c0b9]/80"
      >
        {children}

        {side === 'left' ? (
          <div
            className={twx(
              'absolute top-0 left-full bg-[url("./wave.svg")] opacity-80 bg-[auto_40px] bg-center bg-repeat-x',
              'transform-[translateX(40px)_rotateZ(90deg)] origin-top-left',
            )}
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
            className={twx(
              "absolute top-0 right-full bg-[url('./wave.svg')] opacity-80 bg-[auto_40px] bg-center bg-repeat-x",
              'transform-[translateX(40px)_rotateZ(-90deg)] origin-top-right',
            )}
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
