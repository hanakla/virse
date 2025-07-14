import { twx } from '@/utils/twx';
import { ComponentPropsWithoutRef, forwardRef } from 'react';

export type ButtonKind = 'default' | 'primary' | 'danger';

type Props = {
  kind?: ButtonKind;
  size?: 'min';
  blocked?: boolean;
} & ComponentPropsWithoutRef<'button'>;

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ kind = 'default', size, blocked, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={twx(
          'flex items-center justify-center flex-wrap w-full p-2 cursor-pointer',
          'text-[#34c0b9] bg-white border-none rounded-full text-sm outline-none ease-default duration-200 transition-colors',
          'hover:bg-[#eaeaea] active:bg-[#d6d6d6] focus:bg-[#d6d6d6] focus:ring-2 focus:ring-[#34c0b9]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          size === 'min' ? 'p-1 text-xs' : '',
          kind === 'primary' &&
            'text-white bg-[#34c0b9] hover:bg-[#2ea89e] active:bg-[#238981]',
          kind === 'danger' &&
            'text-white bg-[#f44336] hover:bg-[#e53935] active:bg-[#c62828] focus:ring-2 focus:ring-[#ec2929]',
          blocked && 'block w-full',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
