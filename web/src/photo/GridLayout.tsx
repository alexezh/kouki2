import { CSSProperties, MutableRefObject, useEffect, useRef, useState } from "react";
import { AlbumRow, PhotoListId, RowKind } from "./AlbumPhoto";
import { getAppState } from "../commands/AppState";
import { selectionManager } from "../commands/SelectionManager";
import { Command, addCommandHandler } from "../commands/Commands";
import { DateRowLayout, PhotoRowLayout } from "./RowLayout";
import { handleDateSelected, handlePhotoClick } from "./AlbumInput";
import { VariableSizeList as List, ListChildComponentProps } from 'react-window';
import { RowCollectionChangedArg } from "./RowCollection";
import { PhotoList } from "./PhotoList";

type GridAlbumProps = {
  style: CSSProperties,
  width: number,
  height: number
}

let scrollOffsets = new Map<string, number>();

function saveGridLayoutScrollOffset(id: PhotoListId | undefined, offset: number | undefined) {
  if (!id) {
    return;
  }
  if (offset === undefined) {
    return;
  }

  scrollOffsets.set(id.toString(), offset);
}

function getGridLayoutScrollOffset(id: PhotoListId | undefined): number {
  if (!id) {
    return 0;
  }

  let offset = scrollOffsets.get(id.toString());
  return offset ?? 0;
}


export function GridLayout(props: GridAlbumProps) {
  let [version, setVersion] = useState(getAppState().navRows.version);
  const ref = useRef(null);
  const listRef = useRef(null);
  const photoListRef = useRef<PhotoList>(getAppState().navRows.photoList) as MutableRefObject<PhotoList>;

  getAppState().navRows.setRowWidth(props.width);

  useEffect(() => {
    console.log("GridLayout: useEffect:" + getAppState().navList?.photoCount);

    // add listener to selection manager to track current
    let selectId = selectionManager.addOnSelectionChanged(() => {

      console.log('Selection changed');

      if (listRef.current) {
        if (selectionManager.lastSelectedPhoto) {
          let idx = getAppState().navRows.getRowByPhoto(selectionManager.lastSelectedPhoto);
          console.log("ScrollSelect to " + idx);
          if (idx !== -1) {
            // @ts-ignore
            listRef.current.scrollToItem(idx, "start");
          }
        }
      }
    });

    // add listener to commands
    let cmdId1 = addCommandHandler(Command.ScrollAlbumToDate, (dt: { year: number, month: number }) => {
      let rows = getAppState().navRows;

      if (listRef.current) {
        if (rows) {
          let idx = rows.findIndex((row: AlbumRow) => row.dt &&
            (dt.year >= row.dt!.getFullYear() && dt.month >= row.dt!.getMonth()))
          console.log("ScrollAlbum to " + idx);
          if (idx >= 0) {
            // @ts-ignore
            listRef.current.scrollToItem(idx, "start");
          }
        }
      }
    });

    let cmdId2 = addCommandHandler(Command.SetFocusAlbum, () => {
      if (ref.current) {
        // @ts-ignore
        ref.current.focus();
      }
    });


    // add listener for state changes
    let rowsId = getAppState().navRows.addOnChanged((arg: RowCollectionChangedArg) => {
      // update layout when we navigate
      if (listRef.current) {
        console.log("GridLayout: rows changed " + arg.invalidatePos);
        if (arg.invalidatePos !== undefined) {
          // @ts-ignore
          listRef.current.resetAfterIndex(arg.invalidatePos);
        }
        if (arg.kind === "load") {
          // @ts-ignore
          let currentOffset = listRef.current.state.scrollOffset;

          saveGridLayoutScrollOffset(photoListRef.current?.id, currentOffset);

          let offset = getGridLayoutScrollOffset(arg.list?.id);

          // @ts-ignore
          listRef.current.scrollTo(offset, "start");
        }
      }
      photoListRef.current = arg.list!;
      setVersion(getAppState().navRows.version);
    });

    return () => {
      selectionManager.removeOnSelectionChanged(selectId);
      cmdId1();
      cmdId2();
      getAppState().navRows.removeOnChanged(rowsId);
    }
  }, [props.width, ref]);

  function getRowHeight(idx: number): number {
    let rows = getAppState().navRows;

    let row = rows.getRow(idx);
    if (!row) {
      return 0;
    }
    if (row.kind === RowKind.photos) {
      return row.height + row.padding * 2;
    } else if (row.kind === RowKind.month) {
      return getAppState().monthRowHeight + 10;
    } else {
      return getAppState().dayRowHeight + 10;
    }
  }

  function renderRow(props: ListChildComponentProps): JSX.Element | null {
    let rows = getAppState().navRows;

    if (!rows) {
      return null;
    }

    let row = rows.getRow(props.index);
    if (!row) {
      return null;
    }
    if (row.kind !== RowKind.photos) {
      return (
        <DateRowLayout
          key={row.key}
          style={props.style}
          row={row}
          onSelected={handleDateSelected}
          selected={false} />
      )
    } else {
      return (
        <PhotoRowLayout
          key={row.key}
          style={props.style}
          row={row}
          onClick={handlePhotoClick}></PhotoRowLayout >
      )
    }
  }

  console.log('render grid:' + getAppState().navRows?.getRowCount());

  return (<List
    ref={listRef}
    className="Album-layout-grid"
    style={props.style}
    height={props.height}
    width={props.width}
    itemCount={(getAppState().navRows) ? getAppState().navRows!.getRowCount() : 0}
    itemSize={getRowHeight}
  >
    {renderRow}
  </List>);
}
