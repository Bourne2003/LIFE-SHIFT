import { Emitter } from './events';

/** Full-screen panels. Only one is open at a time, and gameplay pauses while one is. */
export type ModalName = 'menu' | 'bag' | 'shop';

export interface UiEvents {
  modal: ModalName | null;
}

/** UI state that gameplay must respect (no walking or talking behind an open panel). */
export class UiState extends Emitter<UiEvents> {
  private _modal: ModalName | null = null;
  /** Shop shown by the shop panel, when it is open. */
  shop: string | null = null;

  get modal(): ModalName | null {
    return this._modal;
  }

  /** Opens a panel, replacing whichever one was open. */
  open(name: ModalName): void {
    if (this._modal === name) return;
    this._modal = name;
    this.emit('modal', name);
  }

  close(name?: ModalName): void {
    if (this._modal === null || (name && this._modal !== name)) return;
    this._modal = null;
    this.shop = null;
    this.emit('modal', null);
  }

  toggle(name: ModalName): void {
    if (this._modal === name) this.close();
    else this.open(name);
  }
}
