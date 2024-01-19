// compute filler
// https://codepen.io/sosuke/pen/Pjoqqp

import { CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react';
import './App.css';
import { AlbumPhoto, PhotoListId } from "./photo/AlbumPhoto";
import AutoSizer from "react-virtualized-auto-sizer";
import { AlbumLayout } from './commands/AlbumLayout';
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
import { CalendarBar } from './commands/CalendarBar';
import { PhotoList } from './photo/PhotoList';

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

function updateVars(width: number, height: number): Size {
  let root = document.documentElement;
  root.style.setProperty('--total-height', height.toString());
  root.style.setProperty('--total-width', width.toString());

  return {
    width: width,
    height: height,
  }
}

function useWindowSize() {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  useLayoutEffect(() => {
    function updateSize() {
      let vars = updateVars(window.innerWidth, window.innerHeight);
      setSize(vars);
    }
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  return size;
}

export type Size = {
  width: number,
  height: number
}

function MyAutoSizer(props: { className: string, render: (size: Size) => JSX.Element }) {
  const ref = useRef(null);
  const [size, setSize] = useState<Size | null>(null);
  useLayoutEffect(() => {
    if (!ref.current) {
      return;
    }
    // @ts-ignore
    let newSize = { width: ref.current.offsetWidth, height: ref.current.offsetHeight }
    if (size === null || newSize.width !== size.width || newSize.height !== size.height) {
      setSize(newSize);
    }
  });

  return (
    <div className={props.className} ref={ref}>{(size) ? props.render(size) : null}</div>
  )
}

function App() {
  const size = useWindowSize();

  let appStyle = {
    'width': size.width, 'height': size.height
  } as CSSProperties;

  // .AppFrame {
  //   text-align: left;
  //   display: grid;
  //   grid-template-columns: var(--sidebar-width) auto var(--calendarbar-width);
  //   grid-template-rows: var(--header-height) auto var(--header-height);
  //   width: 100%;
  //   height: 100%;
  // }

  // we want to compute row heights to avoid scaling to content
  // grid-template-rows: var(--header-height) auto var(--header-height);
  // let appFrameStyle: CSSProperties = {
  //   textAlign: 'left',
  //   display: 'grid',
  //   gridTemplateColumns: `var(--sidebar-width) auto var(--calendarbar-width)`,
  //   gridTemplateRows: `var(--header-height) calc(${size[1]} - var(--header-height) - var(--header-height)) var(--header-height)`,
  //   width: '100%',
  //   height: '100%',
  // }
  return (
    <ThemeProvider theme={darkTheme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <CssBaseline />
        <div className="App" style={appStyle} >
          <div className="App-frame">
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

            { /**
             * ATT: sizer has weird behavior when it comes to grid. It is better to shield
             * logic by having wrapper div
             */}
            <div className='Album-container'>
              <AutoSizer>
                {({ width, height }: { width: number, height: number }) => (
                  <AlbumLayout width={width} height={height}></AlbumLayout>)}
              </AutoSizer>
            </div>
            <CommandBar className="CommandBar"></CommandBar>
            <StatusBar className="StatusBar"></StatusBar>
            <CalendarBar className="CalendarBar"></CalendarBar>
          </div>
        </div>
      </LocalizationProvider >
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
