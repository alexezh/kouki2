import { useEffect, useState } from "react";
import DialogTitle from "@mui/material/DialogTitle/DialogTitle";
import DialogContent from "@mui/material/DialogContent/DialogContent";
import Dialog from "@mui/material/Dialog/Dialog";
import DialogContentText from "@mui/material/DialogContentText/DialogContentText";
import DialogActions from "@mui/material/DialogActions/DialogActions";
import Button from "@mui/material/Button/Button";
import Typography from "@mui/material/Typography/Typography";
import { sleep } from "../../lib/sleep";
import { triggerRefreshFolders } from "../../photo/FolderStore";
import { catchAllAsync } from "../../lib/error";
import { wireGetJobStatus, wireRescanFolder, ImportJobStatusResponse } from "../../lib/photoclient";
import { PhotoListId } from "../../photo/AlbumPhoto";

export function RescanFolderDialog(props: { onClose: () => void, folderId: PhotoListId }) {
  const [processing, setProcessing] = useState(false);
  const [addedFiles, setAddedFiles] = useState(0);
  const [updatedFiles, setUpdatedFiles] = useState(0);

  useEffect(() => {
    setTimeout(async () => {
      setProcessing(true);

      catchAllAsync(async () => {
        try {
          let addResponse = await wireRescanFolder(props.folderId.id);
          if (addResponse.result !== 'Ok') {
            props.onClose();
            return;
          }

          while (true) {
            let jobInfo = await wireGetJobStatus<ImportJobStatusResponse>(addResponse.jobId);
            if (jobInfo.result !== 'Processing') {
              break;
            } else {
              setAddedFiles(jobInfo.addedFiles);
              setUpdatedFiles(jobInfo.updatedFiles);
            }
            await sleep(1);
          }
        }
        finally {
          triggerRefreshFolders();
          props.onClose();
        }
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
        <Typography variant="body1">{'Added: ' + addedFiles + ' files'}</Typography>
        <Typography variant="body1">{'Updated: ' + updatedFiles + ' files'}</Typography>
      </DialogContent>
      <DialogActions>
        <Button disabled={processing} onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
