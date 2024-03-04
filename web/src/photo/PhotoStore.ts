import { AlbumPhoto, LibraryUpdateRecord, LibraryUpdateRecordKind, PhotoId } from "./AlbumPhoto";
import { wireGetCorrelation, wireGetLibrary, wireGetPhotos, wireUpdatePhoto } from "../lib/photoclient";
import { WeakEventSource } from "../lib/synceventsource";
import { loadCollections } from "./CollectionStore";
import { loadFolders } from "./FolderStore";
import { UpdatePhotoContext } from "./UpdatePhotoContext";
import { substractYears } from "../lib/date";

export const photoLibraryMap = new Map<PhotoId, AlbumPhoto>();
export const stackMap = new Map<PhotoId, ReadonlyArray<PhotoId>>();
const duplicateByHashBuckets = new Map<string, PhotoId[]>();
export const libraryChanged = new WeakEventSource<LibraryUpdateRecord[]>();
let loaded = false;
let loadWaiters: (() => void)[] = [];
let maxPhotoId: number = 0;
let startDt: Date | undefined = substractYears(new Date(), 3);

export function setStartDt(date: Date | undefined) {
  startDt = date;
}

export function getStartDt(): Date | undefined {
  return startDt;
}

export function invokeLibraryChanged(updates: LibraryUpdateRecord[]) {
  libraryChanged.invoke(updates);
}

export async function waitLibraryLoaded(): Promise<void> {
  if (loaded) {
    return;
  }

  let promise = new Promise<void>((resolve) => {
    loadWaiters.push(resolve);
  });

  return promise;
}

/**
 * invoked when any photo is changed
 */
function completeLoad() {
  if (!loaded) {
    loaded = true;

    for (let resolve of loadWaiters) {
      resolve();
    }
  }

  setTimeout(async () => {
    libraryChanged.invoke([{ kind: LibraryUpdateRecordKind.load }]);
  });
}

export async function loadLibrary() {
  console.log("loadLibrary:" + maxPhotoId);

  // get photos from previous max
  let wirePhotos = await wireGetPhotos({ minId: maxPhotoId, startDt: (startDt) ? startDt.toISOString() : undefined });

  let pairs: { left: PhotoId, right: PhotoId }[] = [];
  let prevPhoto: AlbumPhoto | null = null;
  let newPhotos: AlbumPhoto[] = [];

  // for photos with the same ti,e. get similarity
  for (let wirePhoto of wirePhotos) {
    let photo = photoLibraryMap.get(wirePhoto.id as PhotoId);
    if (photo) {
      // nothing do do
    } else {
      photo = new AlbumPhoto(wirePhoto);
      photoLibraryMap.set(wirePhoto.id as PhotoId, photo);
      newPhotos.push(photo);
    }

    if (prevPhoto) {
      if (photo.originalDate.valueOf() === prevPhoto.originalDate.valueOf()) {
        pairs.push({ left: prevPhoto.wire.id as PhotoId, right: photo.wire.id as PhotoId });
      }
    }

    prevPhoto = photo;
    maxPhotoId = Math.max(photo.id, maxPhotoId);
  }

  console.log("Added photos: " + newPhotos.length);

  buildStacks(newPhotos);
  buildDuplicateBuckets(newPhotos);
  buildSimilarityInfo(pairs);

  await loadCollections();
  loadFolders();

  completeLoad();
}

/**
 * this is a ever going question on storage vs runtime
 * for now we are going to do runtime because it is cheaper
 * 
 * for dupes, we are going to store hash and signature
 * in this function we are first going to first get photos which are dupes
 * and then choose which one is good. 
 */
function buildDuplicateBuckets(photos: AlbumPhoto[]) {
  // make list of dupes by hash; we will also make list by signature
  duplicateByHashBuckets.clear();
  for (let photo of photos) {
    let ids = duplicateByHashBuckets.get(photo.wire.hash);
    if (ids) {
      ids.push(photo.wire.id as PhotoId);
    } else {
      duplicateByHashBuckets.set(photo.wire.hash, [photo.wire.id as PhotoId]);
    }
  }

  for (let photo of photos) {
    let ids = duplicateByHashBuckets.get(photo.wire.hash);
    photo.dupCount = ids!.length;
  }
}

async function buildSimilarityInfo(pairs: { left: PhotoId, right: PhotoId }[]): Promise<void> {
  let corrResp = await wireGetCorrelation({ photos: pairs });
  for (let i = 0; i < pairs.length; i++) {
    let correlation = corrResp.corrections[i];
    if (correlation < 0.9) {
      continue;
    }

    let left = photoLibraryMap.get(pairs[i].left)!;
    let right = photoLibraryMap.get(pairs[i].right)!;
    if (left.similarId) {
      right.similarId = left.similarId;
    } else {
      right.similarId = left.wire.id as PhotoId;
      left.similarId = left.wire.id as PhotoId;
    }
    right.correlation = correlation;
  }
}

function buildStacks(photos: AlbumPhoto[]) {
  stackMap.clear();
  for (let photo of photos) {
    if (photo.wire.stackId) {
      let stack = stackMap.get(photo.wire.stackId as PhotoId);
      if (!stack) {
        stack = [];
        stackMap.set(photo.wire.stackId as PhotoId, stack);
      }

      // for build we can change values
      (stack as PhotoId[]).push(photo.id);
    }
  }

  // update stack cover
  let ctx = new UpdatePhotoContext(false);
  for (let [stackId, stack] of stackMap) {
    updateStackCover(stack, ctx);
    // this is hack for old version which did not store stackId
    // no longer needed
    // if (orig && orig.wire.stackId != stackId) {
    //   (stack as PhotoId[]).push(orig.id);
    //   orig.wire.stackId = stackId;
    //   wireUpdatePhoto({ hash: orig.wire.hash, stackId: orig.wire.id })
    // } else {
    //   console.log("buildStacks: cannot find photo");
    // }
  }
  // we do not have to generate update
}

function updateStackCover(stack: ReadonlyArray<PhotoId>, ctx: UpdatePhotoContext) {
  let cover: PhotoId | undefined = undefined;

  let favIdx = stack.findIndex((x: PhotoId) => getPhotoById(x)!.favorite);
  if (favIdx === -1) {
    cover = stack[0];
  } else {
    cover = stack[favIdx];
  }

  for (let photo of stack) {
    getPhotoById(photo).setStackHidden(photo !== cover, ctx);
  }
}

export function addStack(stackId: PhotoId, photo: AlbumPhoto, ctx: UpdatePhotoContext) {
  let oldStack = stackMap.get(stackId);
  let stack: PhotoId[];

  // make a copy of stack
  if (!oldStack) {
    stack = [];
  } else {
    stack = [...oldStack];
  }

  let addStackPhoto = (photo: AlbumPhoto) => {
    stackMap.set(stackId, stack);
    stack.push(photo.id);
    photo.wire.stackId = stackId;

    updateStackCover(stack, ctx);

    ctx.addPhoto({ kind: LibraryUpdateRecordKind.update, photo: photo, stackId: stackId })
    photo.invokeOnChanged();
  }

  // combine stacks
  if (photo.stackId) {
    let stackPhotos = getStack(photo.stackId);
    if (!stackPhotos) {
      console.log('addStack: cannot get stack');
      return;
    }
    for (let spId of stackPhotos) {
      let sp = getPhotoById(spId);
      addStackPhoto(sp);
    }
  } else {
    addStackPhoto(photo);
  }
}

export function removeStack(photo: AlbumPhoto, ctx: UpdatePhotoContext) {
  if (!photo.hasStack) {
    console.log('removeStack: photo is not in stack');
    return;
  }

  let oldStack = stackMap.get(photo.stackId);
  if (!oldStack) {
    console.log('removeStack: no stack');
    return;
  }

  let idx = oldStack.findIndex((id: PhotoId) => id === photo.id);
  let stack = [...oldStack];
  stack.splice(idx, 1);

  ctx.addPhoto({ kind: LibraryUpdateRecordKind.update, photo: photo, stackId: 0 })
  photo.invokeOnChanged();
}

export function getStack(stackId: PhotoId): ReadonlyArray<PhotoId> | undefined {
  let stack = stackMap.get(stackId);
  return stack;
}

export function filterPhotos(photos: Map<number, AlbumPhoto> | ReadonlyArray<AlbumPhoto>, pred: (x: AlbumPhoto) => boolean): AlbumPhoto[] {
  let filtered: AlbumPhoto[] = [];
  if (Array.isArray(photos)) {
    for (let photo of (photos as AlbumPhoto[])) {
      if (pred(photo)) {
        filtered.push(photo);
      }
    }
  } else {
    for (let [key, photo] of (photos as Map<number, AlbumPhoto>)) {
      if (pred(photo)) {
        filtered.push(photo);
      }
    }
  }

  return filtered;
}

export function filterUnique(photos: Map<number, AlbumPhoto> | ReadonlyArray<AlbumPhoto>): AlbumPhoto[] {
  // make list of non-duplicate photos while including at least one into collection
  let dupPhotos = new Map<number, boolean>();
  let uniquePhotos = filterPhotos(photos, (x: AlbumPhoto) => {

    // ensure that we only have one photo in collection
    if (x.dupCount > 1) {
      let isDup = dupPhotos.get(x.wire.id);
      if (isDup) {
        return false;
      }

      let ids = getDuplicateBucket(x);
      for (let id of ids) {
        dupPhotos.set(id, true);
      }
    }

    return true;
  });

  return uniquePhotos;
}

export function sortByDate(photos: AlbumPhoto[]): void {
  photos.sort((x: AlbumPhoto, y: AlbumPhoto) => {
    let xn = x.originalDate.valueOf();
    let yn = y.originalDate.valueOf();
    if (xn > yn) {
      return -1;
    } else if (xn < yn) {
      return 1;
    } else {
      return 0;
    }
  })
}

export function getDuplicateBucket(photo: AlbumPhoto): PhotoId[] {
  let ids = duplicateByHashBuckets.get(photo.wire.hash);
  return ids ?? [photo.wire.id as PhotoId];
}

export function getPhotoById(id: PhotoId): AlbumPhoto {
  let photo = photoLibraryMap.get(id);
  if (!photo) {
    throw new Error('PhotoStore: Cannot find photo ' + id);
  }
  return photo;
}

export function tryGetPhotoById(id: PhotoId): AlbumPhoto | null {
  let photo = photoLibraryMap.get(id);
  if (!photo) {
    return null;
  }
  return photo;
}

