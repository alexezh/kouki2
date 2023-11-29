import { useEffect, useState } from "react";
import { WirePhotoEntry } from "./lib/fetchadapter";
import { VariableSizeList as List, ListChildComponentProps } from 'react-window';
import { AlbumPhoto, AlbumRow, makeRows } from "./PhotoStore";

type PhotoPropTypes = {
  key: string;
  index: number;
  onClick?: (event: React.MouseEvent<HTMLImageElement>, photo: AlbumPhoto, index: number) => void;
  photo: AlbumPhoto;
  margin: number;
  top?: number;
  left?: number;
  direction?: string,
};

const imgWithClick = { cursor: 'pointer' };

function PhotoLayout(props: PhotoPropTypes) {
  const imgStyle = { margin: props.margin, display: 'block' };
  // if (direction === 'column') {
  //   imgStyle.position = 'absolute';
  //   imgStyle.left = left;
  //   imgStyle.top = top;
  // }

  const handleClick = (event: React.MouseEvent<HTMLImageElement>) => {
    if (props.onClick) {
      props.onClick(event, props.photo, props.index);
    }
  };

  return (
    <img
      key={props.key}
      style={props.onClick ? { ...imgStyle, ...imgWithClick } : imgStyle}
      width={props.photo.width * props.photo.scale}
      height={props.photo.width * props.photo.scale}
      src={props.photo.src}
      onClick={handleClick}
    />
  );
};

// type PhotoPropType = {
//   key: string,
//   src: string;
//   width: number;
//   height: number,
//   title: string,
// };

export function RowLayout({ row }: { row: AlbumRow }) {
  function onClick() {

  }
  function renderRow(row: AlbumRow) {
    let res = [];
    return row.photos.map((photo: AlbumPhoto, index: number) => {
      return (<PhotoLayout index={index} photo={photo} onClick={onClick} margin={0} key={'photo_' + index}></PhotoLayout>)
    });
  }
  return (
    <div>
      {renderRow(row)}
    </div>
  )
}

export function PhotoAlbum({ photos, width, height }: { photos: WirePhotoEntry[], width: number, height: number }) {
  const [rows, setRows] = useState([] as AlbumRow[]);

  useEffect(() => {
    setRows(makeRows(photos, 40, width, 5));
  }, [photos]);

  function getItemSize(idx: number) {
    return rows[idx].height;
  }

  function renderRow(props: ListChildComponentProps) {
    return (
      <RowLayout row={rows[props.index]}></RowLayout>
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
