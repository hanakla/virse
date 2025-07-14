import { twx } from '@/utils/twx';
import NextLink from 'next/link';
import { ComponentProps, forwardRef } from 'react';

export const Link = forwardRef<
  HTMLAnchorElement,
  ComponentProps<typeof NextLink>
>(({ className, ...props }, ref) => {
  return (
    <NextLink
      {...props}
      className={twx(
        'text-[#0070f3] not-[[aria-disabled]]:text-gray-400 not-[[aria-disabled]]:pointer-events-none',
        className,
      )}
      ref={ref}
    />
  );
});
