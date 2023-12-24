// compute filler
// https://codepen.io/sosuke/pen/Pjoqqp

import { CSSProperties, useEffect, useLayoutEffect, useState } from 'react';
import './App.css';
import { AlbumPhoto, AlbumRow } from "./photo/AlbumPhoto";
import "yet-another-react-lightbox/styles.css";
import AutoSizer from "react-virtualized-auto-sizer";
import { PhotoAlbum } from './photo/AlbumLayout';
import { CommandBar } from './commands/CommandBar';
import Drawer from '@mui/material/Drawer/Drawer';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { NavigationBar } from './commands/NatigationBar';
import { StatusBar } from './commands/StatusBar';
import Typography from '@mui/material/Typography/Typography';
import { addOnStateChanged, getState, removeOnStateChanged } from './commands/AppState';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'

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

function renderWorkarea(photos: AlbumPhoto[]) {
  // if (view.kind === CanvasViewKind.Folder) {
  //   return (<PhotoAlbum layout="rows" photos={photos} onClick={({ index }) => setSelectedPhoto(index)} />);
  // } else {
  //   return (<PhotoAlbum layout="rows" photos={photos} onClick={({ index }) => setSelectedPhoto(index)} />);
  // }

  // UI
  return (
    <div className="Workarea">
      <AutoSizer>
        {({ width, height }: { width: number, height: number }) => {
          return (<PhotoAlbum photos={photos} width={width} height={height}></PhotoAlbum>)
        }}
      </AutoSizer>
    </div>);
}

function App() {
  const size = useWindowSize();
  const [photos, setPhotos] = useState([] as AlbumPhoto[]);

  useEffect(() => {
    let id = addOnStateChanged(async () => {
      if (photos !== getState().currentList) {
        setPhotos(getState().currentList);
      }
    });

    return () => {
      removeOnStateChanged(id);
    };
  }, []);


  let appStyle = {
    'width': size[0], 'height': size[1]
  } as CSSProperties;

  return (
    <ThemeProvider theme={darkTheme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <CssBaseline />
        <div className="App" style={appStyle} >
          <div className="AppFrame">
            <Typography
              variant="h6"
              noWrap
              component="a"
              href="#app-bar-with-responsive-menu"
              sx={{
                mr: 2,
                display: { xs: 'none', md: 'flex' },
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '.3rem',
                color: 'inherit',
                textDecoration: 'none',
                gridColumn: 1,
                gridRow: 1
              }}
            >
              Kouki2
            </Typography>
            <div className='Sidebar'>
              <Drawer
                variant="permanent"

                sx={{
                  display: { xs: 'none', sm: 'block' },
                  '& .MuiDrawer-paper': { boxSizing: 'border-box', width: "var(--sidebar-width)" },
                }}
                open
              >
                <NavigationBar />
              </Drawer>
            </div>

            {renderWorkarea(photos)}
            <CommandBar className="CommandBar" photos={photos}></CommandBar>
            <StatusBar className="StatusBar"></StatusBar>
          </div>
        </div>
      </LocalizationProvider>
    </ThemeProvider >
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
