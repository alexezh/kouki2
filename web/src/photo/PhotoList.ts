import { WireCollectionItem } from "../lib/photoclient";
import { SimpleEventSource } from "../lib/synceventsource";
import { AlbumPhoto, LibraryUpdateRecord, PhotoId, PhotoListId } from "./AlbumPhoto";
import { getPhotoById, tryGetPhotoById } from "./PhotoStore";

export type FilterFavorite = "all" | "favorite" | "rejected";

// index in PhotoList
export type PhotoListPos = number & {
  __tag_pos: boolean;
}

export type AppFilter = {
  filterFavorite?: FilterFavorite;
  filterDups?: boolean
}
export interface IPhotoListSource {
  setChangeHandler(func: (update: LibraryUpdateRecord[]) => void): void;
  getItems(): ReadonlyArray<AlbumPhoto>;
  addItems(items: AlbumPhoto | ReadonlyArray<AlbumPhoto>): void;
  removeItems(items: AlbumPhoto | ReadonlyArray<AlbumPhoto>): void;
  setAppFilter(filter: AppFilter): void;
  isHidden(photo: AlbumPhoto): boolean;
}

export type PhotoListChangedArg = { ct: PhotoListChangeType, photos: ReadonlyArray<AlbumPhoto> };

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
  private _visible: boolean[] = [];
  private readonly onListChanged: SimpleEventSource<{ ct: PhotoListChangeType, photos: ReadonlyArray<AlbumPhoto> }> = new SimpleEventSource();
  public readonly id: PhotoListId;
  private _version: number = 1;

  /**
   * if true, filter is set via setFilteredItems
   */
  private _filtered: boolean = false;
  public get filtered(): boolean { return this._filtered }

  /**
   * map from id to index
   * when we hide photo, we remove it from the filtered list
   */
  private _idIndex: Map<PhotoId, PhotoListPos> = new Map<PhotoId, PhotoListPos>();

  private readonly _source: IPhotoListSource;

  /**
   * total number of photos in the list
   */
  public get photoCount(): number { return this._photos.length }
  public get source(): IPhotoListSource { return this._source }
  public get version(): number { return this._version }

  public constructor(
    id: PhotoListId,
    source: IPhotoListSource) {
    this.id = id;
    this._photos = [];
    this._visible = [];
    this._source = source;

    let photos = this._source.getItems();
    if (photos.length) {
      this.addPhotosWorker(photos, PhotoListChangeType.load);
    }

    this._source.setChangeHandler(this.onListChangedHandler.bind(this));
  }

  public addPhotos(photos: ReadonlyArray<AlbumPhoto>) {
    this.addPhotosWorker(photos, PhotoListChangeType.add);
    this._source.addItems(photos);
  }

  private addPhotosWorker(photos: ReadonlyArray<AlbumPhoto>, ct: PhotoListChangeType) {
    let idx = this._visible.length;
    this._photos.push(...photos);

    // setup map of id to index
    for (let x of photos) {
      this._idIndex.set(x.id, idx as PhotoListPos);
      idx++;
    }

    for (let x of photos) {
      this._visible.push(!this.source.isHidden(x));
    }

    this.invokeOnListChanged({ ct: ct, photos: photos });
  }

  private clear() {
    this._visible.length = 0;
    this._photos.length = 0;
    this._idIndex.clear();
  }

  public setFilteredItems(items: WireCollectionItem[]) {
    this.clear();

    if (items.length > 0) {
      console.log("setFilteredItems:" + items[0].photoId);
    }

    let idx = 0;
    for (let item of items) {
      let photo = tryGetPhotoById(item.photoId as PhotoId);
      if (photo) {
        this._photos.push(photo);
        this._visible.push(!this._source.isHidden(photo));
        this._idIndex.set(photo.id, idx as PhotoListPos);
        idx++;
      } else {
        console.error("PhotoList: cannot find photo " + item.photoId);
      }
    }

    this._version++;
    this._filtered = true;
    this.invokeOnListChanged({ ct: PhotoListChangeType.filter, photos: [] });
  }

  public resetFilteredItems() {
    this.clear();

    this.addPhotosWorker(this._source.getItems(), PhotoListChangeType.load);
    this._version++;
    this._filtered = false;
    this.invokeOnListChanged({ ct: PhotoListChangeType.filter, photos: [] });
  }

  public removePhoto(photo: AlbumPhoto) {
    let idx = this._photos.findIndex((x) => x === photo);
    if (idx === -1) {
      return;
    }

    this._photos.splice(idx, 1);
    this._visible.splice(idx, 1);
    this._idIndex.delete(photo.id);

    this._source.removeItems(photo);

    this.invokeOnListChanged({ ct: PhotoListChangeType.remove, photos: [photo] });
  }

  // private hideStackPhotos(stackId: PhotoId, stack: ReadonlyArray<PhotoId>) {
  //   let currentStack = this._savedStacks.get(stackId);
  //   if (currentStack === stack) {
  //     return;
  //   }

  //   if (stack.length === 0) {
  //     console.log('stack is empty');
  //     return;
  //   }

  //   this._savedStacks.set(stackId, stack!);

  //   // select photo to show; either fav or first
  //   let idx = stack.findIndex((x: PhotoId) => {
  //     let photo = getPhotoById(x);
  //     if (!photo) {
  //       return false;
  //     }
  //     return photo.favorite > 0;
  //   });

  //   let mainPhoto: AlbumPhoto;
  //   if (idx !== -1) {
  //     mainPhoto = getPhotoById(stack[idx])!;
  //   } else {
  //     mainPhoto = getPhotoById(stack[0])!;
  //   }

  //   for (let sid of stack!) {
  //     if (sid === mainPhoto.id) {
  //       continue;
  //     }

  //     let sidx = this._idIndex.get(sid);
  //     if (sidx !== undefined) {
  //       this._filtered[sidx] = false;
  //     } else {
  //       console.error('cannot find stack photo');
  //     }
  //   }
  // }

  public addOnListChanged(func: (arg: PhotoListChangedArg) => void): number {
    return this.onListChanged.add(func);
  }

  public removeOnListChanged(id: number) {
    return this.onListChanged.remove(id);
  }

  public * photos(): IterableIterator<AlbumPhoto> {
    for (let pos = 0; pos < this._photos.length; pos++) {
      if (this._visible[pos]) {
        yield this._photos[pos];
      }
    }
  }

  public getFirstPos(): PhotoListPos {
    if (this._photos.length === 0) {
      return -1 as PhotoListPos;
    }
    if (this._visible[0]) {
      return 0 as PhotoListPos;
    } else {
      return this.getNext(0 as PhotoListPos);
    }
  }

  public getLastPos(): PhotoListPos {
    if (this._photos.length === 0) {
      return 0 as PhotoListPos;
    }
    let idx = this._photos.length - 1;
    if (this._visible[idx]) {
      return idx as PhotoListPos;
    } else {
      return this.getPrev(idx as PhotoListPos);
    }
  }

  public getItem(pos: PhotoListPos): AlbumPhoto {
    return this._photos[pos];
  }

  public getItemIndex(photo: AlbumPhoto): number {
    let idx = this._idIndex.get(photo.id);
    return (idx !== undefined) ? idx : -1;
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
      if (this._visible[idx]) {
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
      if (this._visible[idx]) {
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

  // public setFilter(pred?: (x: AlbumPhoto) => boolean) {
  //   console.log("PhotoList.setFilter");
  //   if (pred) {
  //     this._filter = pred;
  //   } else {
  //     this._filter = undefined;
  //   }

  //   // we have to run twice; first to mark based on filter
  //   // and then removed stacked
  //   for (let idx = 0; idx < this._photos.length; idx++) {
  //     let include = (pred) ? pred(this._photos[idx]) : true;
  //     this._filtered[idx] = include;
  //   }

  //   for (let idx = 0; idx < this._photos.length; idx++) {
  //     let photo = this._photos[idx];
  //     let stack = getStack(photo.id);
  //     if (stack && this._hideStack) {
  //       this.hideStackPhotos(photo.stackId, stack);
  //     }
  //   }
  // }

  public find(pos: PhotoListPos, pred: (x: AlbumPhoto) => boolean): PhotoListPos {
    if (pos === -1) {
      return -1 as PhotoListPos;
    }
    for (; pos < this._photos.length - 1; pos++) {
      if (!this._visible[pos]) {
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
      if (!this._visible[pos]) {
        continue;
      }

      if (pred(this._photos[pos])) {
        return pos;
      }
    }

    return -1 as PhotoListPos;
  }

  public slice(start: PhotoListPos, end: PhotoListPos): AlbumPhoto[] {
    let arr: AlbumPhoto[] = [];
    for (let pos = start; pos <= end; pos++) {
      if (this._visible[pos]) {
        arr.push(this._photos[pos]);
      }
    }
    return arr;
  }

  public asArray(): AlbumPhoto[] {
    let arr: AlbumPhoto[] = [];
    for (let pos = 0; pos <= this._photos.length; pos++) {
      if (this._visible[pos]) {
        arr.push(this._photos[pos]);
      }
    }
    return arr;
  }

  private onListChangedHandler() {
    console.log('onListChanged');
    this._photos.length = 0;
    this._visible.length = 0;
    this._idIndex.clear();
    this.addPhotosWorker(this._source.getItems(), PhotoListChangeType.load);
    this._version++;
    this.invokeOnListChanged({ ct: PhotoListChangeType.update, photos: [] })
  }

  private invokeOnListChanged(args: { ct: PhotoListChangeType, photos: ReadonlyArray<AlbumPhoto> }) {
    this._version++;
    this.onListChanged.invoke(args);
  }
  /**
   * called if any photo changed; we only care about stacks
   */
  // public onPhotoChanged(photos: AlbumPhoto[]) {
  //   try {
  //     for (let photo of photos) {
  //       if (!this._idIndex.get(photo.id)) {
  //         return;
  //       }

  //       let oldStack = this._savedStacks.get(photo.id);
  //       if (oldStack !== getStack(photo.stackId)) {
  //         console.log("PhotoList: stack changed");
  //         if (oldStack) {
  //           for (let id of oldStack!) {
  //             let idx = this._idIndex.get(id);
  //             this._filtered[idx!] = (this._filter) ? this._filter(this._photos[idx!]) : true;
  //           }
  //         }

  //         let stack = getStack(photo.stackId);
  //         if (stack) {
  //           this.hideStackPhotos(photo.stackId, stack);
  //         }

  //         this.onChanged.invoke({ ct: PhotoListChangeType.hide, photos: [] });
  //       }
  //     }
  //   }
  //   catch (e: any) {
  //     console.log('onPhotoChanged failed:' + e.toString());
  //   }
  // }
}

export enum PhotoListChangeType {
  load,
  add,
  remove,
  hide,
  update,
  filter,
}
