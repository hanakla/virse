import { ModalProps } from "@fleur/mordred";
import { useObjectState } from "@hanakla/arma/react-hooks";
import { Button } from "../components/Button";
import { ModalBase } from "../components/ModalBase";
import { useTranslation } from "../hooks/useTranslation";

type Result = {
  loadPoseSet: boolean;
  clearCurrentPoses: boolean;
};

export function LoadProjectOption({ onClose }: ModalProps<{}, Result | null>) {
  const t = useTranslation("common");
  const [state, setState] = useObjectState<Result>({
    loadPoseSet: false,
    clearCurrentPoses: false,
  });

  return (
    <ModalBase
      onClose={onClose}
      content={
        <div className="flex flex-col gap-2 leading-snug">
          <div className="mb-4">{t("loadProjectOption/confirm")}</div>

          <div>
            <label>
              <input
                type="checkbox"
                checked={state.loadPoseSet}
                onChange={({ currentTarget }) => {
                  setState({ loadPoseSet: currentTarget.checked });
                }}
              />
              {t("loadProjectOption/poseSets")}
            </label>
            <div className="mt-1 ml-6">
              <label>
                <input
                  type="checkbox"
                  checked={state.clearCurrentPoses}
                  onChange={({ currentTarget }) => {
                    setState({ clearCurrentPoses: currentTarget.checked });
                  }}
                  disabled={!state.loadPoseSet}
                />
                {t("loadProjectOption/clearPoses")}
              </label>
              {state.loadPoseSet && !state.clearCurrentPoses && (
                <span className="block text-sm ml-6 text-gray-600">
                  {t("loadProjectOption/clearPoses/note")}
                </span>
              )}
            </div>
          </div>
        </div>
      }
      footer={
        <>
          <Button kind="primary" onClick={() => onClose(state)}>
            {t("continue")}
          </Button>
          <Button kind="default" onClick={() => onClose(null)}>
            {t("cancel")}
          </Button>
        </>
      }
    />
  );
}
