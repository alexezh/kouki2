import { IEventHandler } from "../lib/synceventsource";
import { AlbumPhoto } from "./AlbumPhoto";
import { LibraryPhotoSource } from "./LibraryPhotoSource";
import { IPhotoListSource } from "./PhotoList";
import { filterPhotos, libraryChanged, photoChanged, photoLibraryMap, sortByDate } from "./PhotoStore";


export class HiddenPhotoSource extends LibraryPhotoSource {

  public constructor() {
    super();
  }

  protected override onPhotoChanged(photos: AlbumPhoto[]) {
    super.onPhotoChanged(photos);
  }

  protected override onLibraryChanged() {
    super.onLibraryChanged();
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