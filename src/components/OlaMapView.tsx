import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { MAP_KEY } from '../utils/maps';

export interface OlaPin {
  id: string;
  latitude: number;
  longitude: number;
  color: string; // CSS colour of the pin
  label?: string; // shown when the pin is tapped
}

export interface OlaMapHandle {
  focus: (latitude: number, longitude: number) => void;
}

interface Props {
  pins: OlaPin[];
  interactive?: boolean; // false = fixed map (inside a scroll view)
  follow?: boolean; // keep the first pin centred as it moves (until the user drags the map)
  style?: ViewStyle;
}

// Ola Maps (vector tiles) drawn by MapLibre GL JS inside a WebView. Light style.
// The key is sent with every request to api.olamaps.io.
const html = (key: string, interactive: boolean, follow: boolean) => `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css"/>
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<style>html,body,#m{margin:0;height:100%;background:#eef0f2}
.maplibregl-ctrl-attrib{font-size:9px}</style></head><body><div id="m"></div><script>
var KEY=${JSON.stringify(key)}, I=${interactive}, FOLLOW=${follow};
var withKey=function(u){return u.indexOf('api.olamaps.io')<0||u.indexOf('api_key=')>=0?u:u+(u.indexOf('?')<0?'?':'&')+'api_key='+KEY;};
var map=new maplibregl.Map({container:'m',
  style:withKey('https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json'),
  center:[79,22.5],zoom:3.5,interactive:I,attributionControl:{compact:true},
  transformRequest:function(u){return {url:withKey(u)};}});
var markers={}, fitted=false, follow=FOLLOW, ready=false, pending=null;
map.on('dragstart',function(){follow=false;});
map.on('load',function(){ready=true; if(pending){setPins(pending); pending=null;}});
window.setPins=function(pins){
  if(!ready){pending=pins;return;}
  var seen={};
  pins.forEach(function(p){
    seen[p.id]=1; var m=markers[p.id];
    if(!m||m._c!==p.color){ if(m)m.remove();
      m=new maplibregl.Marker({color:p.color}); m._c=p.color;
      if(p.label)m.setPopup(new maplibregl.Popup({offset:24,closeButton:false}).setText(p.label));
      m.setLngLat([p.longitude,p.latitude]).addTo(map); markers[p.id]=m; }
    else m.setLngLat([p.longitude,p.latitude]);
  });
  Object.keys(markers).forEach(function(id){ if(!seen[id]){markers[id].remove(); delete markers[id];} });
  if(!pins.length) return;
  if(!fitted){ fitted=true;
    if(pins.length===1) map.jumpTo({center:[pins[0].longitude,pins[0].latitude],zoom:16});
    else { var b=new maplibregl.LngLatBounds(); pins.forEach(function(p){b.extend([p.longitude,p.latitude]);});
      map.fitBounds(b,{padding:60,maxZoom:15,duration:0}); } }
  else if(follow) map.easeTo({center:[pins[0].longitude,pins[0].latitude]});
};
window.focusOn=function(lat,lng){ map.flyTo({center:[lng,lat],zoom:15}); };
</script></body></html>`;

// The library's prop types collapse to `never` with this TypeScript version; describe the props we use.
type WebViewHandle = { injectJavaScript: (js: string) => void };
const Web = WebView as unknown as React.ComponentType<{
  ref?: React.Ref<WebViewHandle>;
  source: { html: string; baseUrl: string };
  originWhitelist: string[];
  onLoadEnd: () => void;
  scrollEnabled: boolean;
  nestedScrollEnabled: boolean;
  setSupportMultipleWindows: boolean;
  style: ViewStyle;
}>;

/** A light Ola map with pins. Pins update in place (no reload). */
export const OlaMapView = forwardRef<OlaMapHandle, Props>(function OlaMapView(
  { pins, interactive = true, follow = false, style },
  ref,
) {
  const web = useRef<WebViewHandle>(null);
  const loaded = useRef(false);
  const source = useMemo(
    () => ({ html: html(MAP_KEY, interactive, follow), baseUrl: 'https://jta.app/' }),
    [interactive, follow],
  );
  const js = `setPins(${JSON.stringify(pins)});true;`;

  useImperativeHandle(ref, () => ({
    focus: (lat, lng) => web.current?.injectJavaScript(`focusOn(${lat},${lng});true;`),
  }));

  useEffect(() => {
    if (loaded.current) web.current?.injectJavaScript(js);
  }, [js]);

  return (
    <Web
      ref={web}
      source={source}
      originWhitelist={['*']}
      onLoadEnd={() => {
        loaded.current = true;
        web.current?.injectJavaScript(js);
      }}
      scrollEnabled={false}
      nestedScrollEnabled
      setSupportMultipleWindows={false}
      style={StyleSheet.flatten([styles.web, style]) as ViewStyle}
    />
  );
});

const styles = StyleSheet.create({
  web: {
    flex: 1,
    backgroundColor: '#eef0f2',
  },
});
