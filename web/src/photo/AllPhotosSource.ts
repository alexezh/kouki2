import { IEventHandler } from "../lib/synceventsource";
import { AlbumPhoto, PhotoListId } from "./AlbumPhoto";
import { CollectionId } from "./CollectionStore";
import { IPhotoListSource, PhotoList } from "./PhotoList";
import { filterUnique, libraryChanged, photoLibraryMap, sortByDate } from "./PhotoStore";

let allPhotos: PhotoList | undefined;

export class AllPhotosSource implements IPhotoListSource, IEventHandler<AlbumPhoto[]> {
  private changeHandler: (() => void) | null = null;

  public constructor() {
    libraryChanged.add(this);
  }

  invoke(...args: any[]): void {
    this.changeHandler?.call(this);
  }

  public setChangeHandler(func: () => void): void {
    this.changeHandler = func;
  }

  addItems(items: AlbumPhoto[]): void {
  }

  removeItems(items: AlbumPhoto[]): void {
  }

  public getItems(): ReadonlyArray<AlbumPhoto> {
    if (photoLibraryMap.size === 0) {
      return [];
    }
    let uniquePhotos = filterUnique(photoLibraryMap);
    sortByDate(uniquePhotos);
    return uniquePhotos;
  }
}

export function getAllPhotos(): PhotoList {
  if (allPhotos) {
    return allPhotos;
  }

  allPhotos = new PhotoList(new PhotoListId('all', 0 as CollectionId), new AllPhotosSource());

  return allPhotos;
}

