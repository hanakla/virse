import { ModalProps } from "@fleur/mordred";
import { ReactNode } from "react";
import useEvent from "react-use-event-hook";
import { Button, ButtonKind } from "../components/Button";
import { ModalBase } from "../components/ModalBase";
import { useTranslation } from "../hooks/useTranslation";
import { useFocusRestore } from "../utils/hooks";

export function ConfirmModal({
  message,
  onClose,
  primaryButtonKind = "primary",
  okText,
  cancelText,
}: ModalProps<
  {
    message: ReactNode;
    primaryButtonKind?: ButtonKind;
    okText?: string;
    cancelText?: string;
  },
  boolean
>) {
  const t = useTranslation("common");

  useFocusRestore();

  const handleClickOk = useEvent(() => {
    onClose(true);
  });

  const handleClickCancel = useEvent(() => {
    onClose(false);
  });

  return (
    <ModalBase
      className="[&_.modal-content]:max-w-[400px]"
      content={<div className="leading-snug">{message}</div>}
      footer={
        <div className="flex gap-2">
          <Button kind="default" onClick={handleClickCancel} autoFocus>
            {cancelText ?? t("cancel")}
          </Button>
          <Button kind={primaryButtonKind} onClick={handleClickOk}>
            {okText ?? t("ok")}
          </Button>
        </div>
      }
      onClose={handleClickCancel}
    />
  );
}
