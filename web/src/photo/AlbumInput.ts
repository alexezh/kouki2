import { ViewMode, getAppState, openPhotoStack, updateAppState } from "../commands/AppState";
import { selectionManager } from "../commands/SelectionManager";
import { isEqualDay, isEqualMonth } from "../lib/date";
import { AlbumPhoto, AlbumRow, RowKind } from "./AlbumPhoto";
import { Command, invokeCommand } from "../commands/Commands";
import { ReactionKind } from "../lib/photoclient";

export function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
  let viewMode = getAppState().viewMode;
  let list = getAppState().workList;
  let navRows = getAppState().navRows;

  if (event.key === 'Escape') {
    invokeCommand(Command.NavigateBack);
    event.preventDefault();
  } else {
    if (!getAppState().workList || !selectionManager.lastSelectedPhoto) {
      return;
    }

    switch (event.key) {
      case 'Enter': {
        if (viewMode === ViewMode.grid) {
          updateAppState({ viewMode: ViewMode.zoom });
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
        let curRowIdx = navRows.getRowByPhoto(selectionManager.lastSelectedPhoto!);

        // scan photos and find one on next row
        // since we are scannot up, this will be last photo in the row;
        // but we want first, so keep scanning until we find prev row
        let prevRowEnd = list.findReverse(list.findPhotoPos(selectionManager.lastSelectedPhoto), (x: AlbumPhoto) => {
          return (navRows.getRowByPhoto(x) !== curRowIdx);
        });

        let prevRowBegin = navRows.findStartRowPos(prevRowEnd);
        if (prevRowBegin === -1) {
          return;
        }

        selectionManager.reset([list.getItem(prevRowBegin)]);
        return;
      }
      case 'ArrowDown': {
        let curRowIdx = navRows.getRowByPhoto(selectionManager.lastSelectedPhoto);

        let nextRowBegin = list.find(list.findPhotoPos(selectionManager.lastSelectedPhoto), (x: AlbumPhoto) => {
          return (navRows.getRowByPhoto(x) !== curRowIdx);
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
      case 'u':
        invokeCommand(Command.RemoveStack);
        break;
      case 'p':
        invokeCommand(Command.AddReaction, ReactionKind.ThumbsUp);
        break;
      case 'd':
        invokeCommand(Command.AddReaction, ReactionKind.ThumbsDown);
        break;
      case 'x':
        invokeCommand(Command.ClearReactions);
        break;
      case 'h':
        invokeCommand(Command.MarkHidden);
        break;
      case 'b':
        invokeCommand(Command.AddQuickCollection);
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
    if (getAppState().viewMode === ViewMode.grid && photo.hasStack) {
      console.log("handlePhotoClick: stack");
      openPhotoStack(photo);
    } else {
      console.log("handlePhotoClick: zoom");
      updateAppState({ viewMode: ViewMode.zoom });
    }
    event.preventDefault();
  } else {
    if (!(event.shiftKey || event.ctrlKey)) {
      selectionManager.clear();
    }
    if (event.shiftKey) {
      let list = getAppState().workList;
      let idxLastSelected = list.findPhotoPos(selectionManager.lastSelectedPhoto);
      let idxPhoto = list.findPhotoPos(photo);

      if (idxLastSelected !== -1 && idxPhoto !== -1) {
        let range = (idxLastSelected > idxPhoto) ? list.slice(idxPhoto, idxLastSelected) : list.slice(idxLastSelected, idxPhoto);
        selectionManager.add(range);
      } else {
        selectionManager.add([photo]);
      }
    } else {
      console.log("handleClick: select " + photo.id);
      selectionManager.add([photo]);
    }
    event.preventDefault();
  }
}

export function handleDateSelected(val: boolean, row: AlbumRow) {
  let filtered = (row.kind === RowKind.month) ?
    getAppState().workList.where((x: AlbumPhoto) => {
      return isEqualMonth(x.originalDate, row.dt!);
    })
    : getAppState().workList.where((x: AlbumPhoto) => {
      return isEqualDay(x.originalDate, row.dt!);
    });
  selectionManager.clear();
  if (val) {
    selectionManager.add(filtered);
  }
}

