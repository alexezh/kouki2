import { CSSProperties, PropsWithChildren, useEffect, useRef, useState } from "react";
import { AlbumRow, RowKind } from "./AlbumPhoto";
import { addOnStateChanged, getAppState, removeOnStateChanged, updateState } from "../commands/AppState";
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
  let [version, setVersion] = useState(0);
  const ref = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    console.log("GridLayout: useEffect:" + getAppState().navList?.photoCount);

    // add listener to selection manager to track current
    let selectId = selectionManager.addOnSelectionChanged(() => {

      let rows = getAppState().navRows;

      console.log('Selection changed');

      if (listRef.current) {
        if (rows && rows.length > 0 && selectionManager.lastSelectedPhoto) {
          let idx = getAppState().navList.getRow(selectionManager.lastSelectedPhoto);
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
      let rows = getAppState().navRows;

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
      console.log('GridLayout: appstate');
      updateRows();
      setVersion(version + 1);
    });

    return () => {
      selectionManager.removeOnSelectionChanged(selectId);
      removeAnyCommandHandler(cmdId);
      removeOnStateChanged(stateId);
    }
  }, [props.width, ref]);

  function updateRows() {
    let app = getAppState();
    let rows = app.navRows;

    console.log('updateRows:' + rows?.length);

    // if rows were reset, 
    if (!rows) {
      rows = makeByMonthRows(getAppState().navList, props.width, photoPadding);
      updateState({ navRows: rows });

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
    let rows = getAppState().navRows;

    if (!rows || idx >= rows.length) {
      return 0;
    }

    let row = rows![idx];
    if (row.kind === RowKind.photos) {
      return rows![idx].height + rows![idx].padding * 2;
    } else if (row.kind === RowKind.month) {
      return getAppState().monthRowHeight + 10;
    } else {
      return getAppState().dayRowHeight + 10;
    }
  }

  function renderRow(props: ListChildComponentProps) {
    let rows = getAppState().navRows;

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

  // make sure we have rows if we render first time
  // or if state was reset
  updateRows();

  return (<List
    ref={listRef}
    style={props.style}
    height={props.height}
    width={props.width}
    itemCount={(getAppState().navRows) ? getAppState().navRows!.length : 0}
    itemSize={getRowHeight}
  >
    {renderRow}
  </List>);
}
