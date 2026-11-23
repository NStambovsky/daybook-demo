# Put Daybook on your phone’s home screen

Deploy your own private app first using [CLOUDFLARE.md](CLOUDFLARE.md). Use **your deployed HTTPS URL**, not the dummy demo URL and not GitHub’s source-code page. A home-screen icon opens the same website; it does not copy the database onto your phone.

## iPhone / iPad

1. Open your app URL in **Safari** and sign in.
2. Open Safari’s sharing menu and choose **Add to Home Screen**. If it is hidden, use **Edit Actions** to add it.
3. Name it **Daybook**. If **Open as Web App** appears, turn it on, then tap **Add**.
4. Open the new icon. If it asks for your password again, sign in there too. Browser and home-screen sessions may be separate.

## Android

1. Open your app URL in **Chrome** and sign in.
2. Open the three-dot menu and choose **Add to home screen** or **Install app**. The wording depends on your browser/version and the site’s installation support.
3. Confirm the name and add/install it. Open the new icon and sign in again if requested.

## Everyday use

Save the password in your password manager if you want. This does not put it in the repository. Give each phone the same private deployment URL to share a log. If the owner rotates the session secret, sign in again on every phone.

The icon is convenient access to a web app, not an App Store installation. It does not guarantee offline saving or background timers. Open the app with a connection to sync and check the saved status. Removing the icon does not delete the Cloudflare database. The dummy demo always resets when refreshed, even if saved to your home screen.

Official instructions: [Apple home-screen web apps](https://support.apple.com/guide/iphone/iphea86e5236/ios), [Chrome web apps on Android](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid).
