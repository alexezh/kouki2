import { Key } from "react";
import { PhotoListKind, WirePhotoEntry, WirePhotoUpdate, wireUpdatePhotos } from "../lib/photoclient";
import { CollectionId } from "./CollectionStore";
import { invokeLibraryChanged } from "./PhotoStore";

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

export enum LibraryUpdateRecordKind {
  load,
  add,
  remove,
  update,
  filter,
}

export type PhotoUpdateRecord = {
  kind: LibraryUpdateRecordKind.update;
  photo: AlbumPhoto;
  favorite?: number;
  hidden?: boolean;
  stars?: number;
  stackId?: number;
  stackHidden?: boolean;
}

export type LibraryLoadRecord = {
  kind: LibraryUpdateRecordKind.load;
}

export type LibraryFilterRecord = {
  kind: LibraryUpdateRecordKind.filter;
}

export type LibraryAddRecord = {
  kind: LibraryUpdateRecordKind.add;
  photos: AlbumPhoto[];
}

export type LibraryRemoveRecord = {
  kind: LibraryUpdateRecordKind.remove;
  photos: AlbumPhoto[];
}

export type LibraryUpdateRecord =
  PhotoUpdateRecord |
  LibraryLoadRecord |
  LibraryAddRecord |
  LibraryRemoveRecord |
  LibraryFilterRecord;

export class UpdatePhotoContext {
  private updates: PhotoUpdateRecord[] = [];
  private wireUpdates: WirePhotoUpdate[] = [];
  private sendWire: boolean;

  public constructor(sendWire: boolean = true) {
    this.sendWire = sendWire;
  }

  public addPhoto(update: PhotoUpdateRecord) {
    this.updates.push(update);
    if (this.sendWire) {
      let wireUpdate: WirePhotoUpdate = {
        hash: update.photo.wire.hash,
        hidden: update.hidden,
        favorite: update.favorite
      }
      this.wireUpdates.push(wireUpdate);
    }
  }

  public commit() {
    invokeLibraryChanged(this.updates);
    if (this.sendWire) {
      wireUpdatePhotos(this.wireUpdates);
    }
  }
}

export class AlbumPhoto {
  private onChanged: { id: number, func: (p: AlbumPhoto) => void }[] = [];
  public wire: WirePhotoEntry;
  public width: number = 0;
  public height: number = 0;
  public scale: number = 1;
  private _stackHidden: boolean = false;

  // ID of first similar
  public similarId: PhotoId = 0 as PhotoId;
  public correlation: number = 0;


  /**
   * number of duplicates set by buildDuplicateBuckets
   */
  public dupCount: number = 1;

  public get favorite(): number {
    return this.wire.favorite;
  }

  public setFavorite(val: number, ctx: UpdatePhotoContext) {
    this.wire.favorite = val;
    this.invokeOnChanged();
    ctx.addPhoto({
      kind: LibraryUpdateRecordKind.update,
      photo: this,
      favorite: val
    });
  }

  public get hidden(): boolean {
    return this.wire.hidden;
  }

  public setHidden(val: boolean, ctx: UpdatePhotoContext) {
    this.wire.hidden = val;
    this.invokeOnChanged();
    ctx.addPhoto({
      kind: LibraryUpdateRecordKind.update,
      photo: this,
      hidden: val
    });
  }

  /**
   * true if stack not empty
   */
  public get hasStack(): boolean {
    return !!this.stackId;
  }

  public get stackHidden(): boolean {
    return this._stackHidden;
  }

  public setStackHidden(val: boolean, ctx: UpdatePhotoContext) {
    this._stackHidden = val;
    this.invokeOnChanged();
    ctx.addPhoto({
      kind: LibraryUpdateRecordKind.update,
      photo: this,
      stackHidden: val
    });
  }

  public get id(): PhotoId {
    return this.wire.id as PhotoId;
  }

  public get stackId(): PhotoId {
    return this.wire.stackId as PhotoId;
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
  key: string;
  kind: RowKind,
  hash: number;
  photos?: AlbumPhoto[];
  dt?: Date;
  height: number;
  padding: number;
}