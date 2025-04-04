import { useState } from "react";
import { ImportJobStatusResponse, ProcessCollectionStatusResponse, wireProcessCollectionJob } from "../../lib/photoclient";
import DialogTitle from "@mui/material/DialogTitle/DialogTitle";
import DialogContent from "@mui/material/DialogContent/DialogContent";
import Dialog from "@mui/material/Dialog/Dialog";
import DialogContentText from "@mui/material/DialogContentText/DialogContentText";
import DialogActions from "@mui/material/DialogActions/DialogActions";
import Button from "@mui/material/Button/Button";
import Typography from "@mui/material/Typography/Typography";
import { triggerRefreshFolders } from "../../photo/FolderStore";
import { runJob } from "../BackgroundJobs";
import { DialogProps, showDialog } from "./DialogManager";
import { CollectionId, getCollectionById } from "../../photo/CollectionStore";
import { ResultResponse } from "../../lib/fetchadapter";
import { PhotoListId } from "../../photo/AlbumPhoto";
import { loadLibrary } from "../../photo/PhotoStore";

export async function showBuildPhashDialog(listId: PhotoListId): Promise<void> {

  let contentText: string;

  switch (listId.kind) {
    case 'all': contentText = 'Update phash for all photos'; break;
    case 'folder': contentText = 'Update phash for folder'; break;
    default: contentText = 'Update phash for collection'; break;
  }

  //getCollectionsByKind(collId);

  let func = async (setStatusText: (val: string) => void): Promise<void> => {
    let job = runJob<ImportJobStatusResponse>("phash_" + listId.id,
      'Build PHash',
      () => wireProcessCollectionJob({ cmd: 'phash', collKind: listId.kind, collId: listId.id, forceUpdate: false }))

    job.addOnStatus((status: ResultResponse) =>
      setStatusText(`Processed: ${(status as ProcessCollectionStatusResponse).processedFiles} files`));

    await job.task;
    triggerRefreshFolders();
  }

  showDialog((props: DialogProps) => {
    return (
      <ProgressDialog
        title='Build phash'
        contentText={contentText}
        statusText=""
        onClose={props.onClose}
        actionButtonText="Run"
        onAction={func} />)
  });
}

export function showAltTextDialog(listId: PhotoListId) {
  let func = async (setStatusText: (val: string) => void): Promise<void> => {
    let job = runJob<ImportJobStatusResponse>("alt_" + listId.id,
      'Generate Alternative Text',
      () => wireProcessCollectionJob({ cmd: 'alttext', collKind: listId.kind, collId: listId.id, forceUpdate: false }));

    job.addOnStatus((status: ResultResponse) =>
      setStatusText(`Processed: ${(status as ProcessCollectionStatusResponse).processedFiles} files`));

    await job.task;
  }

  showDialog((props: DialogProps) => {
    return (
      <ProgressDialog
        title='Generate text descroption'
        contentText='Generate photos description using LLAMA'
        statusText=""
        onClose={props.onClose}
        actionButtonText="Run"
        onAction={func} />)
  });
}

export function showSimilarityIndexDialog(listId: PhotoListId) {
  let func = async (setStatusText: (val: string) => void): Promise<void> => {
    let job = runJob<ImportJobStatusResponse>("sim_" + listId.id,
      'Build Similarity Index',
      () => wireProcessCollectionJob({ cmd: 'similarity', collKind: 'all', collId: 0, forceUpdate: false }));

    job.addOnStatus((status: ResultResponse) =>
      setStatusText(`Processed: ${(status as ProcessCollectionStatusResponse).processedFiles} files`));

    await job.task;
    await loadLibrary({ minId: 0 });
  }

  showDialog((props: DialogProps) => {
    return (
      <ProgressDialog
        title='Build similarity index'
        contentText='Find similar photos using PHash'
        statusText=""
        onClose={props.onClose}
        actionButtonText="Run"
        onAction={func} />)
  });
}
export type ProgressDialogProps = {
  onClose: () => void,
  title: string,
  contentText: string,
  statusText: string,
  actionButtonText: string,
  onAction: (setStatus: (val: string) => void) => Promise<void>,
}

/**
 * start job specified by action and wait for completion
 */
export function ProgressDialog(props: ProgressDialogProps) {
  const [processing, setProcessing] = useState(false);
  const [statusText, setStatusText] = useState(props.statusText);

  function handleClose() {
    props.onClose();
  };

  async function handleAction() {
    setProcessing(true);
    await props.onAction((val: string) => setStatusText(val));
    setProcessing(false);
    handleClose();
  }

  return (
    <Dialog open={true} onClose={handleClose}>
      <DialogTitle>{props.title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{props.contentText}</DialogContentText>
        <Typography variant="body1">{statusText}</Typography>
      </DialogContent>
      <DialogActions>
        <Button disabled={processing} onClick={handleAction}>{props.actionButtonText}</Button>
        <Button onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
