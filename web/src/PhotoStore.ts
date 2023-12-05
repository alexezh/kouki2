import { WireFolder, WirePhotoEntry, wireGetCollection, wireGetFolder, wireGetFolders } from "./lib/fetchadapter";
import SyncEventSource, { SimpleEventSource } from "./lib/synceventsource";

export async function loadFolders(): Promise<WireFolder[]> {
  let folders = await wireGetFolders();
  return folders;
}

export function addOnFoldersChanged(func: () => void): number {
  return folderChanged.add(func);
}

export function removeOnFoldersChanged(id: number) {
  return folderChanged.remove(id);
}

export function triggerRefreshFolders() {
  folderChanged.invoke();
}

let folderChanged = new SimpleEventSource();
let photoMap = new Map<string, AlbumPhoto>();


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