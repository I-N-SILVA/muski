# Muski public preview privacy

The Muski browser preview runs as static files in your browser. Audio selected through the file picker is read locally and played through the browser's media APIs. The preview does not upload audio, create an account, use analytics, or send a track list to Muski.

Selected audio is represented by temporary browser object URLs. Those references normally disappear when the tab closes or reloads. The hosting provider and browser may process ordinary network metadata when loading the page, such as IP address, user agent, caching headers, and request time, under their own policies.

The generated demonstration loop is synthesized on the device and does not download media.

The downloadable desktop app has a separate, fuller privacy notice bundled with each release. Do not publish a desktop release until its monitored privacy contact is configured.
