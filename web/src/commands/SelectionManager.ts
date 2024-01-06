import { AlbumPhoto, AlbumRow } from "../photo/AlbumPhoto";

export class SelectionManager {
  private _selected = new Map<string, AlbumPhoto>();
  private nextId = 1;
  private onSelected = new Map<string, {
    id: number;
    func: (p: AlbumPhoto, value: boolean) => void
  }[]>();
  private onSelectionChanged: {
    id: number;
    func: () => void
  }[] = [];

  private _lastSelectedIndex = -1;

  public getLastSelectedIndex(photos: ReadonlyArray<AlbumPhoto> | undefined): number {
    if (!photos) {
      return -1;
    }
    if (this._lastSelectedIndex !== -1) {
      return this._lastSelectedIndex;
    }
    if (this._lastSelectedPhoto === null) {
      return -1;
    }
    this._lastSelectedIndex = photos.findIndex((x) => this._lastSelectedPhoto === x);
    return this._lastSelectedIndex;
  }

  private _lastSelectedPhoto: AlbumPhoto | null = null;
  public get lastSelectedPhoto(): AlbumPhoto | null { return this._lastSelectedPhoto }

  public clear() {
    for (let x of this._selected) {
      this.invokeOnSelected(x[1], false);
    }
    this._selected.clear();
    this._lastSelectedPhoto = null;
    this._lastSelectedIndex = -1;
    this.invokeOnSelectionChanged();
  }

  public reset(photos: AlbumPhoto[]) {
    for (let x of this._selected) {
      this.invokeOnSelected(x[1], false);
    }
    this._selected.clear();

    this.add(photos);
  }

  public isSelected(photo: AlbumPhoto): boolean {
    return !!this._selected.get(photo.wire.hash);
  }

  public add(photos: ReadonlyArray<AlbumPhoto>) {
    for (let p of photos) {
      this._selected.set(p.wire.hash, p);
      this.invokeOnSelected(p, true);
    }
    if (photos.length) {
      this._lastSelectedPhoto = photos[photos.length - 1];
    } else {
      this._lastSelectedPhoto = null;
    }
    this._lastSelectedIndex = -1;
    this.invokeOnSelectionChanged();
  }

  public remove(photos: ReadonlyArray<AlbumPhoto>) {
    for (let p of photos) {
      this._selected.delete(p.wire.hash);
      this.invokeOnSelected(p, false);
    }
    this.invokeOnSelectionChanged();
  }

  public forEach(func: (x: AlbumPhoto) => void) {
    this._selected.forEach(func);
  }

  public map<T>(func: (x: AlbumPhoto) => T): T[] {
    let ret: T[] = [];
    for (let x of this._selected.values()) {
      ret.push(func(x));
    }
    return ret;
  }

  public get items(): ReadonlyMap<string, AlbumPhoto> { return this._selected }

  private invokeOnSelected(p: AlbumPhoto, value: boolean) {
    let entry = this.onSelected.get(p.wire.hash);
    if (!entry) {
      return;
    }

    for (let x of entry) {
      x.func(p, value);
    }
  }

  private invokeOnSelectionChanged() {
    for (let x of this.onSelectionChanged) {
      x.func();
    }
  }

  public addOnSelected(photo: AlbumPhoto, func: (p: AlbumPhoto, value: boolean) => void): number {
    let entry = this.onSelected.get(photo.wire.hash);
    if (!entry) {
      entry = [];
      this.onSelected.set(photo.wire.hash, entry);
    }
    let id = this.nextId++;
    entry.push({ id: id, func: func });
    return id;
  }

  public removeOnSelected(photo: AlbumPhoto, id: number) {
    let entry = this.onSelected.get(photo.wire.hash);
    if (!entry) {
      return;
    }

    let idx = entry.findIndex((x) => x.id === id);
    if (idx === -1) {
      return;
    }

    entry.splice(idx, 1);
  }

  public addOnSelectionChanged(func: () => void): number {
    let id = this.nextId++;
    this.onSelectionChanged.push({ id: id, func: func });
    return id;
  }

  public removeOnSelectionChanged(id: number) {
    let idx = this.onSelectionChanged.findIndex((x) => x.id === id);
    if (idx === -1) {
      return;
    }

    this.onSelectionChanged.splice(idx, 1);
  }
}

export const selectionManager = new SelectionManager();

export function computeAggregatedFavs(): number {
  let fav: number = 0;
  let unfav: number = 0;
  let none: number = 0;

  for (let photo of selectionManager.items) {
    let v = photo[1].wire.favorite;
    if (!v) {
      none++;
    } else if (v > 0) {
      fav++;
    } else {
      unfav++;
    }
  }

  if (fav > 0 && (unfav === 0 && none === 0)) {
    return 1;
  } else if (unfav > 0 && (fav === 0 && none === 0)) {
    return -1;
  } else {
    return 0;
  }
}

