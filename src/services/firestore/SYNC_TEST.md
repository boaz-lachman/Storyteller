# Firestore Sync Operations Test Guide

This document provides examples and verification steps for testing the Firestore sync operations implemented in tasks 12.5-12.8.

## Prerequisites

1. Firebase must be configured with valid credentials
2. User must be authenticated
3. Network connection must be available

## Test Scenarios

### 1. Upload Operations

#### Upload a Story
```typescript
import { useUploadStoryMutation } from '../../store/api/firestoreApi';

const [uploadStory] = useUploadStoryMutation();

const story: Story = {
  id: 'story-123',
  userId: 'user-456',
  title: 'Test Story',
  description: 'A test story',
  length: 'short-story',
  theme: 'fantasy',
  tone: 'light',
  pov: 'third-person-limited',
  targetAudience: 'adult',
  status: 'draft',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  synced: false,
};

try {
  const result = await uploadStory(story).unwrap();
  console.log('Story uploaded:', result);
  // Result should have synced: true
} catch (error) {
  console.error('Upload failed:', error);
}
```

#### Upload a Character
```typescript
import { useUploadCharacterMutation } from '../../store/api/firestoreApi';

const [uploadCharacter] = useUploadCharacterMutation();

const character: Character = {
  id: 'char-123',
  userId: 'user-456',
  storyId: 'story-123',
  name: 'Test Character',
  description: 'A test character',
  role: 'protagonist',
  traits: ['brave', 'curious'],
  importance: 8,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  synced: false,
  deleted: false,
};

try {
  const result = await uploadCharacter(character).unwrap();
  console.log('Character uploaded:', result);
} catch (error) {
  console.error('Upload failed:', error);
}
```

### 2. Download Operations

#### Download All Stories for a User
```typescript
import { useLazyDownloadStoriesQuery } from '../../store/api/firestoreApi';

const [downloadStories, { data, isLoading, error }] = useLazyDownloadStoriesQuery();

try {
  const result = await downloadStories('user-456').unwrap();
  console.log('Stories downloaded:', result);
  // Result is an array of Story objects
} catch (error) {
  console.error('Download failed:', error);
}
```

#### Download Entities for a Story
```typescript
import { useLazyDownloadEntitiesForStoryQuery } from '../../store/api/firestoreApi';

const [downloadEntities, { data, isLoading, error }] = useLazyDownloadEntitiesForStoryQuery();

try {
  const result = await downloadEntities({
    storyId: 'story-123',
    localEntities: {
      characters: [/* local characters */],
      blurbs: [/* local blurbs */],
      scenes: [/* local scenes */],
      chapters: [/* local chapters */],
    },
  }).unwrap();
  
  console.log('Entities downloaded:', result);
  // Result contains: { characters, blurbs, scenes, chapters }
} catch (error) {
  console.error('Download failed:', error);
}
```

### 3. Sync Operations

#### Sync a Single Story with All Entities
```typescript
import { useSyncStoryMutation } from '../../store/api/firestoreApi';

const [syncStory, { isLoading }] = useSyncStoryMutation();

try {
  const result = await syncStory({
    story: storyObject,
    characters: characterArray,
    blurbs: blurbArray,
    scenes: sceneArray,
    chapters: chapterArray,
    localEntities: {
      characters: localCharacters,
      blurbs: localBlurbs,
      scenes: localScenes,
      chapters: localChapters,
    },
  }).unwrap();
  
  console.log('Story synced:', result);
  // Result contains: { story, entities: { characters, blurbs, scenes, chapters } }
} catch (error) {
  console.error('Sync failed:', error);
}
```

#### Sync All Stories for a User
```typescript
import { useSyncAllStoriesMutation } from '../../store/api/firestoreApi';

const [syncAllStories, { isLoading }] = useSyncAllStoriesMutation();

try {
  const stories = await syncAllStories('user-456').unwrap();
  console.log('All stories synced:', stories);
  // Result is an array of Story objects
} catch (error) {
  console.error('Sync failed:', error);
}
```

## Verification Checklist

### Upload Operations
- [ ] Story uploads successfully to Firestore
- [ ] Character uploads successfully to Firestore
- [ ] Blurb uploads successfully to Firestore
- [ ] Scene uploads successfully to Firestore
- [ ] Chapter uploads successfully to Firestore
- [ ] Uploaded entities have `synced: true` in the result
- [ ] Uploaded entities appear in Firestore console

### Download Operations
- [ ] Stories download successfully from Firestore
- [ ] Entities download successfully for a story
- [ ] Downloaded entities are in correct format (SQLite format)
- [ ] Conflict resolution works (last-write-wins)
- [ ] Deleted entities are filtered out

### Sync Operations
- [ ] Story sync uploads story and all entities
- [ ] Story sync downloads remote changes
- [ ] Conflict resolution works during sync
- [ ] All stories sync successfully for a user

## Error Handling

All operations should handle the following error cases:
- Firebase not configured
- Network connection unavailable
- Invalid data format
- Missing required fields
- Firestore permission errors

## Testing in Development

1. Use React Native Debugger or console logs to verify operations
2. Check Firestore console to verify data is stored correctly
3. Test with multiple devices/users to verify conflict resolution
4. Test offline/online scenarios

## Notes

- All upload operations use `setDoc` with `merge: true` to handle both create and update
- Download operations filter out deleted entities (`deleted == false`)
- Conflict resolution uses last-write-wins strategy based on `updatedAt` timestamp
- All operations check Firebase configuration before executing
