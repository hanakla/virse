export const rightHandShortcuts = {
  toggleDisplaySkeleton: 'b',
  selectSiblingBone: 'a',
  selectParentBone: 's',
  selectChildBone: 'd',
  toggleBoneControlMode: 'r',
  axisX: 'x',
  axisY: 'y',
  axisZ: 'z',
  changeCamToCapture: 'shift+c',
  changeCamToEditorial: 'c',
  keyboardShortcutHelp: 'h',
  previousAvatar: '1',
  nextAvatar: '2',
  boneListPrev: 's',
  boneListNext: 'd',
  boneListOk: 'f',
  boneListOk2: 'space',
} as const;

export function humanizeShortcutKey(key: string) {
  return key
    .split('+')
    .map((key) => key[0].toUpperCase() + key.slice(1))
    .join('+');
}
