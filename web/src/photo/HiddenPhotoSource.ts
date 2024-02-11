import { AlbumPhoto, LibraryUpdateRecord } from "./AlbumPhoto";
import { LibraryPhotoSource } from "./LibraryPhotoSource";
import { AppFilter } from "./PhotoList";
import { filterPhotos, photoLibraryMap, sortByDate } from "./PhotoStore";


export class HiddenPhotoSource extends LibraryPhotoSource {

  public constructor() {
    super();
  }

  protected override onLibraryChanged(updates: LibraryUpdateRecord[]) {
    super.onLibraryChanged(updates);
  }

  public isHidden(photo: AlbumPhoto): boolean {
    return false;
  }

  public setAppFilter(filter: AppFilter): void {

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