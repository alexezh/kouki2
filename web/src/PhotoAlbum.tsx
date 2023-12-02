import { CSSProperties, useEffect, useState } from "react";
import { VariableSizeList as List, ListChildComponentProps } from 'react-window';
import { AlbumPhoto, AlbumRow, makeRows } from "./PhotoStore";

type PhotoPropTypes = {
  key: string;
  index: number;
  onClick?: (event: React.MouseEvent<HTMLImageElement>, photo: AlbumPhoto, index: number) => void;
  photo: AlbumPhoto;
  margin: number;
  selected: boolean;
};

const imgWithClick = { cursor: 'pointer' };

function PhotoLayout(props: PhotoPropTypes) {
  let [selected, setSelected] = useState(props.selected);

  useEffect(() => {
    let id = props.photo.addOnSelected((x) => setSelected(x.selected))
    return () => {
      props.photo.removeOnSelected(id);
    }
  })

  const handleClick = (event: React.MouseEvent<HTMLImageElement>) => {
    if (props.onClick) {
      props.onClick(event, props.photo, props.index);
    }
  };

  const handleSelect = (event: React.MouseEvent<HTMLImageElement>) => {
    // change selected on photo which will trigger selected event
    props.photo.selected = !props.photo.selected;
  };

  let divStyle: CSSProperties = {
    width: props.photo.width * props.photo.scale,
    height: props.photo.height * props.photo.scale,
    display: 'block',
    position: 'relative'
  }

  const imgStyle: CSSProperties = {
    margin: props.margin,
    display: 'block',
    position: 'absolute',
    zIndex: 0
  };

  let checkStyle: CSSProperties = {
    position: 'absolute',
    left: 5,
    top: 5,
    zIndex: 1
  }

  return (
    <div style={divStyle} >
      <img
        style={checkStyle}
        width={20}
        height={20}
        src={(selected) ? './assets/checkbox-check.svg' : './assets/checkbox-unchecked.svg'}
        onClick={handleSelect}
      />
      <img
        style={props.onClick ? { ...imgStyle, ...imgWithClick } : imgStyle}
        width={props.photo.width * props.photo.scale}
        height={props.photo.height * props.photo.scale}
        src={props.photo.src}
        onClick={handleClick}
      />
    </div >
  );
};

// type PhotoPropType = {
//   key: string,
//   src: string;
//   width: number;
//   height: number,
//   title: string,
// };

export function RowLayout({ style, row }: { style: CSSProperties, row: AlbumRow }) {
  function onClick() {

  }
  function renderRow(row: AlbumRow) {
    let res = [];
    return row.photos.map((photo: AlbumPhoto, index: number) => {
      return (<PhotoLayout index={index} photo={photo} onClick={onClick} selected={false} margin={0} key={'photo_' + index}></PhotoLayout>)
    });
  }

  let rowStyle: React.CSSProperties = { ...style, display: 'flex', flexWrap: 'wrap', flexDirection: 'row' } as CSSProperties;

  return (
    <div style={rowStyle}>
      {renderRow(row)}
    </div>
  )
}

export function PhotoAlbum({ photos, width, height }: { photos: AlbumPhoto[], width: number, height: number }) {
  const [rows, setRows] = useState([] as AlbumRow[]);

  useEffect(() => {
    setRows(makeRows(photos, 200, width, 5));
  }, [photos]);

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
      <RowLayout style={props.style} row={rows[props.index]}></RowLayout>
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
