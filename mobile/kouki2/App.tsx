import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { useEffect, useState } from 'react';

export default function App() {
  const [text, setText] = useState("");

  useEffect(() => {
    setTimeout(async () => {
      await MediaLibrary.requestPermissionsAsync(false);

      let albums = await MediaLibrary.getAlbumsAsync();
      let t = "";
      for (let album of albums) {
        t += album.title;
        t += ";";
      }

      let total = 0;
      let endCursor: string | undefined;
      while (true) {
        let page = await MediaLibrary.getAssetsAsync({ after: endCursor });
        if (page.assets.length === 0) {
          break;
        }
        total += page.assets.length;
        endCursor = page.endCursor;
      }
      setText(total.toString());
      //setCount(albums?.length);
    })
  });

  return (
    <View style={styles.container}>
      <Text>{text}</Text>
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
});
