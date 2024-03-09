import { AlbumPhoto, LibraryUpdateRecord } from "./AlbumPhoto";
import { LibraryPhotoSource } from "./LibraryPhotoSource";
import { AppFilter } from "./PhotoList";
import { filterPhotos, photoLibraryMap, sortByDate } from "./PhotoStore";

/**
 * used for favority
 */
export class FilteredPhotoSource extends LibraryPhotoSource {
  private filter: (x: AlbumPhoto) => boolean;

  public constructor(filter: (x: AlbumPhoto) => boolean) {
    super();
    this.filter = filter;
  }

  protected override onLibraryChanged(updates: LibraryUpdateRecord[]) {
    super.onLibraryChanged(updates);
  }

  public isHidden(photo: AlbumPhoto): boolean {
    if (photo.stackHidden || photo.hidden) {
      return true;
    }
    return false;
  }

  public setAppFilter(filter: AppFilter): void {

  }

  public getItems(): ReadonlyArray<AlbumPhoto> {
    if (photoLibraryMap.size === 0) {
      return [];
    }

    let photos = filterPhotos(photoLibraryMap, this.filter);

    sortByDate(photos);
    return photos;
  }
}

export class HiddenPhotoSource extends FilteredPhotoSource {

  public constructor() {
    super((x: AlbumPhoto) => {
      return x.hidden;
    });
  }
}