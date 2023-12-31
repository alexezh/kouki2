import { Alert, PermissionsAndroid, Platform } from "react-native";
// @ts-ignore
import { CameraRoll, PhotoIdentifier } from "@react-native-camera-roll/camera-roll";
import { fetchAdapter } from "./lib/fetchadapter";
import { ConnectDeviceResponse, UploadFileResponse, uploadFileUrl, wireAddFile, wireConnectDevice } from "./lib/mobileclient";
import { sleep } from "./lib/sleep";
import { WirePhotoEntry, wireGetFolder } from "./lib/photoclient";

export type ProgressStatus = {
  result: string | null;
  uploadedCount: number;
  skippedCount: number;
  failedCount: number;
}

type ProgressToken = {
  pageSize: number;
  device: ConnectDeviceResponse;
  getAfter: string | undefined;
  status: ProgressStatus;
  onProgress: (x: ProgressStatus) => void;
  photos: Map<string, WirePhotoEntry>;
  networkCallCount: number;
  throttleDelayMs: number
}

/**
 * function is broken into number of timer caller in order to avoid any internal references
 * which might cause a leak
 */
export function uploadPhotos(onProgress: (x: ProgressStatus) => void) {
  setTimeout(async () => {
    let device = await wireConnectDevice("Ezh14");

    let photoArr = await wireGetFolder(device.archiveFolderId);
    let photos = new Map<string, WirePhotoEntry>();

    for (let photo of photoArr) {
      photos.set(photo.fileName + photo.fileExt, photo);
    }

    let token: ProgressToken = {
      pageSize: 20,
      device: device,
      getAfter: undefined,
      status: {
        result: null,
        uploadedCount: 0,
        skippedCount: 0,
        failedCount: 0,
      },
      onProgress: onProgress,
      photos: photos,
      networkCallCount: 0,
      throttleDelayMs: 2000
    }

    scheduleProcessPage(token);
  });
}

function scheduleProcessPage(token: ProgressToken) {
  setTimeout(async () => {
    await processPage(token);
  });
}

async function processPage(token: ProgressToken) {
  try {
    const { edges, page_info } = await CameraRoll.getPhotos({
      first: token.pageSize,
      after: token.getAfter
    });

    token.getAfter = page_info.end_cursor;

    // upload one by one
    for (let ident of edges) {
      if (ident.node.image.filename && token.photos.get(ident.node.image.filename)) {
        token.status.skippedCount++;
      }
      else {
        try {
          const fileData = await CameraRoll.iosGetImageDataById(ident.node.image.uri);

          token.networkCallCount++;

          let result = await fetchAdapter?.putFile(uploadFileUrl, fileData.node.image.filepath!, "application/binary");
          if (result?.status !== 200 || result.responseText === null) {
            token.status.failedCount++;
          } else {
            let uploadResponse = JSON.parse(result.responseText) as UploadFileResponse;
            await wireAddFile({
              hash: uploadResponse.hash,
              fileName: ident.node.image.filename!,
              favorite: false,
              archiveFolderId: token.device.archiveFolderId,
              deviceCollectionId: token.device.deviceCollectionId
            })

            token.status.uploadedCount++;
          }
        }
        catch (e: any) {
          token.status.skippedCount++;
        }
      }
    }

    if (page_info.has_next_page) {
      token.onProgress(token.status);

      let delay = 0;
      if (token.networkCallCount > 100) {
        delay = token.throttleDelayMs;
        token.networkCallCount = 0;
      }
      // sleep to give react time to breath
      setTimeout(async () => {
        processPage(token)
      }, token.throttleDelayMs);
    }
    else {
      token.onProgress(token.status);
    }

    return true;
  }
  catch (e: any) {
    token.status.result = "failed";
    token.onProgress(token.status);
    return false;
  }
}
