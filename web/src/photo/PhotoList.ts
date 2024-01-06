import { SimpleEventSource } from "../lib/synceventsource";
import { AlbumPhoto, PhotoListId } from "./AlbumPhoto";

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
 * For filtering, we expose different list based on settings. So for ordinary users it looks as
 * we updated the collection
 */
export class PhotoList {
  private readonly _photos: AlbumPhoto[] = [];
  private _filtered: AlbumPhoto[] = [];
  private readonly onChanged: SimpleEventSource = new SimpleEventSource();
  public readonly id: PhotoListId;
  private _filter?: (x: AlbumPhoto) => boolean;


  public get photos(): ReadonlyArray<AlbumPhoto> {
    return this._filtered;
  }

  public get photoCount(): number { return this._photos.length }

  public constructor(id: PhotoListId, getPhotos: (self: PhotoList) => Promise<AlbumPhoto[]>) {
    this.id = id;
    this._photos = [];
    this._filtered = this._photos;
    setTimeout(async () => {
      let photos = await getPhotos(this);
      this.addPhotosWorker(photos, PhotoListChangeType.load);
    });
  }

  public addPhotos(photos: AlbumPhoto[]) {
    this.addPhotosWorker(photos, PhotoListChangeType.add);
  }

  private addPhotosWorker(photos: AlbumPhoto[], ct: PhotoListChangeType) {
    this._photos.push(...photos);
    if (this._filter) {
      for (let x of photos) {
        if (this._filter(x)) {
          this._filtered.push(x);
        }
      }
    }

    this.onChanged.invoke(ct, photos);
  }

  public addOnChanged(func: (ct: PhotoListChangeType, photos: AlbumPhoto[]) => void): number {
    return this.onChanged.add(func);
  }

  public removeOnChanged(id: number) {
    return this.onChanged.remove(id);
  }

  public findIndex(pred: (x: AlbumPhoto) => boolean): number {
    return this._photos.findIndex(pred);
  }

  /**
   * return photos matching criteria
   */
  public filter(pred: (x: AlbumPhoto) => boolean): AlbumPhoto[] {
    return this.photos.filter(pred);
  }

  public setFilter(pred?: (x: AlbumPhoto) => boolean) {
    if (pred) {
      this._filter = pred;
      this._filtered = this._photos.filter(pred);
    } else {
      this._filter = undefined;
      this._filtered = this._photos;
    }
  }
}

export enum PhotoListChangeType {
  load,
  add,
  remove
}
