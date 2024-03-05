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
  public enabled: boolean = true;

  private _active: boolean = false;
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
    tag: string,
    public targetType: 'fk' | 'ik'
  ) {
    super();

    this.controlTarget = controlTarget;
    this._gizmo = new THREE.Mesh(gizmoGeometry, defaultMaterial);
    this._defaultMaterial = defaultMaterial;
    this._hoverMaterial = hoverMaterial;
    this._activeMaterial = activeMaterial;
    this.add(this._gizmo);

    this.tag = tag;
  }

  public selected() {
    if (!this.enabled) return;
    this._active = true;
    this._gizmo.material = this._activeMaterial;
    this.dispatchEvent({ type: 'select' });
  }

  public unselected() {
    this._active = false;
    this._gizmo.material = this._defaultMaterial;
    this.dispatchEvent({ type: 'unselect' });
  }

  public hovered() {
    this._gizmo.material = this._hoverMaterial;
    this.dispatchEvent({ type: 'hover' });
  }

  public blurred() {
    this._gizmo.material = this._active
      ? this._activeMaterial
      : this._defaultMaterial;
    this.dispatchEvent({ type: 'blur' });
  }
}
