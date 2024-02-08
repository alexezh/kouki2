import { IEventHandler, SimpleEventSource } from "../lib/synceventsource";
import { AlbumPhoto, PhotoId, PhotoListId } from "./AlbumPhoto";
import { addOnPhotoChanged, getPhotoById, getStack } from "./PhotoStore";

export type PhotoListPos = number & {
  __tag_pos: boolean;
}

export interface IPhotoListSource {
  setChangeHandler(func: () => void): void;
  getItems(): ReadonlyArray<AlbumPhoto>;
  addItems(items: AlbumPhoto[]): void;
  removeItems(items: AlbumPhoto[]): void;
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
  private _hideStack: boolean;

  /**
   * map from id to index
   * when we hide photo, we remove it from the filtered list
   */
  private _idIndex: Map<PhotoId, PhotoListPos> = new Map<PhotoId, PhotoListPos>();

  /**
   * map from id to row index
   */
  private _rowIndex: Map<PhotoId, number> = new Map<PhotoId, number>();

  /**
   * last stacks which we've seen
   * used to compare if things changed
   */
  private _savedStacks: Map<PhotoId, ReadonlyArray<PhotoId>> = new Map<PhotoId, ReadonlyArray<PhotoId>>();
  private readonly _source: IPhotoListSource;
  //private _handler: IEventHandler<AlbumPhoto[]>;

  /**
   * total number of photos in the list
   */
  public get photoCount(): number { return this._photos.length }

  public constructor(
    id: PhotoListId,
    source: IPhotoListSource,
    hideStack: boolean = true) {
    this.id = id;
    this._photos = [];
    this._filtered = [];
    this._source = source;

    let self = this;

    this._hideStack = hideStack;

    let photos = this._source.getItems();
    if (photos.length) {
      this.addPhotosWorker(photos, PhotoListChangeType.load);
    }

    // register handler for any photo change
    // this._handler = {
    //   invoke(photos: AlbumPhoto[]): void {
    //     self.onPhotoChanged(photos);
    //   }
    // }
    // addOnPhotoChanged(this._handler);

    this._source.setChangeHandler(this.onListChanged.bind(this));
  }

  public addPhotos(photos: ReadonlyArray<AlbumPhoto>) {
    this.addPhotosWorker(photos, PhotoListChangeType.add);
  }

  private addPhotosWorker(photos: ReadonlyArray<AlbumPhoto>, ct: PhotoListChangeType) {
    let idx = this._filtered.length;
    this._photos.push(...photos);

    // setup map of id to index
    for (let x of photos) {
      this._idIndex.set(x.id, idx as PhotoListPos);
      idx++;
    }

    for (let x of photos) {
      this._filtered.push(this._filter ? this._filter(x) : true);
    }

    // if any photo is stack; mark all stacked as hidden
    if (this._hideStack) {
      for (let x of photos) {
        let stack = getStack(x.stackId);
        if (stack) {
          this.hideStackPhotos(x.stackId, stack);
        }
      }
    }

    this.onChanged.invoke(ct, photos);
  }

  public removePhoto(photo: AlbumPhoto) {
    let idx = this._photos.findIndex((x) => x === photo);
    if (idx === -1) {
      return;
    }

    this._photos.splice(idx, 1);
    this._filtered.splice(idx, 1);
    this._idIndex.delete(photo.id);

    this.onChanged.invoke(PhotoListChangeType.remove, [photo]);
  }

  private hideStackPhotos(stackId: PhotoId, stack: ReadonlyArray<PhotoId>) {
    let currentStack = this._savedStacks.get(stackId);
    if (currentStack === stack) {
      return;
    }

    if (stack.length === 0) {
      console.log('stack is empty');
      return;
    }

    this._savedStacks.set(stackId, stack!);

    // select photo to show; either fav or first
    let idx = stack.findIndex((x: PhotoId) => {
      let photo = getPhotoById(x);
      if (!photo) {
        return false;
      }
      return photo.favorite > 0;
    });

    let mainPhoto: AlbumPhoto;
    if (idx !== -1) {
      mainPhoto = getPhotoById(stack[idx])!;
    } else {
      mainPhoto = getPhotoById(stack[0])!;
    }

    for (let sid of stack!) {
      if (sid === mainPhoto.id) {
        continue;
      }

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

  public * photos(): IterableIterator<AlbumPhoto> {
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

  public getNextPhoto(elem: PhotoListPos | AlbumPhoto): AlbumPhoto {
    return this.getItem(this.getNext(elem));
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

  public getPrevPhoto(elem: PhotoListPos | AlbumPhoto): AlbumPhoto {
    return this.getItem(this.getPrev(elem));
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
  public where(pred: (x: AlbumPhoto) => boolean): AlbumPhoto[] {
    return this._photos.filter(pred);
  }

  public setFilter(pred?: (x: AlbumPhoto) => boolean) {
    console.log("PhotoList.setFilter");
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
      let stack = getStack(photo.id);
      if (stack && this._hideStack) {
        this.hideStackPhotos(photo.stackId, stack);
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

  public setRow(id: PhotoId, idx: number) {
    return this._rowIndex.set(id, idx)!;
  }

  public resetRows() {
    return this._rowIndex.clear();
  }

  public getRow(photo: AlbumPhoto): number {
    if (!photo) {
      return -1;
    }

    let row = this._rowIndex.get(photo.id)!;
    if (!row) {
      return -1;
    }

    return row;
  }

  private onListChanged() {
    console.log('onListChanged');
    this._photos.length = 0;
    this._filtered.length = 0;
    this._idIndex.clear();
    this.addPhotosWorker(this._source.getItems(), PhotoListChangeType.load);
  }

  /**
   * called if any photo changed; we only care about stacks
   */
  public onPhotoChanged(photos: AlbumPhoto[]) {
    try {
      for (let photo of photos) {
        if (!this._idIndex.get(photo.id)) {
          return;
        }

        let oldStack = this._savedStacks.get(photo.id);
        if (oldStack !== getStack(photo.stackId)) {
          console.log("PhotoList: stack changed");
          if (oldStack) {
            for (let id of oldStack!) {
              let idx = this._idIndex.get(id);
              this._filtered[idx!] = (this._filter) ? this._filter(this._photos[idx!]) : true;
            }
          }

          let stack = getStack(photo.stackId);
          if (stack) {
            this.hideStackPhotos(photo.stackId, stack);
          }

          this.onChanged.invoke(PhotoListChangeType.hide);
        }
      }
    }
    catch (e: any) {
      console.log('onPhotoChanged failed:' + e.toString());
    }
  }
}

export enum PhotoListChangeType {
  load,
  add,
  remove,
  hide,
}
