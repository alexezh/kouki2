// https://github.com/dlemstra/Magick.NET/blob/main/docs/ResizeImage.md
// https://www.svgrepo.com/vectors/folder/multicolor/2
// https://yet-another-react-lightbox.com/documentation
// https://react-photo-album.com/documentation#Photo
// https://github.com/functionland/fx-fotos
// https://neptunian.github.io/react-photo-gallery/


import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { setFetchAdapter, setSessionId } from './lib/fetchadapter';
import { FetchAdapterWeb } from './lib/fetchadapterweb';
import { loadFolders } from './photo/FolderStore';
import { loadLibrary, photoLibraryMap } from './photo/PhotoStore';
import { loadDevices } from './photo/Device';
import { loadCollections } from './photo/CollectionStore';
import { registerEditCommands } from './commands/EditCommands';
import { DialogProps, showDialog } from './commands/dialogs/DialogManager';
import { WelcomeDialog } from './commands/dialogs/WelcomeDialog';
import { registerLibraryCommands } from './commands/LibraryCommands';

setFetchAdapter(new FetchAdapterWeb());
setSessionId('42')
registerEditCommands();
registerLibraryCommands();

// start load of library
setTimeout(async () => {
  await loadLibrary();
  await loadDevices();
  if (photoLibraryMap.size === 0) {
    showDialog((props: DialogProps) => {
      return (
        <WelcomeDialog onClose={props.onClose} />
      )
    })
  }
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
