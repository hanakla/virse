import { ModalProps } from "@fleur/mordred";
import escapeStringRegexp from "escape-string-regexp";
import { ChangeEvent, SyntheticEvent, useState } from "react";
import useEvent from "react-use-event-hook";
import { Button } from "../components/Button";
import Dropzone from "../components/Dropzone";
import { Input } from "../components/Input";
import { ModalBase } from "../components/ModalBase";
import { useTranslation } from "../hooks/useTranslation";
import { useFunc } from "../utils/hooks";

export function SelectModel({
  onClose,
}: ModalProps<{}, { file: File } | null>) {
  const t = useTranslation("common");

  const [file, setFile] = useState<File | null>(null);

  const handleFileDrop = useEvent((files: File[]) => {
    const [file] = files;
    if (!file) return;

    setFile(file);
  });

  const cancel = useEvent((e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  });

  return (
    <div onDragOver={cancel} onDrop={cancel}>
      <ModalBase
        onClose={onClose}
        content={
          <div>
            <Dropzone className="py-16 px-8" onFiles={handleFileDrop}>
              {!file ? <>Drop VRM file</> : <>{file.name}</>}
            </Dropzone>
          </div>
        }
        footer={
          <>
            <Button
              kind="primary"
              onClick={() => onClose(file ? { file } : null)}
              disabled={!file}
            >
              {t("ok")}
            </Button>
            <Button kind="default" onClick={() => onClose(null)}>
              {t("cancel")}
            </Button>
          </>
        }
      />
    </div>
  );
}
