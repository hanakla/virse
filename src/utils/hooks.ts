import mousetrap from "mousetrap";
import { useEffect, useRef } from "react";

export const useMousetrap = (handlerKey, handlerCallback, evtType) => {
  let actionRef = useRef(null);
  actionRef.current = handlerCallback;

  useEffect(() => {
    mousetrap.bind(
      handlerKey,
      (evt, combo) => {
        typeof actionRef.current === "function" &&
          actionRef.current(evt, combo);
      },
      evtType
    );
    return () => {
      mousetrap.unbind(handlerKey);
    };
  }, [handlerKey]);
};
