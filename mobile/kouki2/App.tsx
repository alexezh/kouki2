import { StatusBar } from 'expo-status-bar';
import { Button, Pressable, StyleSheet, Text, View } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { useEffect, useState } from 'react';
import { wireConnectDevice } from './lib/mobileclient';
import { setFetchAdapter } from './lib/fetchadapter';
import { FetchAdapterNative } from './lib/fetchadapternative';

function Button2(props: { label: string, onClick: () => void }) {
  return (
    <View style={styles.buttonContainer}>
      <Pressable style={styles.button} onPress={props.onClick}>
        <Text style={styles.buttonLabel}>{props.label}</Text>
      </Pressable>
    </View>
  );
}

export default function App() {
  const [text, setText] = useState("");

  useEffect(() => {
    setTimeout(async () => {
      await MediaLibrary.requestPermissionsAsync(false);

      let total = 0;
      let endCursor: string | undefined;

      let page = await MediaLibrary.getAssetsAsync({ after: endCursor });
      if (page.assets.length !== 0) {
      }
      //setCount(albums?.length);
    })
  });

  async function handleOnConnect() {
    try {
      setFetchAdapter(new FetchAdapterNative());
      let device = await wireConnectDevice("Ezh14");
    }
    catch (e: any) {
      console.log("connect failed: " + e.toString());
    }
  }

  return (
    <View style={styles.container}>
      <Button onPress={handleOnConnect} title="Connect" />
      <Text>Hello</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    width: 320,
    height: 68,
    marginHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  button: {
    borderRadius: 10,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonIcon: {
    paddingRight: 8,
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 16,
  },
});
