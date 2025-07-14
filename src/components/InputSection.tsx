import { twx } from '@/utils/twx';
import { ReactNode } from 'react';

export const InputSection = ({
  title,
  className,
  children,
}: {
  title: ReactNode;
  className?: string;
  children: ReactNode;
}) => {
  return (
    <label className={twx('block w-full', className)}>
      <span className="flex w-full mb-1 text-sm font-bold">{title}</span>
      {children}
    </label>
  );
};

export const InputSectionDiv = ({
  title,
  className,
  children,
}: {
  title: ReactNode;
  className?: string;
  children: ReactNode;
}) => {
  return (
    <div className={twx('block w-full', className)}>
      <span className="block w-full mb-1 text-sm font-bold">{title}</span>
      {children}
    </div>
  );
};
