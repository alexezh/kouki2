import { IEventHandler } from "../lib/synceventsource";
import { AlbumPhoto, PhotoListId } from "./AlbumPhoto";
import { CollectionId } from "./CollectionStore";
import { LibraryPhotoSource } from "./LibraryPhotoSource";
import { IPhotoListSource, PhotoList } from "./PhotoList";
import { filterPhotos, filterUnique, libraryChanged, photoLibraryMap, sortByDate } from "./PhotoStore";

let allPhotos: PhotoList | undefined;

export class AllPhotosSource extends LibraryPhotoSource {
  private uniquePhotos: AlbumPhoto[] | null = null;

  public constructor() {
    super();
  }

  protected override onLibraryChanged(): void {
    this.uniquePhotos = null;
    super.onLibraryChanged();
  }
  public getItems(): ReadonlyArray<AlbumPhoto> {
    if (photoLibraryMap.size === 0) {
      return [];
    }

    if (!this.uniquePhotos) {
      this.uniquePhotos = filterUnique(photoLibraryMap);
      sortByDate(this.uniquePhotos);
    }

    let photos = filterPhotos(this.uniquePhotos, (x: AlbumPhoto) => {
      return !x.hidden;
    });

    return photos;
  }
}

export function getAllPhotos(): PhotoList {
  if (allPhotos) {
    return allPhotos;
  }

  allPhotos = new PhotoList(new PhotoListId('all', 0 as CollectionId), new AllPhotosSource());

  return allPhotos;
}

