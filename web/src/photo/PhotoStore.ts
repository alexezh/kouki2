import { WireFolder, WirePhotoEntry, WirePhotoUpdate, wireGetCollection, wireGetFolder, wireGetFolders, wireUpdatePhotos } from "../lib/fetchadapter";

export async function loadFolders(): Promise<WireFolder[]> {
  let folders = await wireGetFolders();
  return folders;
}

export type CatalogId = 'quick' | 'all' | 'starred' | 'dups';
export type FolderId = number & {
  __tag_folder: boolean;
}
export type PhotoListId = CatalogId | FolderId;

let photoMap = new Map<number, AlbumPhoto>();


export class AlbumPhoto {
  private onChanged: { id: number, func: (p: AlbumPhoto) => void }[] = [];
  public wire: WirePhotoEntry;
  public width: number = 0;
  public height: number = 0;
  public scale: number = 1;
  //public src: string;

  public get favorite(): number {
    return this.wire.favorite;
  }
  public set favorite(val: number) {
    this.wire.favorite = val;
    this.invokeOnChanged();
    let upd: WirePhotoUpdate = {
      hash: this.wire.hash,
      favorite: val
    }
    wireUpdatePhotos(upd);
  }

  public get originalDate(): Date {
    return new Date(this.wire.originalDateTime);
  }

  public constructor(wire: WirePhotoEntry) {
    this.wire = wire;
    this.width = wire.width;
    this.height = wire.height;
  }

  public getPhotoUrl(): string {
    return '/api/photolibrary/getimage/' + this.wire.hash;
  }

  public getThumbnailUrl(): string {
    return '/api/photolibrary/getthumbnail/' + this.wire.hash;
  }

  public getFileName(): string {
    return this.wire.fileName + this.wire.fileExt;
  }

  public addOnChanged(func: (p: AlbumPhoto) => void) {
    let id = (this.onChanged.length > 0) ? this.onChanged[this.onChanged.length - 1].id + 1 : 1;
    this.onChanged.push({ id: id, func: func });
    return id;
  }

  public removeOnChanged(id: number) {
    this.onChanged = this.onChanged.filter(x => x.id !== id);
  }

  private invokeOnChanged() {
    for (let x of this.onChanged) {
      x.func(this);
    }
  }
}

export type AlbumRow = {
  photos?: AlbumPhoto[];
  dt?: Date;
  height: number;
}

function loadPhotos(wirePhotos: WirePhotoEntry[]): AlbumPhoto[] {
  let af: AlbumPhoto[] = [];
  for (let wirePhoto of wirePhotos) {
    let photo = photoMap.get(wirePhoto.id);
    if (photo) {
      af.push(photo);
    } else {
      photo = new AlbumPhoto(wirePhoto);
      af.push(photo);
      photoMap.set(wirePhoto.id, photo);
    }
  }
  return af;
}

export async function loadFolder(folderId: number): Promise<AlbumPhoto[]> {
  let wirePhotos = await wireGetFolder(folderId);
  return loadPhotos(wirePhotos);
}

export async function loadCollection(id: CatalogId): Promise<AlbumPhoto[]> {
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
export function makeRows(photos: AlbumPhoto[],
  options: {
    optimalHeight: number,
    targetWidth: number,
    padding: number,
    startNewRow?: (photo: AlbumPhoto, idx: number, photos: AlbumPhoto[]) => { headerRow: AlbumRow } | null
  }): AlbumRow[] {
  let prevRow: AlbumPhoto[] = [];
  let row: AlbumPhoto[] = [];
  let prevHeight = 0;
  let rows: AlbumRow[] = [];
  let maxHeight = Math.round(options.optimalHeight * 1.3);
  let height = Number.MAX_SAFE_INTEGER;
  for (let idx = 0; idx < photos.length; idx++) {
    let photo = photos[idx];
    if (photo.height === 0) {
      continue;
    }

    if (options.startNewRow) {
      let startRow = options.startNewRow(photo, idx, photos);
      if (startRow) {
        if (row.length > 0) {
          rows.push(enforceMaxHeight({
            height: height,
            photos: row,
          }, maxHeight));
        }

        if (startRow.headerRow) {
          rows.push(startRow.headerRow);
        }

        row = [];
        height = Number.MAX_SAFE_INTEGER;
      }
    }

    prevRow = row;
    prevHeight = height;
    row.push(photo);

    height = computeRowHeight(row, options.targetWidth, options.padding);
    if (Math.abs(options.optimalHeight - prevHeight) < Math.abs(options.optimalHeight - height)) {
      rows.push(enforceMaxHeight({
        height: height,
        photos: prevRow,
      }, maxHeight));
      row = [];
      height = Number.MAX_SAFE_INTEGER;
    }
  }

  if (row.length > 0) {
    rows.push(enforceMaxHeight({
      height: height,
      photos: row,
    }, maxHeight));
  }

  return rows;
}

function enforceMaxHeight(row: AlbumRow, maxHeight: number): AlbumRow {
  if (row.height > maxHeight) {
    for (let p of row.photos!) {
      p.scale = maxHeight / p.wire.height;
    }
    row.height = maxHeight;
  }

  return row;
}

function computeRowHeight(row: AlbumPhoto[], targetWidth: number, padding: number): number {
  // take the first photo and scale everything to it
  let height = row[0].height;
  let actualWidth = row[0].width;
  row[0].scale = 1;
  for (let i = 1; i < row.length; i++) {
    let p = row[i];
    p.scale = height / p.height;
    if (p.scale > 50) {
      console.log("dd")
    }

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