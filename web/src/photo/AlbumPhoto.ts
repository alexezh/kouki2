import { Key } from "react";
import { PhotoListKind, WirePhotoEntry, WirePhotoUpdate, wireUpdatePhotos } from "../lib/photoclient";
import { invokeOnPhotoChanged } from "./PhotoStore";
import { CollectionId } from "./CollectionStore";

export type FolderId = number & {
  __tag_folder: boolean;
}

export type PhotoId = number & {
  __tag_photo: boolean;
}

export class PhotoListId {
  public kind: PhotoListKind;
  public id: FolderId | CollectionId;

  public constructor(kind: PhotoListKind, id: FolderId | CollectionId) {
    this.kind = kind;
    this.id = id;
  }

  public toString() { return `${this.kind}!${this.id}` };
}

export class UpdatePhotoContext {
  private photos: AlbumPhoto[] = [];
  private updates: WirePhotoUpdate[] = [];

  public addPhoto(photo: AlbumPhoto, update: WirePhotoUpdate) {
    this.photos.push(photo);
    this.updates.push(update);
  }

  public commit() {
    invokeOnPhotoChanged(this.photos);
    wireUpdatePhotos(this.updates);
  }
}

export class AlbumPhoto {
  private onChanged: { id: number, func: (p: AlbumPhoto) => void }[] = [];
  public wire: WirePhotoEntry;
  public width: number = 0;
  public height: number = 0;
  public scale: number = 1;

  // ID of first similar
  public similarId: PhotoId = 0 as PhotoId;
  public correlation: number = 0;


  /**
   * number of duplicates set by buildDuplicateBuckets
   */
  public dupCount: number = 1;

  /**
   * true if stack not empty
   */
  public get hasStack(): boolean {
    return !!this.stackId;
  }

  public get favorite(): number {
    return this.wire.favorite;
  }

  public get hidden(): boolean {
    return this.wire.hidden;
  }

  public setHidden(val: boolean, ctx: UpdatePhotoContext) {
    this.wire.hidden = val;
    this.invokeOnChanged();
    ctx.addPhoto(this, {
      hash: this.wire.hash,
      hidden: val
    });
    //wireUpdatePhotos(upd);
  }

  public get id(): PhotoId {
    return this.wire.id as PhotoId;
  }

  public get stackId(): PhotoId {
    return this.wire.stackId as PhotoId;
  }

  public setFavorite(val: number, ctx: UpdatePhotoContext) {
    this.wire.favorite = val;
    this.invokeOnChanged();
    ctx.addPhoto(this, {
      hash: this.wire.hash,
      favorite: val
    });
    //wireUpdatePhotos(upd);
  }

  public get originalId(): number {
    return this.wire.originalId;
  }

  public set originalId(val: number) {
    this.wire.originalId = val;
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

  public invokeOnChanged() {
    for (let x of this.onChanged) {
      x.func(this);
    }

    // invoke global handlers used by lists and so on
    //invokeOnPhotoChanged(this);
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