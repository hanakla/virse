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
    <label
      css={`
        display: block;
        width: 100%;
      `}
      className={className}
    >
      <span
        css={`
          display: flex;
          width: 100%;
          margin-bottom: 4px;
          font-size: 14px;
          font-weight: bold;
        `}
      >
        {title}
      </span>
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
    <div
      css={`
        display: block;
        width: 100%;
      `}
      className={className}
    >
      <span
        css={`
          display: block;
          width: 100%;
          margin-bottom: 4px;
          font-size: 14px;
          font-weight: bold;
        `}
      >
        {title}
      </span>
      {children}
    </div>
  );
};
