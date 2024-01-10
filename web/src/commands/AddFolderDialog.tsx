import { useEffect, useMemo, useState } from "react";
import DialogTitle from "@mui/material/DialogTitle/DialogTitle";
import DialogContent from "@mui/material/DialogContent/DialogContent";
import Dialog from "@mui/material/Dialog/Dialog";
import DialogContentText from "@mui/material/DialogContentText/DialogContentText";
import TextField from "@mui/material/TextField/TextField";
import DialogActions from "@mui/material/DialogActions/DialogActions";
import Button from "@mui/material/Button/Button";
import Typography from "@mui/material/Typography/Typography";
import { sleep } from "../lib/sleep";
import { triggerRefreshFolders } from "../photo/FolderStore";
import { catchAll, catchAllAsync } from "../lib/error";
import { wireImportFolder, wireGetJobStatus, wireRescanFolder, wireBuildPHash, JobResponse, GetJobInfoResponse } from "../lib/photoclient";
import { PhotoListId } from "../photo/AlbumPhoto";
import { getStandardCollection } from "../photo/CollectionStore";

export function AddFolderDialog(props: { onClose: () => void }) {
  const [value, setValue] = useState("");
  const [processing, setProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState(0);

  function handleClose() {
    props.onClose();
  };

  async function handleAdd() {
    setProcessing(true);

    catchAllAsync(async () => {
      try {
        let importList = await getStandardCollection('import');

        let addResponse = await wireImportFolder({ folder: value, importCollection: importList.id.id });
        if (addResponse.result !== 'Ok') {
          props.onClose();
          return;
        }

        while (true) {
          let jobInfo = await wireGetJobStatus(addResponse.jobId);
          if (jobInfo.result !== 'Processing') {
            break;
          } else {
            setProcessedFiles(jobInfo.addedFiles);
          }
          await sleep(1);
        }
      }
      finally {
        triggerRefreshFolders();
        props.onClose();
      }
    });
  };

  async function handleChanged(event: React.ChangeEvent) {
    // @ts-ignore
    setValue(event.target.value);
  }

  return (
    <Dialog open={true} onClose={handleClose}>
      <DialogTitle>Add Folder</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Enter folder name starting with root of drive (such as /Users/myname/Pictures).
        </DialogContentText>
        {!processing ? (<TextField
          autoFocus
          margin="dense"
          id="name"
          label="Folder"
          type="text"
          fullWidth
          variant="standard"
          value={value}
          onChange={handleChanged}
        />) : (<Typography variant="body1">{'Added: ' + processedFiles + ' files'}</Typography>)}
      </DialogContent>
      <DialogActions>
        <Button disabled={processing} onClick={handleClose}>Cancel</Button>
        <Button disabled={processing} onClick={handleAdd}>Add</Button>
      </DialogActions>
    </Dialog>
  );
}

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
            let jobInfo = await wireGetJobStatus(addResponse.jobId);
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

let jobMap = new Map<string, boolean>();

export async function runJob(
  key: string,
  func: () => Promise<JobResponse>,
  onStatus: (status: GetJobInfoResponse) => void,
  onComplete: () => void): Promise<boolean> {

  let jobResponse = jobMap.get(key);
  if (jobResponse) {
    return true;
  }

  try {
    jobMap.set(key, true);
    console.log("start job " + key);

    let jobResponse = await func();
    if (jobResponse.result !== 'Ok') {
      return false;
    }

    while (true) {
      let jobInfo = await wireGetJobStatus(jobResponse.jobId);
      if (jobInfo.result !== 'Processing') {
        break;
      } else {
        onStatus(jobInfo);
      }
      await sleep(1);
    }
  }
  finally {
    jobMap.delete(key);
    onComplete();
  }

  return true;
}

export function ProgressDialog(props: { onClose: () => void, folderId: PhotoListId }) {
  const [processing, setProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState(0);

  useEffect(() => {
    setTimeout(async () => {
      setProcessing(true);

      catchAllAsync(async () => {
        runJob("phash_" + props.folderId.id,
          () => wireBuildPHash({ folderId: props.folderId.id, photos: null }),
          (status: GetJobInfoResponse) => setProcessedFiles(status.processedFiles),
          () => {
            triggerRefreshFolders();
            props.onClose();
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
