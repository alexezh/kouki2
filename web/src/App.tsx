import { CSSProperties, useEffect, useLayoutEffect, useState } from 'react';
import './App.css';
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Lightbox from "yet-another-react-lightbox";
import { AlbumPhoto, loadCollection, loadFolders, loadFolder } from './PhotoStore';
import "yet-another-react-lightbox/styles.css";
import { WireFolder, WirePhotoEntry } from './lib/fetchadapter';
import AutoSizer from "react-virtualized-auto-sizer";
import { PhotoAlbum } from './PhotoAlbum';
import { CommandBar } from './CommandBar';
import Drawer from '@mui/material/Drawer/Drawer';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { NavigationBar } from './NatigationBar';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

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
  const [photos, setPhotos] = useState([] as AlbumPhoto[]);
  const [selectedPhoto, setSelectedPhoto] = useState(-1);
  const [view, setView] = useState(new ViewDesc(CanvasViewKind.Folder));

  const drawerWidth = 240;

  interface Props {
    /**
     * Injected by the documentation to work in an iframe.
     * Remove this when copying and pasting into your project.
     */
    window?: () => Window;
  }

  function renderWorkspace(photos: AlbumPhoto[]) {
    // if (view.kind === CanvasViewKind.Folder) {
    //   return (<PhotoAlbum layout="rows" photos={photos} onClick={({ index }) => setSelectedPhoto(index)} />);
    // } else {
    //   return (<PhotoAlbum layout="rows" photos={photos} onClick={({ index }) => setSelectedPhoto(index)} />);
    // }

    // UI
    return (
      <div className="Workspace">
        <AutoSizer>
          {({ width, height }: { width: number, height: number }) => {
            return (<PhotoAlbum photos={photos} width={width} height={height}></PhotoAlbum>)
          }}
        </AutoSizer>
      </div>);
  }

  // function renderFolders() {
  //   let items = [];
  //   for (let x of folders) {
  //     items.push(<MenuItem className='FolderItem' key={'folder_' + x.id} onClick={() => onFolder(setPhotos, x)}>{x.path}</MenuItem>);
  //   }
  //   return items;
  // }

  let appStyle = {
    'width': size[0], 'height': size[1]
  } as CSSProperties;

  const container = window !== undefined ? () => document.body : undefined;

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="App" style={appStyle} >
        <div className="AppCanvas">
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
            open
          >
            <NavigationBar setPhotos={setPhotos} />
          </Drawer>

          <CommandBar></CommandBar>
          {renderWorkspace(photos)}
        </div>
      </div >
    </ThemeProvider>
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
