import { forwardRef, MouseEvent, ReactNode, useEffect } from "react";
import { useFunc } from "../utils/hooks";
import { twx } from "@/utils/twx";

type Props = {
  header?: ReactNode;
  content: ReactNode;
  footer?: ReactNode;
  className?: string;
  closeOnBackdropClick?: boolean;
  onClose: (value: null) => void;
};

export const ModalBase = forwardRef<HTMLDivElement, Props>(function ModalBase(
  { className, header, content, footer, onClose, closeOnBackdropClick = true },
  ref,
) {
  const onBackdropClick = useFunc((e: MouseEvent) => {
    if (!closeOnBackdropClick) return;
    if (e.target === e.currentTarget) onClose(null);
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      if (e.key === "Escape") onClose(null);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={twx(
        "fixed top-0 left-0 flex w-full h-full justify-center z-10 bg-black/50 overflow-auto",
        className,
      )}
      onClick={onBackdropClick}
      tabIndex={-1}
    >
      <div className="modal-content flex-none w-[40dvw] min-w-[300px] m-auto rounded-lg bg-white shadow-[0_0_16px_rgba(34,34,34,0.2)]">
        {header && (
          <div className="pt-6 px-6 [&_h1]:text-center [&_h1]:font-bold [&_h1]:text-lg/none">
            {header}
          </div>
        )}

        <div className="p-6">{content}</div>

        {footer && <div className="mt-2 px-4 pb-4">{footer}</div>}
      </div>
    </div>
  );
});
