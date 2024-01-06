import { PhotoListKind, WireCollection, WireFolder, wireAddCollection, wireGetCollections, wireGetFolders } from "../lib/photoclient";
import { SimpleEventSource } from "../lib/synceventsource";
import { AlbumPhoto, PhotoListId } from "./AlbumPhoto";
import { PhotoList } from "./PhotoList";

export type CollectionId = number & {
  __tag_collection: boolean;
}

export class PhotoCollection {
  public readonly wire: WireCollection;
  public readonly photos: PhotoList;
  public readonly updateDt: Date;

  public constructor(wire: WireCollection) {
    this.wire = wire;
    this.photos = new PhotoList(new PhotoListId('quick', this.wire.id), [])
    this.updateDt = new Date(Date.parse(wire.name));
  }
}

let collectionMap = new Map<CollectionId, PhotoCollection>();
let collectionChanged = new SimpleEventSource();

// some collections exposed as catalogs, track them
let catalogMap = new Map<PhotoListKind, PhotoCollection>();
let loaded = false;

export function addOnCollectionsChanged(func: () => void): number {
  return collectionChanged.add(func);
}

export function removeOnCollectionsChanged(id: number) {
  return collectionChanged.remove(id);
}

export function triggerRefreshCollections() {
  setTimeout(async () => {
    await loadCollections();
  });
}

export function getCollection(id: CollectionId): PhotoCollection | undefined {
  return collectionMap.get(id);
}

export function getCollections(): IterableIterator<PhotoCollection> {
  return collectionMap.values();
}

export async function loadCollections(): Promise<boolean> {
  if (loaded) {
    return true;
  }

  let wireCollections = await wireGetCollections();

  for (let wc of wireCollections) {
    let coll = collectionMap.get(wc.id as CollectionId);
    if (!coll) {
      coll = new PhotoCollection(wc);
      collectionMap.set(wc.id as CollectionId, coll);
    }

    // get the current quick and other collections
    let cat = catalogMap.get(coll.wire.kind as PhotoListKind);
    if (!cat) {
      catalogMap.set(coll.wire.kind as PhotoListKind, coll);
    } else {
      if (coll.updateDt.valueOf() > cat.updateDt.valueOf()) {
        catalogMap.set(coll.wire.kind as PhotoListKind, coll)
      }
    }
  }

  // ensure that we have quick collection
  if (!catalogMap.get('quick' as PhotoListKind)) {
    let response = await wireAddCollection({ kind: 'quick', name: '', createDt: Date.now().toString() });
    catalogMap.set('quick' as PhotoListKind, new PhotoCollection(response.collection));
  }

  loaded = true;

  collectionChanged.invoke();

  return true;
}

export function getQuickCollection(): PhotoList {
  let quick = catalogMap.get('quick' as PhotoListKind);
  if (!quick) {
    throw new Error('cannot find quick collection');
  }
  return quick.photos;
}

export function addQuickCollection(photos: IterableIterator<AlbumPhoto>) {

  getQuickCollection().addPhotos(photos);
}