import { VRMPose } from '@pixiv/three-vrm';

type PoseChangeEntry = {
  undo: () => void;
  redo: () => void;
};

export type HistoryEntry = PoseChangeEntry;

export class History {
  public undoStack: HistoryEntry[] = [];
  public redoStack: HistoryEntry[] = [];

  public push(entry: HistoryEntry) {
    this.undoStack.push(entry);
    this.redoStack = [];
  }

  public undo() {
    const entry = this.undoStack.pop();
    if (!entry) return;
    entry.undo();
    this.redoStack.push(entry);
  }

  public redo() {
    const entry = this.redoStack.pop();
    if (!entry) return;
    entry.redo();
    this.undoStack.push(entry);
  }

  public clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}
