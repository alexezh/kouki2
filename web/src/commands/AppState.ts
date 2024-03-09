import { AlbumPhoto, AlbumRow, PhotoListId } from "../photo/AlbumPhoto";
import { SimpleEventSource } from "../lib/synceventsource";
import { selectionManager } from "./SelectionManager";
import { FilterFavorite, PhotoList } from "../photo/PhotoList";
import { loadPhotoList } from "../photo/LoadPhotoList";
import { getPhotoById, getStack, getStartDt } from "../photo/PhotoStore";
import { StaticPhotoSource } from "../photo/FolderStore";
import { CollectionId } from "../photo/CollectionStore";
import { RowCollection } from "../photo/RowCollection";
import { wireTextSearch } from "../lib/photoclient";

/**
 * general note. react useEffect/useState should only be used to manage state related to UI
 * such as lambdas useEffect should not access variables defined by useState. 
 * 
 * AppState provides functionality similar to Rebux: data storage which maintains actual UI state
 */
export interface IAppState {
  readonly version: number;
  readonly viewMode: ViewMode;
  readonly navListId: PhotoListId;
  /**
   * list user navigated to
   * normally the same as workList but can be different for stacks
   */
  readonly navList: PhotoList;

  /**
   * list displayed in UI. Can be a stack
   */
  readonly workList: PhotoList;
  readonly filterFavorite: FilterFavorite;
  readonly filterDups: boolean;
  readonly filterStars: number;
  readonly years: YearEntry[];
  readonly viewDate?: { year: number, month: number };

  /**
   * rows displayed by nav
   */
  readonly navRows: RowCollection;

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
  navRows?: AlbumRow[];
  viewDate?: { year: number, month: number }
  dayRowHeight?: number;
  monthRowHeight?: number;
}

export type MonthEntry = {
  month: string;
}

export class YearEntry {
  lessThen: boolean = false;
  year: number;
  months: number[] = [];

  public constructor(year: number) {
    this.year = year;
  }

  public toString() {
    return (this.lessThen) ? "<" + this.year.toString() : this.year.toString();
  }
}

export enum ViewMode {
  measure,
  grid,
  stripe,
  zoom
}

let list = new PhotoList(new PhotoListId('unknown', 0 as CollectionId), new StaticPhotoSource([]));

class AppState implements IAppState {
  // change id from List.onChange
  version: number = 1;
  listChangeId: number = 0;
  viewMode: ViewMode = ViewMode.measure;
  navListId = new PhotoListId("unknown", 0 as CollectionId);
  navRows = new RowCollection();
  navList = list;
  workList = list;
  filterFavorite: FilterFavorite = "all";
  filterDups = false;
  filterStars = 0;
  years: YearEntry[] = [];
  dayRowHeight = 0;
  monthRowHeight = 0;
}
let state = new AppState();

let initialized = false;
let stateChanged = new SimpleEventSource<void>();

export function addOnStateChanged(func: () => void): number {
  return stateChanged.add(func);
}

export function removeOnStateChanged(id: number) {
  stateChanged.remove(id);
}

export function getAppState(): IAppState {
  return state;
}

export function updateAppState(update: AppStateUpdate) {
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

  if (state.navList) {
    state.navList.source.setAppFilter(update);
  }

  // update our internal state
  for (let x of Object.keys(update)) {
    // @ts-ignore
    state[x] = update[x];
  }

  state.version++;

  if (rebuildList) {
    setTimeout(async () => {
      let photos: PhotoList = loadPhotoList(state.navListId);

      if (state.navList) {
        state.navList.removeOnListChanged(state.listChangeId);
      }

      // set both work and nav list
      state.navList = photos;
      state.workList = photos;
      selectionManager.setList(photos);
      state.listChangeId = state.navList.addOnListChanged(() => {
        console.log('Update current collection: ' + state.navList.photoCount);
        // reset rows so layout code can regenerate
        if (!photos.filtered) {
          state.years = buildYears(photos);
        } else {
          state.years = [];
        }
        stateChanged.invoke();
      });

      if (!photos.filtered) {
        state.years = buildYears(photos);
      } else {
        state.years = [];
      }
      state.navRows.load(state.navList);
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
        year = new YearEntry(yearVal);
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

    // if start date set, make entry
    if (getStartDt()) {
      years.push({ lessThen: true, year: getStartDt()!.getFullYear(), months: [] });
    }

    return years;
  }
  catch (e) {
    throw e;
  }
}

export function openPhotoStack(photo: AlbumPhoto) {
  let photos: AlbumPhoto[] = [];

  if (photo.stackId) {
    let stack = getStack(photo.stackId);
    for (let id of stack!) {
      let sp = getPhotoById(id);
      photos.push(sp);
    }
  }

  let list = new PhotoList(new PhotoListId('stack', 0 as CollectionId), new StaticPhotoSource(photos));

  updateAppState({ workList: list, viewMode: ViewMode.stripe });
}

export function closePhotoStack() {
  updateAppState({ workList: getAppState().navList, viewMode: ViewMode.grid });
}

export async function setTextFilter(val: string): Promise<void> {
  try {
    if (val && val.length > 0) {
      let id = getAppState().navList.id;
      let items = await wireTextSearch({
        collKind: id.kind,
        collId: id.id,
        search: val,
        startDt: getStartDt()?.toISOString()
      });
      getAppState().navList.setFilteredItems(items);
    } else {
      getAppState().navList.resetFilteredItems();
    }
  }
  catch (e: any) {
    console.log('setTextFilter: failed ' + e.toString());
  }
}

