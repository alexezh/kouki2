import { PhotoListKind } from "../lib/photoclient";
import { SimpleEventSource } from "../lib/synceventsource";
import { AlbumPhoto, AlbumRow, PhotoListId } from "./AlbumPhoto";

export type PhotoListPos = number & {
  __tag_pos: boolean;
}

/**
 * arbitrary collection of AlbumPhotos backed by either folder or collection
 * photos do not have to be unique. In quick collection, we might have a lot
 * grouped by add time
 * 
 * collection is mutable, it can update over time. It is also can be filtered
 * So in a sense it is a view model. Each data store (all, folder, collection) can
 * expose individual items as PhotoList
 * 
 * This way we do not have to differintiate between Quick collection which can be edited
 * and folders which are mostly static. We also do not have to deal with async load of collection
 * or filtering
 * 
 * For filtering, we expose maintain map of booleans caching filtered value; is it also 
 * used for stacking
 */
export class PhotoList {
  private readonly _photos: AlbumPhoto[] = [];
  private _filtered: boolean[] = [];
  private readonly onChanged: SimpleEventSource = new SimpleEventSource();
  public readonly id: PhotoListId;
  private _filter?: (x: AlbumPhoto) => boolean;

  /**
   * map from id to index
   * when we hide photo, we remove it from the filtered list
   */
  private _idIndex: Map<number, PhotoListPos> = new Map<number, PhotoListPos>();

  /**
   * map from id to row index
   */
  private _rowIndex: Map<number, number> = new Map<number, number>();

  /**
   * total number of photos in the list
   */
  public get photoCount(): number { return this._photos.length }

  public constructor(id: PhotoListId, getPhotos: (self: PhotoList) => Promise<AlbumPhoto[]>) {
    this.id = id;
    this._photos = [];
    this._filtered = [];
    setTimeout(async () => {
      let photos = await getPhotos(this);
      this.addPhotosWorker(photos, PhotoListChangeType.load);
    });
  }

  public addPhotos(photos: AlbumPhoto[]) {
    this.addPhotosWorker(photos, PhotoListChangeType.add);
  }

  private addPhotosWorker(photos: AlbumPhoto[], ct: PhotoListChangeType) {
    let idx = this._filtered.length;
    this._photos.push(...photos);

    // setup map of id to index
    for (let x of photos) {
      this._idIndex.set(x.id, idx as PhotoListPos);
      idx++;
    }

    if (this._filter) {
      for (let x of photos) {
        this._filtered.push(this._filter(x));
      }
    }

    // if any photo is stack; mark all stacked as hidden
    for (let x of photos) {
      if (x.stack) {
        this.hideStackPhotos(x);
      }
    }

    this.onChanged.invoke(ct, photos);
  }

  private hideStackPhotos(photo: AlbumPhoto) {
    for (let sid of photo.stack!) {
      let sidx = this._idIndex.get(sid);
      if (sidx !== undefined) {
        this._filtered[sidx] = false;
      } else {
        console.error('cannot find stack photo');
      }
    }
  }

  public addOnChanged(func: (ct: PhotoListChangeType, photos: AlbumPhoto[]) => void): number {
    return this.onChanged.add(func);
  }

  public *photos(): IterableIterator<AlbumPhoto> {
    for (let pos = 0; pos < this._photos.length; pos++) {
      if (this._filtered[pos]) {
        yield this._photos[pos];
      }
    }
  }

  public removeOnChanged(id: number) {
    return this.onChanged.remove(id);
  }

  public getFirstPos(): PhotoListPos {
    if (this._photos.length === 0) {
      return -1 as PhotoListPos;
    }
    return 0 as PhotoListPos;
  }

  public getLastPos(): PhotoListPos {
    if (this._photos.length === 0) {
      return 0 as PhotoListPos;
    }
    return (this._photos.length - 1) as PhotoListPos;
  }


  public getItem(pos: PhotoListPos): AlbumPhoto {
    return this._photos[pos];
  }

  public findPhotoPos(photo: AlbumPhoto | null): PhotoListPos {
    if (!photo) {
      return -1 as PhotoListPos;
    }
    let item = this._idIndex.get(photo.id);
    if (item === undefined) {
      return -1 as PhotoListPos;
    }
    return item as PhotoListPos;
  }

  public getNext(elem: PhotoListPos | AlbumPhoto): PhotoListPos {
    let pos: PhotoListPos;
    if (elem instanceof AlbumPhoto) {
      pos = this.findPhotoPos(elem);
    } else {
      pos = elem;
    }

    if (pos >= this._photos.length) {
      return -1 as PhotoListPos;
    }

    for (let idx = pos + 1; idx < this._photos.length; idx++) {
      if (this._filtered[idx]) {
        return idx as PhotoListPos;
      }
    }
    return -1 as PhotoListPos;
  }

  public getPrev(elem: PhotoListPos | AlbumPhoto): PhotoListPos {
    let pos: PhotoListPos;
    if (elem instanceof AlbumPhoto) {
      pos = this.findPhotoPos(elem);
    } else {
      pos = elem;
    }

    if (pos <= 0) {
      return -1 as PhotoListPos;
    }

    for (let idx = pos - 1; idx >= 0; idx--) {
      if (this._filtered[idx]) {
        return idx as PhotoListPos;
      }
    }
    return -1 as PhotoListPos;
  }

  /**
   * return photos matching criteria
   */
  public filter(pred: (x: AlbumPhoto) => boolean): AlbumPhoto[] {
    return this._photos.filter(pred);
  }

  public setFilter(pred?: (x: AlbumPhoto) => boolean) {
    if (pred) {
      this._filter = pred;
    } else {
      this._filter = undefined;
    }

    // we have to run twice; first to mark based on filter
    // and then removed stacked
    for (let idx = 0; idx < this._photos.length; idx++) {
      let include = (pred) ? pred(this._photos[idx]) : true;
      this._filtered[idx] = include;
    }

    for (let idx = 0; idx < this._photos.length; idx++) {
      let photo = this._photos[idx];
      if (photo.stack) {
        this.hideStackPhotos(photo);
      }
    }
  }

  public find(pos: PhotoListPos, pred: (x: AlbumPhoto) => boolean): PhotoListPos {
    if (pos === -1) {
      return -1 as PhotoListPos;
    }
    for (; pos < this._photos.length - 1; pos++) {
      if (!this._filtered[pos]) {
        continue;
      }

      if (pred(this._photos[pos])) {
        return pos;
      }
    }

    return -1 as PhotoListPos;
  }

  /**
   * find element based on predicate starting with position pos
   */
  public findReverse(pos: PhotoListPos, pred: (x: AlbumPhoto) => boolean): PhotoListPos {
    if (pos === -1) {
      return -1 as PhotoListPos;
    }
    for (; pos >= 0; pos--) {
      if (!this._filtered[pos]) {
        continue;
      }

      if (pred(this._photos[pos])) {
        return pos;
      }
    }

    return -1 as PhotoListPos;
  }

  /**
   * find start position of a row
   */
  public findStartRowPos(pos: PhotoListPos): PhotoListPos {
    if (pos === -1) {
      return -1 as PhotoListPos;
    }
    let rowIdx = this.getRow(this._photos[pos]);
    let prevPos = pos;
    for (; pos >= 0; pos--) {
      if (!this._filtered[pos]) {
        continue;
      }

      if (this.getRow(this._photos[pos]) !== rowIdx) {
        return prevPos;
      }

      prevPos = pos;
    }

    return -1 as PhotoListPos;
  }

  public slice(start: PhotoListPos, end: PhotoListPos): AlbumPhoto[] {
    let arr: AlbumPhoto[] = [];
    for (let pos = start; pos <= end; pos++) {
      if (this._filtered[pos]) {
        arr.push(this._photos[pos]);
      }
    }
    return arr;
  }

  public asArray(): AlbumPhoto[] {
    let arr: AlbumPhoto[] = [];
    for (let pos = 0; pos <= this._photos.length; pos++) {
      if (this._filtered[pos]) {
        arr.push(this._photos[pos]);
      }
    }
    return arr;
  }

  public setRow(id: number, idx: number) {
    return this._rowIndex.set(id, idx)!;
  }

  public resetRows() {
    return this._rowIndex.clear();
  }

  public getRow(photo: AlbumPhoto): number {
    if (!photo) {
      return -1;
    }

    return this._rowIndex.get(photo.id)!;
  }
}

export enum PhotoListChangeType {
  load,
  add,
  remove,
  hide,
}
