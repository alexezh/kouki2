/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { Button } from 'react-native';
import { useEffect, useState } from 'react';
import { wireConnectDevice } from './lib/mobileclient';
import { setFetchAdapter } from './lib/fetchadapter';
import { FetchAdapterNative } from './lib/fetchadapternative';

import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';
import { ProgressStatus, uploadPhotos } from './CameraRoll';
import { PhotoIdentifier } from '@react-native-camera-roll/camera-roll';

type SectionProps = PropsWithChildren<{
  title: string;
}>;

// function Section({ children, title }: SectionProps): React.JSX.Element {
//   const isDarkMode = useColorScheme() === 'dark';
//   return (
//     <View style={styles.sectionContainer}>
//       <Text
//         style={[
//           styles.sectionTitle,
//           {
//             color: isDarkMode ? Colors.white : Colors.black,
//           },
//         ]}>
//         {title}
//       </Text>
//       <Text
//         style={[
//           styles.sectionDescription,
//           {
//             color: isDarkMode ? Colors.light : Colors.dark,
//           },
//         ]}>
//         {children}
//       </Text>
//     </View>
//   );
// }

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [text, setText] = useState("");
  const [progress, setProgress] = useState<ProgressStatus | null>(null);

  useEffect(() => {
    //setText("Loading");

    setTimeout(async () => {
      // setText("Loading2");
      // let images = await uploadPictures();
      // setImages(images);
      // setText(images.length.toString());
      // await MediaLibrary.requestPermissionsAsync(false);

      // let total = 0;
      // let endCursor: string | undefined;

      // let page = await MediaLibrary.getAssetsAsync({ after: endCursor });
      // if (page.assets.length !== 0) {
      // }
      //setCount(albums?.length);
    })
  }, []);

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  async function handleOnLoad() {
    try {
      setText("uploading");
      uploadPhotos((x: ProgressStatus) => setProgress(x));
    }
    catch (e: any) {
      setText(e.toString());
    }
  }

  async function handleOnConnect() {
    try {
      let device = await wireConnectDevice("Ezh14");
    }
    catch (e: any) {
      console.log("connect failed: " + e.toString());
    }
  }

  function renderProgress() {
    return (
      <View>
        <Text style={styles.baseText}>{"Uploaded: " + progress!.uploadedCount}</Text>
        <Text style={styles.baseText}>{"Skipped: " + progress!.skippedCount}</Text>
        <Text style={styles.baseText}>{"Failed: " + progress!.failedCount}</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}>
          <Button onPress={handleOnConnect} title="Connect" />
          <Button onPress={handleOnLoad} title="Load" />
          <Text style={styles.baseText}>{"Status: " + text}</Text>
          {
            (progress) ? renderProgress() : null
          }
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
  baseText: {
    fontFamily: 'Cochin',
    fontSize: 18,
    color: 'black',
  },
});

export default App;
setFetchAdapter(new FetchAdapterNative());
