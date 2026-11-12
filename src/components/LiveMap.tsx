import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import type { ViewStyle } from 'react-native';
import { useTheme, fonts } from '../theme';

export interface LiveMapProps {
  latitude: number | null; // null = no position yet
  longitude: number | null;
  accuracy?: number | null; // metres: drawn as a circle around the dot
  height?: number; // omit to fill the parent (flex: 1)
  interactive?: boolean; // false = fixed map (inside a scroll view)
}

// OpenStreetMap via Leaflet in a WebView: free, no API key. Dark look = inverted tiles.
// TODO before launch: public OSM tiles are for light use only; switch the tile URL to a keyed provider (e.g. MapTiler).
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const html = (interactive: boolean) => `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
html,body,#m{margin:0;height:100%;background:#1b1d1f}
.leaflet-tile-pane{filter:invert(1) hue-rotate(180deg) brightness(.9) contrast(.9)}
.me{width:16px;height:16px;border-radius:50%;background:#4f8cff;border:3px solid #fff;box-shadow:0 0 0 8px rgba(79,140,255,.25)}
.leaflet-control-attribution{font-size:9px;background:rgba(0,0,0,.5)!important;color:#999}
.leaflet-control-attribution a{color:#bbb}
</style></head><body><div id="m"></div><script>
var i=${interactive};
var map=L.map('m',{zoomControl:false,dragging:i,touchZoom:i,doubleClickZoom:i,scrollWheelZoom:false,boxZoom:false,keyboard:false});
L.tileLayer('${TILE_URL}',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
map.setView([22.5,79],4);
var dot=null,ring=null,first=true,follow=true;
map.on('dragstart',function(){follow=false;});
window.setPos=function(lat,lng,acc){
  var p=[lat,lng];
  if(!dot){dot=L.marker(p,{icon:L.divIcon({className:'',html:'<div class="me"></div>',iconSize:[22,22]})}).addTo(map);
    ring=L.circle(p,{radius:acc||0,color:'#4f8cff',weight:1,fillOpacity:.12}).addTo(map);}
  dot.setLatLng(p);ring.setLatLng(p);ring.setRadius(acc||0);
  if(first){map.setView(p,17);first=false;}else if(follow){map.panTo(p);}
};
</script></body></html>`;

// The library's prop types collapse to `never` with this TypeScript version; describe the few props we use.
type WebViewHandle = { injectJavaScript: (js: string) => void };
const Web = WebView as unknown as React.ComponentType<{
  ref?: React.Ref<WebViewHandle>;
  source: { html: string; baseUrl: string };
  originWhitelist: string[];
  onLoadEnd: () => void;
  scrollEnabled: boolean;
  setSupportMultipleWindows: boolean;
  style: ViewStyle;
}>;

/** Map with the salesman's live position (blue dot + accuracy circle). */
export function LiveMap({
  latitude,
  longitude,
  accuracy = null,
  height,
  interactive = true,
}: LiveMapProps) {
  const { theme } = useTheme();
  const ref = useRef<WebViewHandle>(null);
  const loaded = useRef(false);
  const source = useMemo(
    () => ({ html: html(interactive), baseUrl: 'https://salescrm.app/' }),
    [interactive],
  );
  const js =
    latitude != null && longitude != null
      ? `setPos(${latitude},${longitude},${accuracy ?? 0});true;`
      : null;

  // Move the dot without reloading the page.
  useEffect(() => {
    if (js && loaded.current) ref.current?.injectJavaScript(js);
  }, [js]);

  const box = [
    styles.box,
    height ? { height } : styles.fill,
    { backgroundColor: theme.colors.surface2 },
  ];

  if (Platform.OS === 'web') {
    return (
      <View style={[box, styles.center]}>
        <Text style={[styles.note, { color: theme.colors.muted }]}>
          Map is shown in the phone app
        </Text>
      </View>
    );
  }

  return (
    <View style={box}>
      <Web
        ref={ref}
        source={source}
        originWhitelist={['*']}
        onLoadEnd={() => {
          loaded.current = true;
          if (js) ref.current?.injectJavaScript(js);
        }}
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        style={{ backgroundColor: theme.colors.surface2 }}
      />
      {latitude == null ? (
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          <Text style={[styles.note, { color: theme.colors.muted }]}>Finding your location...</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
});
