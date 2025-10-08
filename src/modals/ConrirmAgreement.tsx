import { ModalBase } from "../components/ModalBase";
import { Button } from "../components/Button";
import { ModalProps } from "@fleur/mordred";
import { Tooltip } from "../components/Tooltip";
import { useState } from "react";
import useEvent from "react-use-event-hook";

import AgreementJa from "../agreements.ja.md";
import AgreementEn from "../agreements.en.md";
import { useRouter } from "next/router";
import { useTranslation } from "../hooks/useTranslation";

export function ConfirmAgreement({ onClose }: ModalProps<{}, void>) {
  const router = useRouter();
  const t = useTranslation("common");

  const [is強要, setIs強要] = useState(false);

  const handleClickDisagree = useEvent(() => {
    setIs強要(true);
    setTimeout(() => setIs強要(false), 3000);
  });

  const AgreementDocument = router.locale === "ja" ? AgreementJa : AgreementEn;

  return (
    <ModalBase
      className="leading-snug [&_h1]:font-bold [&_p]:my-6 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
      header={<h1>{t("confirmAgreement/title")}</h1>}
      footer={
        <div className="flex gap-2">
          <Tooltip content={t("confirmAgreement/invalid")} open={is強要}>
            <Button kind="default" onClick={handleClickDisagree}>
              {t("confirmAgreement/disagree")}
            </Button>
          </Tooltip>

          <Button kind="primary" onClick={onClose}>
            {t("confirmAgreement/agree")}
          </Button>
        </div>
      }
      content={
        <div>
          <AgreementDocument />
        </div>
      }
      onClose={onClose}
    />
  );
}
