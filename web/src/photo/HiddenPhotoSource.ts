import { IEventHandler } from "../lib/synceventsource";
import { AlbumPhoto } from "./AlbumPhoto";
import { IPhotoListSource } from "./PhotoList";
import { filterPhotos, libraryChanged, photoChanged, photoLibraryMap, sortByDate } from "./PhotoStore";

export class HiddenPhotoSource implements IPhotoListSource {
  private changeHandler: (() => void) | null = null;
  private readonly photoChangedHandler: IEventHandler<AlbumPhoto[]>;
  private readonly libraryChangedHandler: IEventHandler<void>;

  public constructor() {
    let self = this;
    this.photoChangedHandler = {
      invoke(args: AlbumPhoto[]): void {
        return self.onPhotoChanged(args)
      }
    }
    this.libraryChangedHandler = {
      invoke(): void {
        return self.onLibraryChanged()
      }
    }
    libraryChanged.add(this.libraryChangedHandler);
    photoChanged.add(this.photoChangedHandler);
  }

  public setChangeHandler(func: () => void): void {
    this.changeHandler = func;
  }

  addItems(items: AlbumPhoto[]): void {
  }

  removeItems(items: AlbumPhoto[]): void {
  }

  private onPhotoChanged(photos: AlbumPhoto[]) {
    this.changeHandler?.call(this);
  }

  private onLibraryChanged() {
    this.changeHandler?.call(this);
  }

  public getItems(): ReadonlyArray<AlbumPhoto> {
    if (photoLibraryMap.size === 0) {
      return [];
    }

    let photos = filterPhotos(photoLibraryMap, (x: AlbumPhoto) => {
      return x.hidden;
    });

    sortByDate(photos);
    return photos;
  }
}