import { useEffect, useState } from 'react';
import './App.css';
import PhotoAlbum, { Photo } from 'react-photo-album';
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Lightbox from "yet-another-react-lightbox";
import { loadFolders, loadPhotos } from './PhotoStore';
import "yet-another-react-lightbox/styles.css";
import { Sidebar, Menu, MenuItem, SubMenu } from 'react-pro-sidebar';
import { WireFolder } from './lib/fetchadapter';

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

function App() {
  const [photos, setPhotos] = useState([] as Photo[]);
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
    return () => {
      console.log('detach');
    };
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

  function renderCanvas() {
    if (view.kind === CanvasViewKind.Folder) {
      return (<PhotoAlbum layout="rows" photos={photos} onClick={({ index }) => setSelectedPhoto(index)} />);
    } else {
      return (<PhotoAlbum layout="rows" photos={photos} onClick={({ index }) => setSelectedPhoto(index)} />);
    }
  }

  function renderFolders() {
    let items = [];
    for (let x of folders) {
      items.push(<MenuItem className='FolderItem' key={'folder_' + x.id} onClick={() => onFolder(x)}>{x.path}</MenuItem>);
    }
    return items;
  }

  return (
    <div className="App">
      <div className="AppCanvas">
        <Sidebar className='Sidebar'>
          <Menu>
            <SubMenu label="Folders">
              {renderFolders()}
            </SubMenu>
            <MenuItem onClick={onQuickCollection}>Quick Collection</MenuItem>
            <MenuItem onClick={onAlbums}>Albums</MenuItem>
            <SubMenu label="Devices">
              <MenuItem onClick={onDevice}>Ezh14</MenuItem>
            </SubMenu>
          </Menu>
        </Sidebar>
        {renderCanvas()}
      </div>
      <Lightbox
        slides={photos}
        open={selectedPhoto >= 0}
        index={selectedPhoto}
        close={() => setSelectedPhoto(-1)}
        // enable optional lightbox plugins
        plugins={[Fullscreen, Slideshow, Thumbnails, Zoom]}
      />
    </div >
  );
}

export default App;
