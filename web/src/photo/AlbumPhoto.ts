import { Key } from "react";
import { PhotoListKind, WirePhotoEntry, WirePhotoUpdate, wireUpdatePhotos } from "../lib/photoclient";

export type FolderId = number & {
  __tag_folder: boolean;
}
export class PhotoListId {
  public kind: PhotoListKind;
  public id: number;

  public constructor(kind: PhotoListKind, id: number) {
    this.kind = kind;
    this.id = id;
  }

  public toString() { return `${this.kind}!${this.id}` };
}

export class AlbumPhoto {
  private onChanged: { id: number, func: (p: AlbumPhoto) => void }[] = [];
  public wire: WirePhotoEntry;
  public width: number = 0;
  public height: number = 0;
  public scale: number = 1;

  // ID of first similar
  public similarId: number = 0;
  public correlation: number = 0;

  //public src: string;

  /**
   * number of duplicates set by buildDuplicateBuckets
   */
  public dupCount: number = 1;

  public get favorite(): number {
    return this.wire.favorite;
  }

  public get id(): number {
    return this.wire.id;
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
    // set width/height to default size to avoid divide by 0 cases
    this.width = wire.width ?? 200;
    this.height = wire.height ?? 200;
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

export enum RowKind {
  photos,
  day,
  month,
  year,
  time,
  series
}

export type AlbumRow = {
  key: Key;
  kind: RowKind,
  photos?: AlbumPhoto[];
  dt?: Date;
  height: number;
  padding: number;
}