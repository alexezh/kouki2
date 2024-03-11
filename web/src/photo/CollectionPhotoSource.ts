import { nowAsISOString } from "../lib/date";
import { WireCollectionItem, wireAddCollectionItems, wireGetCollectionItems, wireRemoveCollectionItems } from "../lib/photoclient";
import { AlbumPhoto, LibraryUpdateRecord, LibraryUpdateRecordKind, PhotoId } from "./AlbumPhoto";
import { CollectionId, collectionMap } from "./CollectionStore";
import type { PhotoCollection } from "./PhotoCollection";
import { AppFilter, IPhotoListSource } from "./PhotoList";
import { getPhotoById, waitLibraryLoaded } from "./PhotoStore";

/**
 * standard collections create bit of complexity
 * normally we know the exact ID for collection which means that it was loaded
 * but for standard collections, we just know the alias; and we might create it
 * before the load. 
 */
export class CollectionPhotoSource implements IPhotoListSource {
  private changeHandler: ((update: LibraryUpdateRecord[]) => void) | null = null;
  private photos: AlbumPhoto[] = [];
  private coll: PhotoCollection | undefined = undefined;

  public constructor(collId: CollectionId) {
    setTimeout(async () => {
      await this.loadPhotos(collId);
    })
  }

  public isHidden(photo: AlbumPhoto): boolean {
    return false;
  }

  public setAppFilter(filter: AppFilter): void {

  }

  protected async getOrCreateCollection(id: CollectionId): Promise<PhotoCollection> {
    await waitLibraryLoaded();
    let coll = collectionMap.get(id);
    if (!coll) {
      throw new Error('Collection not found');
    }
    return coll;
  }

  /**
   * load photos to collection
   */
  private async loadPhotos(collId: CollectionId): Promise<void> {
    this.coll = await this.getOrCreateCollection(collId);

    let items: WireCollectionItem[] = await wireGetCollectionItems(this.coll.id.id);
    let photos: AlbumPhoto[] = [];

    for (let item of items) {
      let photo = getPhotoById(item.photoId as PhotoId);
      photos.push(photo);
    }

    this.photos = photos;
    this.changeHandler?.call(this, [{ kind: LibraryUpdateRecordKind.load }]);
  }

  public addItems(items: AlbumPhoto | ReadonlyArray<AlbumPhoto>) {
    if (Array.isArray(items)) {
      wireAddCollectionItems(this.coll!.id.id, items.map((x) => {
        return { photoId: x.id, updateDt: nowAsISOString() }
      }));
    } else {
      let photo = items as AlbumPhoto;
      wireAddCollectionItems(this.coll!.id.id, [
        {
          photoId: photo.id, updateDt: nowAsISOString()
        }
      ]);
    }
  }

  public removeItems(items: AlbumPhoto | ReadonlyArray<AlbumPhoto>) {
    if (Array.isArray(items)) {
      wireRemoveCollectionItems(this.coll!.id.id, items.map((x) => {
        return { photoId: x.id, updateDt: nowAsISOString() }
      }));
    } else {
      let photo = items as AlbumPhoto;
      wireRemoveCollectionItems(this.coll!.id.id, [
        {
          photoId: photo.id, updateDt: nowAsISOString()
        }
      ]);
    }
  }

  public setChangeHandler(func: (update: LibraryUpdateRecord[]) => void): void {
    this.changeHandler = func;
  }

  public getItems(): ReadonlyArray<AlbumPhoto> {
    return this.photos;
  }
}

// export class QuickCollectionSource extends CollectionPhotoSource {
//   public constructor(collId: CollectionId) {
//     super(collId);
//   }

//   protected override async getOrCreateCollection(): Promise<PhotoCollection> {
//     await waitLibraryLoaded();

//     // at this point we have collection list; find default quick and map to it
//     // get the current quick and other collections
//     let quickColl: PhotoCollection | null = await createCollectionOfKind('quick');

//     // ensure that we have quick collection
//     if (!quickColl) {
//       let response = await wireAddCollection({ kind: 'quick', name: '', createDt: nowAsISOString() });
//       quickColl = new PhotoCollection(response.collection);
//       collectionMap.set(response.collection.id as CollectionId, quickColl);
//     }

//     return quickColl;
//   }
// }