import { CSSProperties, useEffect, useState } from "react";
import { VariableSizeList as List, ListChildComponentProps } from 'react-window';
import { AlbumPhoto, AlbumRow, makeRows, selectionManager } from "./PhotoStore";
import { PhotoRowLayout } from "./PhotoRowLayout";

type PhotoAlbumProps = {
  photos: AlbumPhoto[],
  width: number,
  height: number
}

export function PhotoAlbum(props: PhotoAlbumProps) {
  const [rows, setRows] = useState([] as AlbumRow[]);

  useEffect(() => {
    setRows(makeRows(props.photos, 200, props.width, 5));
  }, [props.photos, props.width]);

  function getItemSize(idx: number) {
    return rows[idx].height;
  }

  function handlePhotoSelected(event: React.MouseEvent<HTMLImageElement>, photo: AlbumPhoto) {
    let selected = selectionManager.isSelected(photo);
    let index = props.photos.findIndex((x) => x === photo);
    if (index === -1) {
      return;
    }

    if (event.shiftKey && selectionManager.lastIndex !== -1) {
      let batch: AlbumPhoto[] = [];
      if (selectionManager.lastIndex > index) {
        for (let i = index; i < selectionManager.lastIndex; i++) {
          batch.push(props.photos[i])
        }
      } else {
        for (let i = index; i > selectionManager.lastIndex; i--) {
          batch.push(props.photos[i])
        }
      }
      if (!selected) {
        selectionManager.add(batch);
      } else {
        selectionManager.remove(batch);
      }
    } else {
      if (!selected) {
        selectionManager.clear();
        selectionManager.add([photo]);
      } else {
        selectionManager.remove([photo]);
      }
    }

    selectionManager.lastIndex = index;
  }

  // const renderRow = memo((props: ListChildComponentProps) => {
  //   return (
  //     <RowLayout row={rows[props.index]}></RowLayout>
  //   )
  // }, areEqual)
  function renderRow(props: ListChildComponentProps) {
    return (
      <PhotoRowLayout style={props.style} row={rows[props.index]} onClick={handlePhotoSelected} onSelected={handlePhotoSelected}></PhotoRowLayout >
    )
  }

  return (
    <List
      height={props.height}
      itemCount={rows.length}
      itemSize={getItemSize}
      width={props.width}
    >
      {renderRow}
    </List>);
}
