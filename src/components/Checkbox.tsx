import { twx } from '@/utils/twx';
import { ComponentProps, forwardRef } from 'react';

type Props = ComponentProps<'input'>;

export const Checkbox = forwardRef<HTMLInputElement, Props>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      {...props}
      type="checkbox"
      className={twx(
        'm-0 mr-1 border border-gray-600/50 bg-white outline-none checked:border-gray-600'
      )}
    />
  )
);
