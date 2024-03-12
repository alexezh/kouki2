import { AlbumPhoto, LibraryUpdateRecord, LibraryUpdateRecordKind, PhotoListId } from "./AlbumPhoto";
import { CollectionId } from "./CollectionStore";
import { LibraryPhotoSource } from "./LibraryPhotoSource";
import { AppFilter, FilterFavorite, PhotoList } from "./PhotoList";
import { photoLibraryMap, sortByDate } from "./PhotoStore";

let allPhotos: PhotoList | undefined;

export class AllPhotosSource extends LibraryPhotoSource {
  private photos: AlbumPhoto[] | null = null;
  private filterFavorite: FilterFavorite = 'all';
  private filterDups: boolean = false;

  public constructor() {
    super();
  }

  protected override onLibraryChanged(updates: LibraryUpdateRecord[]): void {
    console.log("AllPhotoSource.onLibraryChanged");
    this.photos = null;
    super.onLibraryChanged(updates);
  }

  public setAppFilter(filter: AppFilter): void {
    let updateFilter = false;
    if (filter.filterDups !== undefined) {
      this.filterDups = filter.filterDups;
      updateFilter = true;
    }
    if (filter.filterFavorite !== undefined) {
      this.filterFavorite = filter.filterFavorite;
      updateFilter = true;
    }

    if (updateFilter) {
      this.changeHandler?.call(this, [{ kind: LibraryUpdateRecordKind.filter }]);
    }
  }

  public isHidden(photo: AlbumPhoto): boolean {
    if (photo.stackHidden || photo.hidden) {
      return true;
    }

    return false;
  }

  /**
   * we want to do most of filtering in source since we have index
   * and this allows us to preserve position of item. But it creates problem with customization
   */
  public getItems(): ReadonlyArray<AlbumPhoto> {
    if (photoLibraryMap.size === 0) {
      return [];
    }

    if (!this.photos) {
      this.photos = [];

      for (let [key, p] of photoLibraryMap) {
        this.photos.push(p);
      }

      sortByDate(this.photos);
    }

    return this.photos;
  }
}

export function getAllPhotos(): PhotoList {
  if (allPhotos) {
    return allPhotos;
  }

  allPhotos = new PhotoList(new PhotoListId('all', 0 as CollectionId), new AllPhotosSource());

  return allPhotos;
}

