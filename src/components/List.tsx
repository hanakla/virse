import { twx } from '@/utils/twx';
import { ComponentProps, forwardRef } from 'react';

export const List = forwardRef<HTMLUListElement, ComponentProps<'ul'>>(
  function List({ className, ...props }, ref) {
    return (
      <ul
        className={twx(
          'flex flex-col py-2 bg-white/80 rounded-lg text-sm',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

export const ListItem = forwardRef<
  HTMLLIElement,
  ComponentProps<'li'> & { active?: boolean }
>(function ListItem({ className, active, children, ...props }, ref) {
  return (
    <li
      className={twx(
        'p-[6px] text-[#444] user-select-none cursor-default',
        active && 'text-white bg-[#31cde9]/80',
        !active &&
          'active:bg-[#31cde9]/50 focus:bg-[#31cde9]/50 hover:bg-[#31cde9]/50',
        className,
      )}
      ref={ref}
      {...props}
    >
      {children}
    </li>
  );
});
