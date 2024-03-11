import { ListItemProps } from "@mui/material";
import { AlbumPhoto, PhotoId, PhotoListId } from "../photo/AlbumPhoto";
import { PhotoList, PhotoListChangedArg, PhotoListPos } from "../photo/PhotoList";

export class SelectionManager {
  private _list: PhotoList | null = null;
  private _listChangedId: number = 0;
  private _selected = new Map<PhotoId, AlbumPhoto>();
  private nextId = 1;
  private onSelected = new Map<PhotoId, {
    id: number;
    func: (p: AlbumPhoto, value: boolean) => void
  }[]>();
  private onSelectionChanged: {
    id: number;
    func: () => void
  }[] = [];

  private _lastSelectedPhoto: AlbumPhoto | null = null;
  public get lastSelectedPhoto(): AlbumPhoto | null { return this._lastSelectedPhoto }
  public get selectedPhotos(): ReadonlyMap<PhotoId, AlbumPhoto> { return this._selected };

  public setList(list: PhotoList) {
    if (this._list === list) {
      return;
    }

    if (this._listChangedId) {
      this._list!.removeOnListChanged(this._listChangedId);
      this._listChangedId = 0;
    }
    this._list = list;
    this.clear();
    this._listChangedId = this._list.addOnListChanged(this.onListChanged.bind(this));
  }

  public clear() {
    for (let x of this._selected) {
      this.invokeOnSelected(x[1], false);
    }

    // it is important to reset rather than clear
    // otherwise we can get into weird loops
    this._selected = new Map<PhotoId, AlbumPhoto>();

    this._lastSelectedPhoto = null;
    this.invokeOnSelectionChanged();
  }

  public reset(photos: AlbumPhoto[]) {
    for (let x of this._selected) {
      this.invokeOnSelected(x[1], false);
    }

    // it is important to reset rather than clear
    // otherwise we can get into weird loops
    this._selected = new Map<PhotoId, AlbumPhoto>();

    this.add(photos);
  }

  public isSelected(photo: AlbumPhoto): boolean {
    return !!this._selected.get(photo.id);
  }

  public add(photos: ReadonlyArray<AlbumPhoto>) {
    let lastSelected: AlbumPhoto | null = null;
    for (let p of photos) {
      if (!p) {
        continue;
      }
      this._selected.set(p.id, p);
      this.invokeOnSelected(p, true);
      lastSelected = p;
    }
    if (lastSelected) {
      this._lastSelectedPhoto = lastSelected;
    } else {
      this._lastSelectedPhoto = null;
    }
    this.invokeOnSelectionChanged();
  }

  public remove(photos: ReadonlyArray<AlbumPhoto>) {
    for (let p of photos) {
      this._selected.delete(p.id);
      this.invokeOnSelected(p, false);
    }
    this.invokeOnSelectionChanged();
  }

  public forEach(func: (x: AlbumPhoto) => void) {
    this._selected.forEach(func);
  }

  public map<T>(func: (x: AlbumPhoto) => T): T[] {
    let ret: T[] = [];
    for (let [key, photo] of this._selected) {
      ret.push(func(photo));
    }
    return ret;
  }

  public get items(): ReadonlyMap<PhotoId, AlbumPhoto> { return this._selected }

  private onListChanged(arg: PhotoListChangedArg) {
    console.log('SelectionManager:onListChanged');

    if (!this._list) {
      return;
    }

    // check if selection still valid
    for (let [key, photo] of this._selected) {
      let idx = this._list.getItemIndex(photo);
      if (idx === -1) {
        this._selected.delete(key);
      }
    }

    // if we deleted everything, select next 
    if (this._selected.size === 0) {
      if (this._lastSelectedPhoto) {
        let prev: AlbumPhoto | null = null;
        let findIdx = this._list.find(0 as PhotoListPos, (x: AlbumPhoto) => {
          if (this._lastSelectedPhoto!.originalDate.valueOf() < x.originalDate.valueOf()) {
            return true;
          }

          prev = x;
          return false;
        });

        if (findIdx >= 0) {
          let findPhoto = this._list.getItem(findIdx);
          console.log('SelectionManager: select next photo ' + findPhoto.id)
          this.add([findPhoto]);
        } else if (prev) {
          console.log('SelectionManager: select prev photo ' + (prev as AlbumPhoto).id);
          this.add(prev);
        }
      }
    }
  }

  private invokeOnSelected(p: AlbumPhoto, value: boolean) {
    let entry = this.onSelected.get(p.id);
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
    let entry = this.onSelected.get(photo.id);
    if (!entry) {
      entry = [];
      this.onSelected.set(photo.id, entry);
    }
    let id = this.nextId++;
    entry.push({ id: id, func: func });
    return id;
  }

  public removeOnSelected(photo: AlbumPhoto, id: number) {
    let entry = this.onSelected.get(photo.id);
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

