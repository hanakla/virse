import { twx } from '@/utils/twx';
import * as RadTooltip from '@radix-ui/react-tooltip';
import { ReactNode } from 'react';

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
          <RadTooltip.Content
            className={twx(
              'z-[2] py-1.5 px-2 text-xs leading-none bg-white rounded',
              'shadow-[0px_10px_38px_-10px_rgba(14,_18,_22,_0.35),_0px_10px_20px_-15px_rgba(14,_18,_22,_0.2)]',
              'select-none [animation-duration:400ms] [animation-timing-function:cubic-bezier(0.16,_1,_0.3,_1)]',
            )}
          >
            {content}
            <RadTooltip.Arrow className="fill-white" />
          </RadTooltip.Content>
        </RadTooltip.Portal>
      </RadTooltip.Root>
    </RadTooltip.Provider>
  );
}
