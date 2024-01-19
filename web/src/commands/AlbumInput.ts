import { Command, ViewMode, getState, invokeCommand, updateState } from "./AppState";
import { selectionManager } from "./SelectionManager";
import { isEqualDay, isEqualMonth } from "../lib/date";
import { AlbumPhoto, AlbumRow, RowKind } from "../photo/AlbumPhoto";
import { addQuickCollection } from "../photo/CollectionStore";
import { PhotoListPos } from "../photo/PhotoList";

export function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
  let viewMode = getState().viewMode;
  let list = getState().currentList;

  if (event.key === 'Escape') {
    if (viewMode !== ViewMode.grid) {
      updateState({ viewMode: ViewMode.grid });
    }
    event.preventDefault();
  } else {
    if (!getState().currentList || !selectionManager.lastSelectedPhoto) {
      return;
    }

    switch (event.key) {
      case 'Enter': {
        if (viewMode === ViewMode.grid) {
          updateState({ viewMode: ViewMode.zoom });
        }
        break;
      }
      case 'ArrowLeft': {
        let pos = list.getPrev(selectionManager.lastSelectedPhoto);
        if (pos !== -1) {
          if (event.shiftKey) {
            selectionManager.add([list.getItem(pos)]);
          } else {
            selectionManager.reset([list.getItem(pos)]);
          }
        }
        break;
      }
      case 'ArrowRight': {
        let pos = list.getNext(selectionManager.lastSelectedPhoto);
        if (pos !== -1) {
          if (event.shiftKey) {
            selectionManager.add([list.getItem(pos)]);
          } else {
            selectionManager.reset([list.getItem(pos)]);
          }
        }
        break;
      }
      case 'ArrowUp': {
        let curRowIdx = list.getRow(selectionManager.lastSelectedPhoto!);

        // scan photos and find one on next row
        // since we are scannot up, this will be last photo in the row;
        // but we want first, so keep scanning until we find prev row
        let prevRowEnd = list.findReverse(list.findPhotoPos(selectionManager.lastSelectedPhoto), (x: AlbumPhoto) => {
          return (list.getRow(x) !== curRowIdx);
        });

        let prevRowBegin = list.findStartRowPos(prevRowEnd);
        if (prevRowBegin === -1) {
          return;
        }

        selectionManager.reset([list.getItem(prevRowBegin)]);
        return;
      }
      case 'ArrowDown': {
        let curRowIdx = list.getRow(selectionManager.lastSelectedPhoto);

        let nextRowBegin = list.find(list.findPhotoPos(selectionManager.lastSelectedPhoto), (x: AlbumPhoto) => {
          return (list.getRow(x) !== curRowIdx);
        });
        if (nextRowBegin === -1) {
          return;
        }
        selectionManager.reset([list.getItem(nextRowBegin)]);
        return;
      }
      case 'k':
        invokeCommand(Command.AddStack);
        break;
      case 'p':
        invokeCommand(Command.MarkFavorite);
        break;
      case 'x':
        invokeCommand(Command.MarkRejected);
        break;
      case 'b':
        addQuickCollection([...selectionManager.items.values()]);
        break;
    }
  }
}

class MouseController {
  private lastClick: number = -1;

  /**
   * return true if double click
   */
  public onClick(event: React.MouseEvent<HTMLImageElement>): boolean {
    if (this.lastClick + 300 > event.timeStamp) {
      this.lastClick = -1;
      return true;
    } else {
      this.lastClick = event.timeStamp;
      return false;
    }
  }
}


let mouseController = new MouseController();

export function handlePhotoClick(event: React.MouseEvent<HTMLImageElement>, photo: AlbumPhoto) {
  if (mouseController.onClick(event)) {
    selectionManager.reset([photo]);
    if (getState().viewMode === ViewMode.grid && photo.hasStack) {
      updateState({ viewMode: ViewMode.stripe });
    } else {
      updateState({ viewMode: ViewMode.zoom });
    }
    event.preventDefault();
  } else {
    if (!(event.shiftKey || event.ctrlKey)) {
      selectionManager.clear();
    }
    if (event.shiftKey) {
      let list = getState().currentList;
      let idxLastSelected = list.findPhotoPos(selectionManager.lastSelectedPhoto);
      let idxPhoto = list.findPhotoPos(photo);

      if (idxLastSelected !== -1 && idxPhoto !== -1) {
        let range = (idxLastSelected > idxPhoto) ? list.slice(idxPhoto, idxLastSelected) : list.slice(idxLastSelected, idxPhoto);
        selectionManager.add(range);
      } else {
        selectionManager.add([photo]);
      }
    } else {
      selectionManager.add([photo]);
    }
    event.preventDefault();
  }
}

export function handleDateSelected(val: boolean, row: AlbumRow) {
  let filtered = (row.kind === RowKind.month) ?
    getState().currentList.where((x: AlbumPhoto) => {
      return isEqualMonth(x.originalDate, row.dt!);
    })
    : getState().currentList.where((x: AlbumPhoto) => {
      return isEqualDay(x.originalDate, row.dt!);
    });
  selectionManager.clear();
  if (val) {
    selectionManager.add(filtered);
  }
}

