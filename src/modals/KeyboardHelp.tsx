import { ModalProps } from "@fleur/mordred";
import { memo, ReactNode } from "react";
import { Button } from "../components/Button";
import { ModalBase } from "../components/ModalBase";
import { Trans } from "../components/Trans";
import { humanizeShortcutKey, rightHandShortcuts } from "../domains/ui";
import { useTranslation } from "../hooks/useTranslation";
import { useFocusRestore } from "../utils/hooks";
import { twx } from "@/utils/twx";

export function KeyboardHelp({
  temporalyShow,
  onClose,
}: ModalProps<{ temporalyShow?: boolean }, void>) {
  const t = useTranslation("common");

  useFocusRestore();

  return (
    <ModalBase
      className="mt-4 mb-6 bg-transparent"
      header={<h1>{t("keyboardHelp/title")}</h1>}
      footer={
        temporalyShow ? (
          void 0
        ) : (
          <>
            <Button kind="primary" onClick={onClose}>
              {t("ok")}
            </Button>
          </>
        )
      }
      onClose={onClose}
      content={
        <div>
          <Grid>
            <Entry
              keyCode={humanizeShortcutKey(
                rightHandShortcuts.keyboardShortcutHelp,
              )}
              desc={t("keyboardHelp/showHelp")}
            />
          </Grid>

          <Separator />

          <Grid>
            <Entry
              keyCode={humanizeShortcutKey(rightHandShortcuts.previousAvatar)}
              desc={t("keyboardHelp/previousAvatar")}
            />
            <Entry
              keyCode={humanizeShortcutKey(rightHandShortcuts.nextAvatar)}
              desc={t("keyboardHelp/nextAvatar")}
            />
          </Grid>

          <Separator />

          <Grid>
            <Entry
              keyCode={humanizeShortcutKey(
                rightHandShortcuts.changeCamToEditorial,
              )}
              desc={t("keyboardHelp/camEditorial")}
            />
            <Entry
              keyCode={humanizeShortcutKey(
                rightHandShortcuts.changeCamToCapture,
              )}
              desc={t("keyboardHelp/camCapture")}
            />
          </Grid>

          <Separator />

          <Grid>
            <Entry
              keyCode={humanizeShortcutKey(
                rightHandShortcuts.toggleBoneControlMode,
              )}
              desc={<Trans i18nKey="keyboardHelp/boneControlMode" />}
            />
            <Entry
              keyCode={humanizeShortcutKey(
                rightHandShortcuts.toggleDisplaySkeleton,
              )}
              desc={t("keyboardHelp/changeDisplaySkeleton")}
            />
          </Grid>

          <Separator />

          <h1>ボーン選択中</h1>

          <Grid>
            <Entry
              keyCode={humanizeShortcutKey(rightHandShortcuts.selectParentBone)}
              desc={t("keyboardHelp/selectParentBone")}
            />
            <Entry
              keyCode={humanizeShortcutKey(rightHandShortcuts.selectChildBone)}
              desc={t("keyboardHelp/selectChildBone")}
            />
            <Entry
              keyCode={humanizeShortcutKey(
                rightHandShortcuts.selectSiblingBone,
              )}
              desc={t("keyboardHelp/selectSiblingBone")}
            />

            <Entry
              keyCode={humanizeShortcutKey(rightHandShortcuts.resetCurrentBone)}
              desc={
                <Trans
                  i18nKey="keyboardHelp/resetCurrentBone"
                  values={{ axis: "X" }}
                />
              }
            />
            <Entry
              keyCode={humanizeShortcutKey(rightHandShortcuts.axisX)}
              desc={
                <Trans
                  i18nKey="keyboardHelp/axisFilter"
                  values={{ axis: "X" }}
                />
              }
            />
            <Entry
              keyCode={humanizeShortcutKey(rightHandShortcuts.axisY)}
              desc={
                <Trans
                  i18nKey="keyboardHelp/axisFilter"
                  values={{ axis: "Y" }}
                />
              }
            />
            <Entry
              keyCode={humanizeShortcutKey(rightHandShortcuts.axisZ)}
              desc={
                <Trans
                  i18nKey="keyboardHelp/axisFilter"
                  values={{ axis: "Z" }}
                />
              }
            />
            <Entry
              keyCode={humanizeShortcutKey(rightHandShortcuts.toggleMirror)}
              desc={<Trans i18nKey="keyboardHelp/mirrorBone" />}
            />
          </Grid>
        </div>
      }
    />
  );
}

const Grid = function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
};

const Separator = memo(function Separator() {
  return (
    <div
      className="my-4 border-t border-t-[rgba(208,208,208,0.5)]"
      role="separator"
    />
  );
});

const Key = memo(function Key({ children }: { children: ReactNode }) {
  return (
    <code
      className={twx(
        "inline-block p-1 mr-4 min-w-5 flex-none text-center",
        "bg-[#eee] border border-solid border-gray-300 rounded",
      )}
    >
      {children}
    </code>
  );
});

const Entry = memo(
  ({ keyCode, desc }: { keyCode: string; desc: ReactNode }) => {
    return (
      <div className="flex items-start">
        <Key>{keyCode}</Key>
        <div
          className={twx(
            "flow-root py-0.5 leading-snug",
            "before:content-[''] before:block before:w-0 before:h-0 before:-mt-0.5",
            "after:content-[''] after:block after:w-0 after:h-0 after:-mb-0.5",
          )}
        >
          {desc}
        </div>
      </div>
    );
  },
);
