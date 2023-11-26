import { useEffect, useState } from 'react';
import './App.css';
import PhotoAlbum, { Photo } from 'react-photo-album';
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Lightbox from "yet-another-react-lightbox";
import { loadPhotos } from './PhotoStore';
import "yet-another-react-lightbox/styles.css";
import { Sidebar, Menu, MenuItem, SubMenu } from 'react-pro-sidebar';

/*
const photos = [
  { src: "/api/photolibrary/getimage/11", width: 800, height: 600 },
  { src: "/api/photolibrary/getimage/image2.jpg", width: 1600, height: 900 },
];
*/

function onFolders() {

}

function onDevice() {

}

function onAlbums() {

}

function onQuickCollection() {

}

function App() {
  const [photos, setPhotos] = useState([] as Photo[]);
  const [selectedPhoto, setSelectedPhoto] = useState(-1);

  useEffect(() => {
    setTimeout(async () => {
      let photos = await loadPhotos();
      setPhotos(photos);
    });
    return () => {
      console.log('detach');
    };
  }, []);

  return (
    <div className="App">
      <div className="AppCanvas">
        <Sidebar className='Sidebar'>
          <Menu>
            <MenuItem onClick={onFolders}>Folders</MenuItem>
            <MenuItem onClick={onQuickCollection}>Quick Collection</MenuItem>
            <MenuItem onClick={onAlbums}>Albums</MenuItem>
            <SubMenu label="Devices">
              <MenuItem onClick={onDevice}>Ezh14</MenuItem>
            </SubMenu>
          </Menu>
        </Sidebar>
        <div className="Gallery">
          <PhotoAlbum layout="rows" photos={photos} onClick={({ index }) => setSelectedPhoto(index)} />
        </div>
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
