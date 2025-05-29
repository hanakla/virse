import { twx } from '@/utils/twx';
import { ComponentProps, forwardRef } from 'react';

type Props = ComponentProps<'a'>;

export const ExternalLink = forwardRef<HTMLAnchorElement, Props>(
  function ExternalLink({ className, ...props }, ref) {
    return (
      <a
        {...props}
        ref={ref}
        target="_blank"
        rel="noopener noreferrer"
        className={twx('text-[#0070f3]', className)}
      />
    );
  }
);
