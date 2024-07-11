import * as RadTooltip from '@radix-ui/react-tooltip';
import { ReactNode } from 'react';
import styled, { css } from 'styled-components';

export function Tooltip({
  content,
  children,
  open,
  disableHoverableContent,
}: {
  open?: boolean;
  disableHoverableContent?: boolean;
  content: ReactNode;
  children?: ReactNode;
}) {
  return (
    <RadTooltip.Provider>
      <RadTooltip.Root
        open={open}
        disableHoverableContent={disableHoverableContent}
        delayDuration={100}
      >
        <RadTooltip.Trigger asChild>{children}</RadTooltip.Trigger>
        <RadTooltip.Portal>
          <TooltipContent>
            {content}
            <TooltipArrow />
          </TooltipContent>
        </RadTooltip.Portal>
      </RadTooltip.Root>
    </RadTooltip.Provider>
  );
}

const TooltipContent = styled(RadTooltip.Content)`
  z-index: 2;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 12px;
  line-height: 1;
  background-color: white;
  box-shadow: rgba(14, 18, 22, 0.35) 0px 10px 38px -10px,
    rgba(14, 18, 22, 0.2) 0px 10px 20px -15px;
  user-select: none;
  animation-duration: 400ms;
  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform, opacity;
`;

const TooltipArrow = styled(RadTooltip.Arrow)`
  fill: white;
`;
