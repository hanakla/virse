import { selectFile } from '@hanakla/arma';
import { rgba } from 'polished';
import { ReactNode } from 'react';
import { useDropArea } from 'react-use';
import useEvent from 'react-use-event-hook';
import { css } from 'styled-components';

export default function Dropzone({
  children,
  className,
  onFiles,
}: {
  children: ReactNode;
  className?: string;
  onFiles: (files: File[]) => void;
}) {
  const [bind] = useDropArea({
    onFiles: (files, event) => {
      event.preventDefault();
      event.stopPropagation();

      onFiles(files);
    },
  });

  const handleClick = useEvent(async () => {
    const files = await selectFile();
    if (files.length === 0) return;

    onFiles(files);
  });

  return (
    <div
      css={css`
        display: flex;
        flex-wrap: wrap;
        align-content: center;
        justify-content: center;
        width: 100%;
        padding: 32px;
        background-color: ${rgba('#fff', 0.8)};
        box-shadow: inset 0 0 8px ${rgba('#000', 0.2)};
        border-radius: 8px;
        user-select: none;
        cursor: pointer;
      `}
      {...bind}
      className={className}
      onClick={handleClick}
    >
      {children}
    </div>
  );
}
