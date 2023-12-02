import _ from "underscore";
import { WireFolder, WirePhotoEntry, wireGetCollection, wireGetFolder, wireGetFolders } from "./lib/fetchadapter";

export async function loadFolders(): Promise<WireFolder[]> {
  let folders = await wireGetFolders();
  return folders;
}

export class AlbumPhoto {
  private _selected: boolean = false;
  private onSelected: { id: number, func: (p: AlbumPhoto) => void }[] = [];
  public wire: WirePhotoEntry;
  public width: number = 0;
  public height: number = 0;
  public scale: number = 1;
  public src: string;
  public get selected(): boolean {
    return this._selected;
  }
  public set selected(val: boolean) {
    this._selected = val;
    for (let x of this.onSelected) {
      x.func(this);
    }
  }

  public addOnSelected(func: (p: AlbumPhoto) => void) {
    let id = (this.onSelected.length > 0) ? this.onSelected[this.onSelected.length - 1].id + 1 : 1;
    this.onSelected.push({ id: id, func: func });
    return id;
  }

  public removeOnSelected(id: number) {
    this.onSelected = this.onSelected.filter(x => x.id !== id);
  }

  public constructor(wire: WirePhotoEntry, src: string) {
    this.wire = wire;
    this.width = wire.width;
    this.height = wire.height;
    this.src = src;
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

export async function loadPhotos(folderId: number): Promise<AlbumPhoto[]> {
  let wirePhotos = await wireGetFolder(folderId);
  let photos: AlbumPhoto[] = [];
  for (let photo of wirePhotos) {
    photos.push(new AlbumPhoto(photo, getThumbnailUrl(photo)));
  }
  return photos;
}

export async function loadCollection(id: string): Promise<WirePhotoEntry[]> {
  return await wireGetCollection(id);
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
  let firstIdx = 0;
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