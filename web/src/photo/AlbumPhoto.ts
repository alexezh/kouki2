import { PhotoListKind, ReactionKind, WirePhotoEntry } from "../lib/photoclient";
import { CollectionId } from "./CollectionStore";
import type { UpdatePhotoContext } from "./UpdatePhotoContext";

export type PhotoId = number & {
  __tag_photo: boolean;
}

export class PhotoReactions {
  private value: string | undefined = undefined;
  private _favorite: boolean = false;
  private _rejected: boolean = false;

  public constructor(val: string | undefined) {
    this.value = val;

    if (val && val.length) {
      for (let i = 0; i < val.length; i++) {
        let c = val.charAt(i);
        if (c === ReactionKind.ThumbsDown) {
          this._rejected = true;
        } else {
          this._favorite = true;
        }
      }
    }
  }

  public map<T>(func: (c: string) => T): T[] {
    if (!this.value) {
      return [];
    }

    var ret = [];
    for (let i = 0; i < this.value.length; i++) {
      ret.push(func(this.value!.charAt(i)));
    }
    return ret;
  }

  addReaction(c: ReactionKind): void {
    if (this.value) {
      for (let i = 0; i < this.value.length; i++) {
        if (this.value.charAt(i) === c) {
          this.value = this.value!.substring(0, i) + c + this.value!.substring(i);
          return;
        }
      }
      this.value = this.value + c;
      return;
    } else {
      this.value = c;
      return;
    }
  }

  public get isFavorite(): boolean {
    return this._favorite;
  }

  public get isRejected(): boolean {
    return this._rejected;
  }
}

export class PhotoListId {
  public kind: PhotoListKind;
  public id: CollectionId;

  public constructor(kind: PhotoListKind, id: CollectionId) {
    this.kind = kind;
    this.id = id;
  }

  public toString() { return `${this.kind}!${this.id}` };
  public isEqual(id: PhotoListId) {
    return this.kind === id.kind && this.id === id.id;
  }
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
  reactions?: string;
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

export class AlbumPhoto {
  private onChanged: { id: number, func: (p: AlbumPhoto) => void }[] = [];
  public wire: WirePhotoEntry;
  public width: number = 0;
  public height: number = 0;
  public scale: number = 1;
  private _stackHidden: boolean = false;
  private _reactions: PhotoReactions;

  public get reactions(): PhotoReactions { return this._reactions }

  public constructor(wire: WirePhotoEntry) {
    this.wire = wire;
    // set width/height to default size to avoid divide by 0 cases
    this.width = wire.width ?? 200;
    this.height = wire.height ?? 200;
    this._reactions = new PhotoReactions(this.wire.reactions);
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

  public addReaction(val: ReactionKind, ctx: UpdatePhotoContext) {
    if (!this.wire.reactions) {
      this.wire.reactions = "";
    }
    this.wire.reactions = this.wire.reactions + val;
    this.reactions.addReaction(val);

    this.invokeOnChanged();
    ctx.addPhoto({
      kind: LibraryUpdateRecordKind.update,
      photo: this,
      reactions: this.wire.reactions
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
    if (this._stackHidden === val) {
      return;
    }

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

  /**
   * id of the stack; which is the first photo we decided to use
   * this is different from photo we display; as we select fav
   * 
   * so the logic is; for each photo in collection, take stack and include
   * all photos of the stack. We then hide all stack photos
   * 
   * the same rules apply to duplicates; we just add them to stack
   * the only trick is rebuilding; we do not know if photo added to stack
   * because it was similar. Which means that we need a flag
   */
  public get stackId(): PhotoId {
    return this.wire.stackId as PhotoId;
  }

  // public get originalId(): number {
  //   return this.wire.originalId;
  // }

  // public set originalId(val: number) {
  //   this.wire.originalId = val;
  // }

  public get originalDate(): Date {
    return new Date(this.wire.originalDt);
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
  dtEnd?: Date;
  height: number;
  padding: number;
}