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
      >
        <RadTooltip.Trigger asChild>{children}</RadTooltip.Trigger>
        <TooltipContent>
          {content}
          <TooltipArrow />
        </TooltipContent>
      </RadTooltip.Root>
    </RadTooltip.Provider>
  );
}

const TooltipContent = styled(RadTooltip.Content)`
  border-radius: 4px;
  padding: 10px 15px;
  font-size: 15px;
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
