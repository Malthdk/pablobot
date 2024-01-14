import { credentials } from "./credentials";

const ALBUM_ID =
  "ABPj6JIhRiZ2v7w86GANJK65vv-lf220JC9NmEfe4kwhtJbT3tg76WI0jFgoX60mUxgPXx6wmsQU";

export const addGoogleImage = async (
  key: string,
  uploadToken: string,
  prompt: string
) => {
  const googleCreateImage = await fetch(
    "https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
        "Content-type": "application/json",
      },
      body: JSON.stringify({
        albumId: ALBUM_ID,
        newMediaItems: [
          {
            description: prompt,
            simpleMediaItem: {
              uploadToken: uploadToken,
            },
          },
        ],
      }),
    }
  );
  const mediaItem = await googleCreateImage.json();
  return mediaItem;
};

export const removeGoogleImage = async (key: string, imageId: string) => {
  const removeResponse = await fetch(
    `https://photoslibrary.googleapis.com/v1/albums/${ALBUM_ID}:batchRemoveMediaItems`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
        "Content-type": "application/json",
      },
      body: JSON.stringify({
        mediaItemIds: [imageId],
      }),
    }
  );

  console.log("Removed image", await removeResponse.json());
};

export const addGoogleAlbum = async (key: string, albumName: string) => {
  const createGoogleAlbum = await fetch(
    `https://photoslibrary.googleapis.com/v1/albums?key=${credentials.googleApiKey}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
        "Content-type": "application/json",
      },
      body: JSON.stringify({
        album: {
          title: albumName,
        },
      }),
    }
  );

  const googleAlbum = await createGoogleAlbum.json();

  console.log(googleAlbum);
  return googleAlbum.id;
};

export const getUploadToken = async (key: string, blob: Blob) => {
  const uploadTokenResponse = await fetch(
    "https://photoslibrary.googleapis.com/v1/uploads",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-type": "application/octet-stream",
        "X-Goog-Upload-Content-Type": "image/jpeg",
        "X-Goog-Upload-Protocol": "raw",
      },
      body: blob,
    }
  );

  const uploadToken = await uploadTokenResponse.text();
  return uploadToken;
};
