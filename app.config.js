// Adds secrets that must not live in app.json. The Google Maps key comes from the EAS environment
// (or a local .env) as GOOGLE_MAPS_API_KEY; without it the app shows coordinates instead of a map.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: { ...config.android?.config, googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY } },
  },
});
