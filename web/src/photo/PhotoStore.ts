import { WireFolder, WirePhotoEntry, WirePhotoUpdate, wireGetCollection, wireGetFolder, wireGetFolders, wireUpdatePhotos } from "../lib/fetchadapter";




export type CatalogId = 'quick' | 'all' | 'starred' | 'dups';
export type FolderId = number & {
  __tag_folder: boolean;
}
export type PhotoListId = CatalogId | FolderId;

let photoMap = new Map<number, AlbumPhoto>();
let photoByHash = new Map<string, number[]>();


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
  padding: number;
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


