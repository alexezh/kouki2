import { CSSProperties, useEffect, useLayoutEffect, useState } from 'react';
import './App.css';
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Lightbox from "yet-another-react-lightbox";
import { loadFolders, loadPhotos } from './PhotoStore';
import "yet-another-react-lightbox/styles.css";
import { Sidebar, Menu, MenuItem, SubMenu } from 'react-pro-sidebar';
import { WireFolder, WirePhotoEntry } from './lib/fetchadapter';
import AutoSizer, { HeightAndWidthProps, HorizontalSize, Size, VerticalSize } from "react-virtualized-auto-sizer";
import { PhotoAlbum } from './PhotoAlbum';

/*
const photos = [
  { src: "/api/photolibrary/getimage/11", width: 800, height: 600 },
  { src: "/api/photolibrary/getimage/image2.jpg", width: 1600, height: 900 },
];
*/

enum CanvasViewKind {
  Folder,
  Album,
  Collection,
  Device
}

class ViewDesc {
  public kind: CanvasViewKind;
  public constructor(kind: CanvasViewKind) {
    this.kind = kind;
  }
}

function useWindowSize() {
  const [size, setSize] = useState([0, 0]);
  useLayoutEffect(() => {
    function updateSize() {
      setSize([window.innerWidth, window.innerHeight]);
    }
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  return size;
}

function App() {
  const size = useWindowSize();
  const [photos, setPhotos] = useState([] as WirePhotoEntry[]);
  const [folders, setFolders] = useState([] as WireFolder[]);
  const [selectedPhoto, setSelectedPhoto] = useState(-1);
  const [view, setView] = useState(new ViewDesc(CanvasViewKind.Folder));

  useEffect(() => {
    setTimeout(async () => {
      let folders = await loadFolders();
      setFolders(folders);

      if (folders.length > 0) {
        let photos = await loadPhotos(folders[1].id);
        setPhotos(photos);
      }
    });
    // return () => {
    //   console.log('detach');
    // };
  }, []);

  async function onFolder(folder: WireFolder) {
    let photos = await loadPhotos(folder.id);
    setPhotos(photos);
    //setView(new ViewDesc(CanvasViewKind.Folder));
  }

  function onDevice() {
    setView(new ViewDesc(CanvasViewKind.Device));
  }

  function onAlbums() {
    setView(new ViewDesc(CanvasViewKind.Album));
  }

  function onQuickCollection() {
    setView(new ViewDesc(CanvasViewKind.Collection));
  }

  function renderCanvas(photos: WirePhotoEntry[]) {
    // if (view.kind === CanvasViewKind.Folder) {
    //   return (<PhotoAlbum layout="rows" photos={photos} onClick={({ index }) => setSelectedPhoto(index)} />);
    // } else {
    //   return (<PhotoAlbum layout="rows" photos={photos} onClick={({ index }) => setSelectedPhoto(index)} />);
    // }

    // UI
    return (
      <AutoSizer>
        {({ width, height }: { width: number, height: number }) => {
          return (<PhotoAlbum photos={photos} width={width} height={height}></PhotoAlbum>)
        }}
      </AutoSizer>);
  }

  function renderFolders() {
    let items = [];
    for (let x of folders) {
      items.push(<MenuItem className='FolderItem' key={'folder_' + x.id} onClick={() => onFolder(x)}>{x.path}</MenuItem>);
    }
    return items;
  }

  let appStyle = {
    'width': size[0], 'height': size[1]
  } as CSSProperties;

  let canvasStyle = {
    'textAlign': 'left',
    'display': 'grid',
    'gridTemplateColumns': '200px auto',
    'width': '100%',
    'height': '100%'
  } as CSSProperties;

  let sidebarStyle = {
    'width': '200px',
    'gridColumn': 1,
    'gridRow': 1,
  }

  return (
    <div className="App" style={appStyle} >
      <div style={canvasStyle}>
        <Sidebar style={sidebarStyle}>
          <Menu>
            <SubMenu label="Folders">
              {renderFolders()}
            </SubMenu>
            <SubMenu label="Collections">
              <MenuItem onClick={onQuickCollection}>Quick</MenuItem>
              <MenuItem onClick={onQuickCollection}>Duplicate</MenuItem>
              <MenuItem onClick={onQuickCollection}>Favorite</MenuItem>
            </SubMenu>
            <MenuItem onClick={onAlbums}>Albums</MenuItem>
            <SubMenu label="Devices">
              <MenuItem onClick={onDevice}>Ezh14</MenuItem>
            </SubMenu>
          </Menu>
        </Sidebar>
        {renderCanvas(photos)}
      </div>
    </div >
  );
}

export default App;

// {/* <Lightbox
// slides={photos}
// open={selectedPhoto >= 0}
// index={selectedPhoto}
// close={() => setSelectedPhoto(-1)}
// // enable optional lightbox plugins
// plugins={[Fullscreen, Slideshow, Thumbnails, Zoom]}
// /> */}
