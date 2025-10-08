import { twx } from "@/utils/twx";
import { selectFile } from "@hanakla/arma";
import { ReactNode } from "react";
import { useDropArea } from "react-use";
import useEvent from "react-use-event-hook";

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
      {...bind}
      className={twx(
        "flex flex-wrap items-center justify-center w-full p-8 bg-white/80 rounded-lg shadow-inner cursor-pointer select-none",
        className,
      )}
      onClick={handleClick}
    >
      {children}
    </div>
  );
}
