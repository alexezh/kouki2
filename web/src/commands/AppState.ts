import { AlbumPhoto, AlbumRow, PhotoListId } from "../photo/AlbumPhoto";
import { SimpleEventSource } from "../lib/synceventsource";
import { loadPhotoList } from "../photo/PhotoStore";

export type FilterFavorite = "all" | "favorite" | "rejected";

export interface AppState {
  readonly currentListId: PhotoListId;
  readonly currentList: AlbumPhoto[];
  readonly filterFavorite: FilterFavorite;
  readonly filterStars: number;
}

export type AppStateUpdate = {
  currentListId?: PhotoListId;
  filterFavorite?: FilterFavorite;
  filterStars?: number;
}

let state: AppState = {
  currentListId: 'all',
  currentList: [],
  filterFavorite: "all",
  filterStars: 0
}

let initialized = false;
let stateChanged = new SimpleEventSource();

export function addOnStateChanged(func: () => void): number {
  return stateChanged.add(func);
}

export function removeOnStateChanged(id: number) {
  stateChanged.remove(id);
}

export function getState(): AppState {
  return state;
}

export function updateState(update: AppStateUpdate) {
  let rebuildList = false;

  if (!initialized) {
    initialized = true;
    rebuildList = true;
  }

  if (update.currentListId && state.currentListId !== update.currentListId) {
    rebuildList = true;
  }

  if (update.filterFavorite && state.filterFavorite !== update.filterFavorite) {
    rebuildList = true;
  }

  for (let x of Object.keys(update)) {
    // @ts-ignore
    state[x] = update[x];
  }

  if (rebuildList) {
    setTimeout(async () => {
      let photos = await loadPhotoList(state.currentListId, (x: AlbumPhoto) => {
        if (state.filterFavorite === 'favorite' && x.favorite <= 0) {
          return false;
        }
        else if (state.filterFavorite === 'rejected' && x.favorite >= 0) {
          return false;
        }

        return true;
      });

      // @ts-ignore
      state.currentList = photos;
      stateChanged.invoke();
    })
  } else {
    stateChanged.invoke();
  }
}

