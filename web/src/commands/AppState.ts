import { AlbumPhoto, AlbumRow, PhotoListId } from "../photo/AlbumPhoto";
import { SimpleEventSource } from "../lib/synceventsource";
import { selectionManager } from "./SelectionManager";
import { PhotoList } from "../photo/PhotoList";
import { loadPhotoList } from "../photo/LoadPhotoList";
import { getPhotoById } from "../photo/PhotoStore";

export type FilterFavorite = "all" | "favorite" | "rejected";

export interface AppState {
  readonly viewMode: ViewMode;
  readonly navListId: PhotoListId;
  // list user navigated to
  // normally the same as workList but can be different for stacks
  readonly navList: PhotoList;
  readonly workList: PhotoList;
  readonly filterFavorite: FilterFavorite;
  readonly filterDups: boolean;
  readonly filterStars: number;
  readonly rows: AlbumRow[] | null;
  readonly years: YearEntry[];
  readonly viewDate?: { year: number, month: number };

  readonly dayRowHeight: number;
  readonly monthRowHeight: number;
}

export type AppStateUpdate = {
  viewMode?: ViewMode;
  navListId?: PhotoListId;
  workList?: PhotoList;
  filterFavorite?: FilterFavorite;
  filterDups?: boolean;
  filterStars?: number;
  rows?: AlbumRow[];
  viewDate?: { year: number, month: number }
  dayRowHeight?: number;
  monthRowHeight?: number;
}

export type MonthEntry = {
  month: string;
}

export type YearEntry = {
  year: number;
  months: number[];
}

export enum ViewMode {
  measure,
  grid,
  stripe,
  zoom
}

let list = new PhotoList(new PhotoListId('unknown', 0), () => Promise.resolve([]));
let state: AppState & {
  // change id from List.onChange
  listChangeId: number
} = {
  viewMode: ViewMode.measure,
  navListId: new PhotoListId("unknown", 0),
  navList: list,
  workList: list,
  listChangeId: 0,
  filterFavorite: "all",
  filterDups: false,
  filterStars: 0,
  rows: null,
  years: [],
  dayRowHeight: 0,
  monthRowHeight: 0
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

  if (update.navListId) {
    console.log("set folder id:" + update.navListId);
  }
  if (update.navListId && state.navListId !== update.navListId) {
    rebuildList = true;
  }

  if (update.filterFavorite && state.filterFavorite !== update.filterFavorite) {
    rebuildList = true;
  }

  if (update.filterDups !== undefined && state.filterDups !== update.filterDups) {
    rebuildList = true;
  }

  for (let x of Object.keys(update)) {
    // @ts-ignore
    state[x] = update[x];
  }

  if (rebuildList) {
    setTimeout(async () => {
      let photos: PhotoList = loadPhotoList(state.navListId);

      photos.setFilter((x: AlbumPhoto) => {
        if (state.filterFavorite === 'favorite' && x.favorite <= 0) {
          return false;
        }
        else if (state.filterFavorite === 'rejected' && x.favorite >= 0) {
          return false;
        }

        if (state.filterDups && x.similarId === 0) {
          return false;
        }

        return true;
      });

      if (state.navList) {
        state.navList.removeOnChanged(state.listChangeId);
      }

      // set both work and nav list
      (state as any).navList = photos;
      (state as any).workList = photos;
      state.listChangeId = state.navList.addOnChanged(() => {
        console.log('Update current collection: ' + state.navList.photoCount);
        // reset rows so layout code can regenerate
        (state as any).years = buildYears(photos);
        (state as any).rows = null;
        stateChanged.invoke();
      });

      (state as any).years = buildYears(photos);
      (state as any).rows = null;
      selectionManager.clear();
      stateChanged.invoke();
    })
  } else {
    stateChanged.invoke();
  }
}

function buildYears(photos: PhotoList): YearEntry[] {
  try {
    let years: YearEntry[] = [];
    let yearMap = new Map<number, YearEntry>();

    // use months as index
    for (let photo of photos.photos()) {
      let month = photo.originalDate.getMonth();
      let yearVal = photo.originalDate.getFullYear();
      let year = yearMap.get(yearVal);
      if (!year) {
        year = { year: yearVal, months: [] }
        yearMap.set(yearVal, year);
      }
      year.months[month] = 1;
    }

    years = [...yearMap.values()];
    years.sort((x: YearEntry, y: YearEntry) => Math.sign(y.year - x.year));

    // update months to actual numbers
    for (let year of years) {
      let months: number[] = [];
      for (let idx = year.months.length; idx >= 0; idx--) {
        if (year.months[idx]) {
          months.push(idx);
        }
      }
      year.months = months;
    }

    return years;
  }
  catch (e) {
    throw e;
  }
}

export function openPhotoStack(photo: AlbumPhoto) {
  let photos: AlbumPhoto[] = [];
  photos.push(photo);
  if (photo.stack) {
    for (let id of photo.stack!) {
      let sp = getPhotoById(id);
      if (!sp) {
        console.log('cannot find photo ' + id);
        continue;
      }
      photos.push(sp);
    }
  }

  let list = new PhotoList(new PhotoListId('runtime', 1), photos, false);

  updateState({ workList: list, viewMode: ViewMode.stripe });
}

export function closePhotoStack() {
  updateState({ workList: getState().navList, viewMode: ViewMode.grid });
}