import * as THREE from 'three';

/**
 * 操作によってマテリアルを切り替えるObject
 *
 * @event select 選択
 * @event unselect 選択解除
 * @event focus カーソルをフォーカス
 * @event blur フォーカスが外れる
 */
export class InteractableObject extends THREE.Object3D {
  public readonly controlTarget: THREE.Object3D;
  public readonly tag: string;

  private _gizmo: THREE.Mesh;
  private _defaultMaterial: THREE.Material;
  private _hoverMaterial: THREE.Material;
  private _activeMaterial: THREE.Material;

  constructor(
    controlTarget: THREE.Object3D,
    gizmoGeometry: THREE.BufferGeometry,
    defaultMaterial: THREE.Material,
    hoverMaterial: THREE.Material,
    activeMaterial: THREE.Material,
    tag: string
  ) {
    super();

    this.controlTarget = controlTarget;
    this._gizmo = new THREE.Mesh(gizmoGeometry, defaultMaterial);
    this._defaultMaterial = defaultMaterial;
    this._hoverMaterial = hoverMaterial;
    this._activeMaterial = activeMaterial;
    this.add(this._gizmo);

    this.addEventListener('select', () => {
      this._handleSelect();
    });

    this.addEventListener('unselect', () => {
      this._handleUnselect();
    });

    this.addEventListener('focus', () => {
      this._handleFocus();
    });

    this.addEventListener('blur', () => {
      this._handleBlur();
    });

    this.tag = tag;
  }

  private _handleSelect = () => {
    this._gizmo.material = this._activeMaterial;
  };

  private _handleUnselect = () => {
    this._gizmo.material = this._defaultMaterial;
  };

  private _handleFocus = () => {
    this._gizmo.material = this._hoverMaterial;
  };

  private _handleBlur = () => {
    this._gizmo.material = this._defaultMaterial;
  };
}
