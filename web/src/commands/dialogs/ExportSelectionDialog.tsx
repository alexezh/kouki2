import { useState } from "react";
import { ExportJobStatusResponse, GetJobStatusResponse, ProcessCollectionStatusResponse, wireExportPhotos, wireGetJobStatus } from "../../lib/photoclient";
import DialogTitle from "@mui/material/DialogTitle/DialogTitle";
import DialogContent from "@mui/material/DialogContent/DialogContent";
import Dialog from "@mui/material/Dialog/Dialog";
import DialogContentText from "@mui/material/DialogContentText/DialogContentText";
import TextField from "@mui/material/TextField/TextField";
import DialogActions from "@mui/material/DialogActions/DialogActions";
import Button from "@mui/material/Button/Button";
import Typography from "@mui/material/Typography/Typography";
import { sleep } from "../../lib/sleep";
import { triggerRefreshFolders } from "../../photo/FolderStore";
import { selectionManager } from "../SelectionManager";
import { AlbumPhoto } from "../../photo/AlbumPhoto";
import { createCollectionOfKind, triggerRefreshCollections } from "../../photo/CollectionStore";
import { createCollectionPhotoList } from "../../photo/LoadPhotoList";
import { runJob } from "../BackgroundJobs";
import { ResultResponse } from "../../lib/fetchadapter";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";

export function ExportSelectionDialog(props: { onClose: () => void }) {
  const [path, setPath] = useState("");
  const [processing, setProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [symLink, setSymbolicLink] = useState(false);

  function handleClose() {
    props.onClose();
  };

  async function handleExport() {
    setProcessing(true);

    try {
      let photos = selectionManager.map((x: AlbumPhoto) => x.id);

      let exportColl = await createCollectionOfKind('export');
      let exportList = createCollectionPhotoList(exportColl.id);
      console.log(`Export ${photos.length} photos to ${exportList.id.id}`);

      let job = runJob('export',
        'Export folders',
        () => wireExportPhotos({ path: path, format: "jpeg", useSymLink: symLink, photos: photos, exportCollection: exportList.id.id }));

      job.addOnStatus((status: ResultResponse) => setStatusText(`Exported: ${(status as ExportJobStatusResponse).exportedFiles} files`));
      let exportResult = await job.task;

      let jobResult = await job.task;

      setProcessing(false);
      if (jobResult) {
        if (jobResult.result === "Done") {
          triggerRefreshFolders();
          props.onClose();
        } else {
          setStatusText(jobResult.message);
        }
      }
    }
    catch (e: any) {
      console.log(e.toString());
    }
    finally {
      triggerRefreshCollections();
      triggerRefreshFolders();
      props.onClose();
    }
  };

  async function handleChanged(event: React.ChangeEvent) {
    // @ts-ignore
    setPath(event.target.value);
  }

  return (
    <Dialog open={true} onClose={handleClose}>
      <DialogTitle>Add Folder</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Enter folder name for export folder located under root export folder.
        </DialogContentText>
        {!processing ? (<TextField
          autoFocus
          margin="dense"
          id="name"
          label="Folder"
          type="text"
          fullWidth
          variant="standard"
          value={path}
          onChange={handleChanged}
        />) : (<Typography variant="body1">{statusText}</Typography>)}
        <FormControlLabel label="Use symbolic links"
          control={
            <Checkbox checked={symLink} onChange={(event: React.ChangeEvent<HTMLInputElement>) => { setSymbolicLink(event.target.checked) }} />} />
      </DialogContent>
      <DialogActions>
        <Button disabled={processing} onClick={handleExport}>Export</Button>
        <Button disabled={processing} onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
