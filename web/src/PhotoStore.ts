import { WireFolder, WirePhotoEntry, wireGetCollection, wireGetFolder, wireGetFolders } from "./lib/fetchadapter";

export async function loadFolders(): Promise<WireFolder[]> {
  let folders = await wireGetFolders();
  return folders;
}

let photoMap = new Map<string, AlbumPhoto>();

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

export class AlbumPhoto {
  private onChanged: { id: number, func: (p: AlbumPhoto) => void }[] = [];
  public wire: WirePhotoEntry;
  public width: number = 0;
  public height: number = 0;
  public scale: number = 1;
  public src: string;

  public get favorite(): number {
    return this.wire.favorite;
  }
  public set favorite(val: number) {
    this.wire.favorite = val;
    this.invokeOnChanged();
  }

  public constructor(wire: WirePhotoEntry, src: string) {
    this.wire = wire;
    this.width = wire.width;
    this.height = wire.height;
    this.src = src;
  }

  public addOnChanged(func: (p: AlbumPhoto) => void) {
    let id = (this.onChanged.length > 0) ? this.onChanged[this.onChanged.length - 1].id + 1 : 1;
    this.onChanged.push({ id: id, func: func });
    return id;
  }

  public removeOnSelected(id: number) {
    this.onChanged = this.onChanged.filter(x => x.id !== id);
  }

  private invokeOnChanged() {
    for (let x of this.onChanged) {
      x.func(this);
    }
  }
}

export type AlbumRow = {
  photos: AlbumPhoto[];
  height: number;
}

function getPhotoUrl(wire: WirePhotoEntry) {
  return '/api/photolibrary/getimage/' + wire.hash;
}

function getThumbnailUrl(wire: WirePhotoEntry) {
  return '/api/photolibrary/getthumbnail/' + wire.hash;
}

function loadPhotos(wirePhotos: WirePhotoEntry[]): AlbumPhoto[] {
  let af: AlbumPhoto[] = [];
  for (let wirePhoto of wirePhotos) {
    let photo = photoMap.get(wirePhoto.hash);
    if (photo) {
      af.push(photo);
    } else {
      photo = new AlbumPhoto(wirePhoto, getThumbnailUrl(wirePhoto));
      af.push(photo);
      photoMap.set(wirePhoto.hash, photo);
    }
  }
  return af;
}

export async function loadFolder(folderId: number): Promise<AlbumPhoto[]> {
  let wirePhotos = await wireGetFolder(folderId);
  return loadPhotos(wirePhotos);
}

export async function loadCollection(id: string): Promise<AlbumPhoto[]> {
  let wirePhotos = await wireGetCollection(id);
  return loadPhotos(wirePhotos);
}

/**
 * split photo array into rows
 * we want to take N pictures so total width == width and height is
 * less then max. The obvious solution is to render one photo on a row
 * but there is no fun in that
 * 
 * The algorithm is actually simple. We first take first pho
 */
export function makeRows(photos: AlbumPhoto[], optimalHeight: number, targetWidth: number, padding: number): AlbumRow[] {
  let prevRow: AlbumPhoto[] = [];
  let row: AlbumPhoto[] = [];
  let height = Number.MAX_SAFE_INTEGER;
  let prevHeight = 0;
  let rows: AlbumRow[] = [];
  for (let photo of photos) {
    prevRow = row;
    prevHeight = height;
    row.push(photo);

    height = computeRowHeight(row, targetWidth, padding);
    if (Math.abs(optimalHeight - prevHeight) < Math.abs(optimalHeight - height)) {
      rows.push({
        height: height,
        photos: prevRow,
      });
      row = [];
      height = Number.MAX_SAFE_INTEGER;
    }
  }

  return rows;
}

function computeRowHeight(row: AlbumPhoto[], targetWidth: number, padding: number): number {
  // take the first photo and scale everything to it
  let height = row[0].height;
  let actualWidth = row[0].width;
  for (let i = 1; i < row.length; i++) {
    let p = row[i];
    if (p.height === 0) {
      continue;
    }
    p.scale = height / p.height;
    actualWidth += p.width * p.scale;
  }

  targetWidth -= padding * (row.length - 1);

  // now compute new scale
  let scale = targetWidth / actualWidth;
  for (let p of row) {
    p.scale *= scale;
  }

  return height * scale;
}