import { twx } from '@/utils/twx';
import { DetailedHTMLProps, forwardRef, InputHTMLAttributes } from 'react';

type Props = DetailedHTMLProps<
  InputHTMLAttributes<HTMLInputElement>,
  HTMLInputElement
> & {
  $size?: 'min';
};

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ className, $size, ...props }, ref) => {
    return (
      <input
        ref={ref}
        {...props}
        className={twx(
          'block w-full py-1 px-3 bg-white border-none rounded outline-none text-sm text-[initial]',
          $size === 'min' && 'py-1 px-2',
          className
        )}
      />
    );
  }
);
