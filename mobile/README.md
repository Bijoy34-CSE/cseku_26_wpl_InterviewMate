# InterviewMate Mobile

Expo Router app for InterviewMate. The mobile app uses InterviewMate branding
for its launcher icon, splash screen, and app name. It supports email/password
registration with email OTP verification, sign-in, document-grounded text
interviews, saved interview history, resuming an in-progress session, and
reviewing completed-session feedback. Signed-in users can also practice
curated questions and get AI feedback on written answers. They also have a
dashboard, performance summary, profile and photo editing, preferences,
premium payment requests, feedback, and an administrator workspace.

## Run with Expo Go

1. Install the dependencies from this directory:

   ```bash
   npm install
   ```

2. Start the backend on port `5000` and start Expo:

   ```bash
   npm run start
   ```

3. Scan the Expo QR code with Expo Go. A physical phone and the computer
   running the backend must be able to reach each other on the same network.

The signed-in dashboard links to the interview setup, history, and performance
screens. Open the navigation drawer for profile, settings, upgrade, support,
and (for administrators) the admin panel.

The API origin defaults to port `5000` on the Expo development host. If
`EXPO_PUBLIC_API_URL` is set in `mobile/.env`, it takes precedence; keep it
updated to the backend computer's current LAN IP for a physical phone. Set it
to the backend origin before starting Expo, for example:

```text
EXPO_PUBLIC_API_URL=http://192.168.1.20:5000
```

For Android emulators, the default is `http://10.0.2.2:5000`; web uses
`http://localhost:5000`. Do not use `localhost` as the API host on a physical
phone.

## Build an installable Android APK

The EAS build uploads the mobile project source to Expo's build service. Keep
secrets out of the upload; `.env` is excluded by `.gitignore`. Create an Expo
account, then from this directory run:

```bash
npx eas-cli@latest login
npx eas-cli@latest env:set --name EXPO_PUBLIC_API_URL --value https://YOUR-BACKEND-DOMAIN --environment preview --visibility plaintext
npx eas-cli@latest build --platform android --profile preview
```

The build command may prompt you to create or link an EAS project. The API
URL must be reachable by the installed phone; do not use `localhost`. The
preview profile creates an internally distributable APK. The production
profile creates an Android App Bundle for store submission.

## Supported interview materials

The interview setup accepts PDF, DOCX, and PPTX files up to 10 MB. Interviews
are text-response on mobile, and the backend uses the uploaded document as the
source for questions and evaluation.
