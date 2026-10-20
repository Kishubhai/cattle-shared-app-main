import { prepareImageForUpload } from './imageQuality';

export type CattleCaptureImages = {
  muzzle: string[];
  face: string[];
  fullBodyLeft: string[];
  fullBodyRight: string[];
};

async function appendPrepared(
  formData: FormData,
  category: string,
  uris: string[]
): Promise<void> {
  for (let index = 0; index < uris.length; index += 1) {
    const uri = await prepareImageForUpload(uris[index]);
    formData.append(category, {
      uri,
      name: `${category}_${index}.jpg`,
      type: 'image/jpeg',
    } as any);
  }
}

/**
 * Upload all 12 captured photos:
 * muzzle(5) + face(5) + fullBodyLeft(1) + fullBodyRight(1)
 */
export async function appendCattleRegistrationImages(
  formData: FormData,
  images: CattleCaptureImages
): Promise<void> {
  await appendPrepared(formData, 'muzzle', images.muzzle.slice(0, 5));
  await appendPrepared(formData, 'face', images.face.slice(0, 5));
  await appendPrepared(formData, 'fullBodyLeft', images.fullBodyLeft.slice(0, 1));
  await appendPrepared(formData, 'fullBodyRight', images.fullBodyRight.slice(0, 1));
}
