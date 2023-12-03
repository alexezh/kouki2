import { CSSProperties, useEffect, useState } from "react";
import { VariableSizeList as List, ListChildComponentProps } from 'react-window';
import { AlbumPhoto, AlbumRow, makeRows } from "./PhotoStore";
import { PhotoLayout } from "./PhotoLayout";
import { PhotoRowLayout } from "./PhotoRowLayout";

export function PhotoAlbum({ photos, width, height }: { photos: AlbumPhoto[], width: number, height: number }) {
  const [rows, setRows] = useState([] as AlbumRow[]);

  useEffect(() => {
    setRows(makeRows(photos, 200, width, 5));
  }, [photos, width]);

  function getItemSize(idx: number) {
    return rows[idx].height;
  }

  // const renderRow = memo((props: ListChildComponentProps) => {
  //   return (
  //     <RowLayout row={rows[props.index]}></RowLayout>
  //   )
  // }, areEqual)
  function renderRow(props: ListChildComponentProps) {
    return (
      <PhotoRowLayout style={props.style} row={rows[props.index]}></PhotoRowLayout>
    )
  }

  return (
    <List
      height={height}
      itemCount={rows.length}
      itemSize={getItemSize}
      width={width}
    >
      {renderRow}
    </List>);
}
