import { AlbumPhoto } from "../photo/PhotoStore";

export class SelectionManager {
  private _selected = new Map<string, AlbumPhoto>();
  private nextId = 1;
  private onSelected = new Map<string, {
    id: number;
    func: (p: AlbumPhoto, value: boolean) => void
  }[]>();
  private onAnySelected: {
    id: number;
    func: (p: AlbumPhoto, value: boolean) => void
  }[] = [];

  public lastIndex: number = -1;

  public clear() {
    for (let x of this._selected) {
      this.invokeOnSelected(x[1], false);
    }
    this._selected.clear();
  }

  public isSelected(photo: AlbumPhoto): boolean {
    return !!this._selected.get(photo.wire.hash);
  }

  public add(photos: AlbumPhoto[]) {
    for (let p of photos) {
      this._selected.set(p.wire.hash, p);
      this.invokeOnSelected(p, true);
    }
  }

  public remove(photos: AlbumPhoto[]) {
    for (let p of photos) {
      this._selected.delete(p.wire.hash);
      this.invokeOnSelected(p, false);
    }
  }

  public forEach(func: (x: AlbumPhoto) => void) {
    this.items.forEach(func);
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

    for (let x of this.onAnySelected) {
      x.func(p, value);
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

  public addOnAnySelected(func: (p: AlbumPhoto, value: boolean) => void): number {
    let id = this.nextId++;
    this.onAnySelected.push({ id: id, func: func });
    return id;
  }

  public removeOnAnySelected(id: number) {
    let idx = this.onAnySelected.findIndex((x) => x.id === id);
    if (idx === -1) {
      return;
    }

    this.onAnySelected.splice(idx, 1);
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

  if (fav > 0 && (unfav == 0 || none == 0)) {
    return 1;
  } else if (unfav > 0 && (fav == 0 || none == 0)) {
    return -1;
  } else {
    return 0;
  }
}

