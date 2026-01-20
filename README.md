# Storyteller

Storyteller is a mobile app for planning, writing, and organizing stories. It’s built with **React Native + Expo**, stores data locally in **SQLite** for offline use, and can **sync** your content with **Firebase Firestore** when you’re online.


<img width="400" height="800" alt="Screenshot_1768900751" src="https://github.com/user-attachments/assets/68f29114-cbd6-44be-9e8e-31847b2cfaa9" />
<img width="400" height="800" alt="Screenshot_1768900816" src="https://github.com/user-attachments/assets/87646160-25a9-440d-b39e-47ffcb7e0024" />
<img width="400" height="800" alt="Screenshot_1768900764" src="https://github.com/user-attachments/assets/fd9637f6-e50f-4306-b5f8-30b717541b6f" />
<img width="400" height="800" alt="Screenshot_1768900776" src="https://github.com/user-attachments/assets/e334174f-2a68-4182-9374-412df98e3a62" />

## What you can do

- **Create and manage stories**
  - Title, description, theme, length, status (draft/completed)
- **Organize story content**
  - **Chapters** (ordered)
  - **Scenes** (with metadata like setting and conflict level)
  - **Characters** (role, importance, details)
  - **Blurbs / ideas** (categorized notes like plot points, themes, conflicts)
- **Offline-first**
  - All CRUD actions work against the local SQLite database
- **Sync to the cloud**
  - Changes are uploaded to Firestore via a sync manager/queue
  - Deletions use soft-delete flags so they can be synced reliably
- **Undo for deletions**
  - Certain deletes can be undone via an in-app snackbar flow

## Tech stack

- **React Native (Expo)**
- **TypeScript**
- **Redux Toolkit + RTK Query**
- **SQLite** (local persistence)
- **Firebase Firestore** (cloud sync)


## Notes on sync

- The app is designed to keep working **offline** using SQLite.
- When online, a sync service uploads local changes to Firestore and pulls remote changes.
- Some entities use **soft delete** (`deleted` flag) so deletions can be synced and recovered/undone safely.

