import { CSSProperties, useLayoutEffect, useRef, useState } from 'react';
import './App.css';
import AutoSizer from "react-virtualized-auto-sizer";
import { AlbumLayout } from './photo/AlbumLayout';
import { CommandBar } from './commands/menus/CommandBar';
import Drawer from '@mui/material/Drawer/Drawer';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { NavigationBar } from './commands/NatigationBar';
import Typography from '@mui/material/Typography/Typography';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { CalendarBar } from './commands/CalendarBar';
import { DialogAnchor } from './commands/dialogs/DialogManager';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

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

function App() {
  const size = useWindowSize();

  let appStyle = {
    'width': size.width, 'height': size.height
  } as CSSProperties;

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
            <CalendarBar className="Calendar-bar"></CalendarBar>
            <DialogAnchor className="Dialog-anchor" />
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
