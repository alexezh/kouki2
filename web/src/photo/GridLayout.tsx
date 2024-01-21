import { CSSProperties, PropsWithChildren, useEffect, useRef, useState } from "react";
import { AlbumRow, RowKind } from "./AlbumPhoto";
import { addOnStateChanged, getState, removeOnStateChanged, updateState } from "../commands/AppState";
import { selectionManager } from "../commands/SelectionManager";
import { Command, addAnyCommandHandler, removeAnyCommandHandler } from "../commands/Commands";
import { makeByMonthRows } from "./MakeRows";
import { photoPadding } from "./AlbumLayout";
import { DateRowLayout, PhotoRowLayout } from "./RowLayout";
import { handleDateSelected, handlePhotoClick } from "./AlbumInput";
import { VariableSizeList as List, ListChildComponentProps } from 'react-window';

type GridAlbumProps = {
  style: CSSProperties,
  width: number,
  height: number
}

export function GridLayout(props: GridAlbumProps) {
  // react-window has a bug with updates
  // it caches height of items for variable height based on function object
  // so we have to give it different function when photos change
  const [rows, setRows] = useState<AlbumRow[] | null>(getState().rows);
  // simple counter for refresh
  const ref = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    console.log("GridLayout: useEffect:" + getState().navList?.photoCount);

    // add listener to selection manager to track current
    let selectId = selectionManager.addOnSelectionChanged(() => {

      // if we are not selecting in current list, ignore
      // this feels strange. On one hand we have single selection manager
      //if(getState().workList !== getState().navList) {
      //  return;
      //}

      console.log('Selection changed');

      if (listRef.current) {
        if (rows && rows.length > 0 && selectionManager.lastSelectedPhoto) {
          let idx = getState().navList.getRow(selectionManager.lastSelectedPhoto);
          console.log("ScrollSelect to " + idx);
          if (idx !== -1) {
            // @ts-ignore
            listRef.current.scrollToItem(idx);
          }
        }
      }
    });

    // add listener to commands
    let cmdId = addAnyCommandHandler((cmd: Command, ...args: any[]) => {
      if (cmd == Command.ScrollAlbum) {
        if (listRef.current) {
          if (rows) {
            let dt = args[0] as { year: number, month: number };
            let idx = rows.findIndex((row: AlbumRow) => row.dt &&
              (dt.year >= row.dt!.getFullYear() && dt.month >= row.dt!.getMonth()))
            console.log("ScrollAlbum to " + idx);
            if (idx >= 0) {
              // @ts-ignore
              listRef.current.scrollToItem(idx);
            }
          }
        }
      } else if (cmd === Command.SetFocusAlbum) {
        if (ref.current) {
          // @ts-ignore
          ref.current.focus();
        }
      }
    });

    // add listener for state changes
    let stateId = addOnStateChanged(() => {
      updateRows();
    });

    return () => {
      selectionManager.removeOnSelectionChanged(selectId);
      removeAnyCommandHandler(cmdId);
      removeOnStateChanged(stateId);
    }
  }, [props.width, ref]);

  function updateRows() {
    let rows = getState().rows;
    if (!rows) {
      rows = makeByMonthRows(getState().navList, props.width, photoPadding);
      console.log('updateRows:' + rows.length);
      updateState({ rows: rows });

      setRows(rows);

      // update layout when we navigate
      if (listRef.current) {
        console.log("GridLayout.updateRows: reset scroll");
        // @ts-ignore
        listRef.current.resetAfterIndex(0);
        if (rows && rows.length > 0) {
          // @ts-ignore
          listRef.current.scrollToItem(0);
        }
      }
    }
  }

  function getRowHeight(idx: number): number {
    if (!rows || idx >= rows.length) {
      return 0;
    }

    let row = rows![idx];
    if (row.kind === RowKind.photos) {
      return rows![idx].height + rows![idx].padding * 2;
    } else if (row.kind === RowKind.month) {
      return getState().monthRowHeight + 10;
    } else {
      return getState().dayRowHeight + 10;
    }
  }

  function renderRow(props: ListChildComponentProps) {
    if (!rows) {
      return null;
    }

    let row = rows[props.index];
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

  updateRows();

  return (<List
    ref={listRef}
    style={props.style}
    height={props.height}
    width={props.width}
    itemCount={(rows) ? rows.length : 0}
    itemSize={getRowHeight}
  >
    {renderRow}
  </List>);
}
