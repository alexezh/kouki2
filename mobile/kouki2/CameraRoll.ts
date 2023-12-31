import { Alert, PermissionsAndroid, Platform } from "react-native";
// @ts-ignore
import { CameraRoll, PhotoIdentifier } from "@react-native-camera-roll/camera-roll";
import { fetchAdapter } from "./lib/fetchadapter";
import { UploadFileResponse, uploadFileUrl, wireAddFile, wireConnectDevice } from "./lib/mobileclient";


export async function uploadPhotos(onProgress: (x: string) => void): Promise<boolean> {
  let device = await wireConnectDevice("Ezh14");
  let getAfter: string | undefined = undefined;
  let pageSize = 10;

  let uploadedCount = 0;
  let failedCount = 0;

  try {
    while (true) {
      const { edges, page_info } = await CameraRoll.getPhotos({
        first: pageSize,
        after: getAfter
      });

      getAfter = page_info.end_cursor;

      // upload one by one
      for (let ident of edges) {
        const fileData = await CameraRoll.iosGetImageDataById(ident.node.image.uri);

        let result = await fetchAdapter?.putFile(uploadFileUrl, fileData.node.image.filepath!, "application/binary");
        if (result?.status !== 200 || result.responseText === null) {
          failedCount++;
        } else {
          let uploadResponse = JSON.parse(result.responseText) as UploadFileResponse;
          await wireAddFile({
            hash: uploadResponse.hash,
            fileName: ident.node.image.filename!,
            favorite: false,
            archiveFolderId: device.archiveFolderId,
            deviceCollectionId: device.deviceCollectionId
          })

          uploadedCount++;
        }

        onProgress(`Uploaded ${uploadedCount}, failed ${failedCount}`);
      }

      if (!page_info.has_next_page) {
        break;
      }
    }

    return true;
  }
  catch (e: any) {
    onProgress(`Failed: ${e.toString()}`);
    return false;
  }
}
