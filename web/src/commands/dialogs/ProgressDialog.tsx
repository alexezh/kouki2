import { useEffect, useState } from "react";
import { GetJobStatusResponse, PHashJobStatusResponse, wireBuildPHash } from "../../lib/photoclient";
import DialogTitle from "@mui/material/DialogTitle/DialogTitle";
import DialogContent from "@mui/material/DialogContent/DialogContent";
import Dialog from "@mui/material/Dialog/Dialog";
import DialogContentText from "@mui/material/DialogContentText/DialogContentText";
import DialogActions from "@mui/material/DialogActions/DialogActions";
import Button from "@mui/material/Button/Button";
import Typography from "@mui/material/Typography/Typography";
import { triggerRefreshFolders } from "../../photo/FolderStore";
import { PhotoListId } from "../../photo/AlbumPhoto";
import { catchAllAsync } from "../../lib/error";
import { IBackgroundJob, runJob } from "./BackgroundJobs";

export function ProgressDialog(props: { onClose: () => void, folderId: PhotoListId }) {
  const [processing, setProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState(0);

  useEffect(() => {
    setTimeout(async () => {
      setProcessing(true);

      catchAllAsync(async () => {
        runJob<PHashJobStatusResponse>("phash_" + props.folderId.id,
          {
            worker: () => wireBuildPHash({ folderId: props.folderId.id, photos: null }),
            onStatus: () => (status: PHashJobStatusResponse) => setProcessedFiles(status.processedFiles),
            onComplete: () => {
              triggerRefreshFolders();
              props.onClose();
            }
          });
      });
    });
  }, [props.folderId]);

  function handleClose() {
    props.onClose();
  };

  return (
    <Dialog open={true} onClose={handleClose}>
      <DialogTitle>Add Folder</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Updating folder.
        </DialogContentText>
        <Typography variant="body1">{'Processed: ' + processedFiles + ' files'}</Typography>
      </DialogContent>
      <DialogActions>
        <Button disabled={processing} onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
