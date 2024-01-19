import { AlbumPhoto, PhotoId, PhotoListId } from "./AlbumPhoto";
import { wireGetCorrelation, wireGetLibrary } from "../lib/photoclient";
import { IEventHandler, WeakEventSource } from "../lib/synceventsource";
import { PhotoList } from "./PhotoList";

let allPhotos: PhotoList | undefined;
export const photoLibraryMap = new Map<PhotoId, AlbumPhoto>();
const duplicateByHashBuckets = new Map<string, PhotoId[]>();
const photoChanged: WeakEventSource = new WeakEventSource();
const loadQueue: (() => Promise<any>)[] = [];
let loaded = false;

/**
 * invoked when any photo is changed
 */
export function addOnPhotoChanged(handler: IEventHandler) {
  photoChanged.add(handler);
}

export function invokeOnPhotoChanged(photo: AlbumPhoto) {
  photoChanged.invoke(photo);
}

export function queueOnLoaded<T>(func: () => Promise<T>): Promise<T> {
  let promise = new Promise<T>((resolve) => {
    if (loaded) {
      setTimeout(async () => {
        let result = await func();
        resolve(result);
      });
    } else {
      loadQueue.push(async () => {
        let result = await func();
        resolve(result);
      });
    }
  });
  return promise;
}

function completeLoad() {
  loaded = true;

  setTimeout(async () => {
    for (let func of loadQueue) {
      await func();
    }

    // clear the queue
    loadQueue.splice(0, loadQueue.length);
  });
}

export async function loadLibrary(loadParts: () => Promise<boolean>) {
  if (loaded) {
    return;
  }
  let wirePhotos = await wireGetLibrary();

  let pairs: { left: PhotoId, right: PhotoId }[] = [];
  let prevPhoto: AlbumPhoto | null = null;

  // for photos with the same ti,e. get similarity
  for (let wirePhoto of wirePhotos) {
    let photo = photoLibraryMap.get(wirePhoto.id as PhotoId);
    if (photo) {
      // nothing do do
    } else {
      photo = new AlbumPhoto(wirePhoto);
      photoLibraryMap.set(wirePhoto.id as PhotoId, photo);
    }

    if (prevPhoto) {
      if (photo.originalDate.valueOf() === prevPhoto.originalDate.valueOf()) {
        pairs.push({ left: prevPhoto.wire.id as PhotoId, right: photo.wire.id as PhotoId });
      }
    }

    prevPhoto = photo;
  }

  buildStacks();
  buildDuplicateBuckets();

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

  await loadParts();

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
function buildDuplicateBuckets() {
  // make list of dupes by hash; we will also make list by signature
  duplicateByHashBuckets.clear();
  for (let [key, photo] of photoLibraryMap) {
    let ids = duplicateByHashBuckets.get(photo.wire.hash);
    if (ids) {
      ids.push(photo.wire.id as PhotoId);
    } else {
      duplicateByHashBuckets.set(photo.wire.hash, [photo.wire.id as PhotoId]);
    }
  }

  for (let [key, photo] of photoLibraryMap) {
    let ids = duplicateByHashBuckets.get(photo.wire.hash);
    photo.dupCount = ids!.length;
  }
}

function buildStacks() {
  for (let [key, photo] of photoLibraryMap) {
    if (photo.wire.stackId) {
      let orig = photoLibraryMap.get(photo.wire.stackId as PhotoId);
      if (orig) {
        orig.addStack(photo);
      } else {
        console.log("updateStacks: cannot find photo");
      }
    }
  }
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

function filterUnique(photos: Map<number, AlbumPhoto> | ReadonlyArray<AlbumPhoto>): AlbumPhoto[] {
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

export function getPhotoById(id: PhotoId): AlbumPhoto | undefined {
  return photoLibraryMap.get(id);
}

export function getAllPhotos(): PhotoList {
  if (allPhotos) {
    return allPhotos;
  }

  allPhotos = new PhotoList(new PhotoListId('all', 0), () => {
    return queueOnLoaded((): Promise<AlbumPhoto[]> => {
      let uniquePhotos = filterUnique(photoLibraryMap);
      sortByDate(uniquePhotos);
      return Promise.resolve(uniquePhotos);
    });
  });

  return allPhotos;
}