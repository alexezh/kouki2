import { AlbumPhoto, LibraryUpdateRecord, LibraryUpdateRecordKind, PhotoListId } from "./AlbumPhoto";
import { CollectionId } from "./CollectionStore";
import { LibraryPhotoSource } from "./LibraryPhotoSource";
import { AppFilter, FilterFavorite, PhotoList } from "./PhotoList";
import { filterUnique, photoLibraryMap, sortByDate } from "./PhotoStore";

let allPhotos: PhotoList | undefined;

export class AllPhotosSource extends LibraryPhotoSource {
  private uniquePhotos: AlbumPhoto[] | null = null;
  private filterFavorite: FilterFavorite = 'all';
  private filterDups: boolean = false;

  public constructor() {
    super();
  }

  protected override onLibraryChanged(updates: LibraryUpdateRecord[]): void {
    this.uniquePhotos = null;
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
    if (this.filterFavorite === 'favorite' && photo.favorite <= 0) {
      return true;
    }
    else if (this.filterFavorite === 'rejected' && photo.favorite >= 0) {
      return true;
    }

    if (this.filterDups && photo.similarId === 0) {
      return true;
    }

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

    if (!this.uniquePhotos) {
      this.uniquePhotos = filterUnique(photoLibraryMap);
      sortByDate(this.uniquePhotos);
    }

    return this.uniquePhotos;
  }
}

export function getAllPhotos(): PhotoList {
  if (allPhotos) {
    return allPhotos;
  }

  allPhotos = new PhotoList(new PhotoListId('all', 0 as CollectionId), new AllPhotosSource());

  return allPhotos;
}

