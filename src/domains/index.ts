import Fleur, { withReduxDevTools } from "@fleur/fleur";
import { withSSPDistributer } from "@fleur/next";
import { EditorStore } from "./editor";

export const App = new Fleur({ stores: [EditorStore] });
export const createContext = () => {
  const context = withSSPDistributer(App.createContext());

  if (typeof window !== "undefined") {
    withReduxDevTools(context);
  }

  return context;
};
