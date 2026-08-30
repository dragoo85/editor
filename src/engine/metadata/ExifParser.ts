import ExifReader from 'exifreader';
import { ExifMetadata } from '../../types/image';

export class ExifParser {
  public static async parse(buffer: ArrayBuffer | Uint8Array): Promise<ExifMetadata> {
    try {
      const tags = await ExifReader.load(buffer, { expanded: true });
      const exif: ExifMetadata = {};

      if (tags.exif) {
        const e = tags.exif;
        if (e.Make?.description) exif.make = e.Make.description;
        if (e.Model?.description) exif.model = e.Model.description;
        if (e.LensModel?.description) exif.lens = e.LensModel.description;
        if (e.FocalLength?.description) exif.focalLength = e.FocalLength.description;
        if (e.FNumber?.description) exif.fNumber = e.FNumber.description;
        if (e.ExposureTime?.description) exif.exposureTime = e.ExposureTime.description;
        if (e.ISOSpeedRatings?.value) {
          const isoVal = Array.isArray(e.ISOSpeedRatings.value) ? e.ISOSpeedRatings.value[0] : e.ISOSpeedRatings.value;
          exif.iso = Number(isoVal) || undefined;
        }
        if (e.ExposureBiasValue?.description) exif.exposureBias = e.ExposureBiasValue.description;
        if (e.WhiteBalance?.description) exif.whiteBalance = e.WhiteBalance.description;
        if (e.MeteringMode?.description) exif.meteringMode = e.MeteringMode.description;
        if (e.DateTimeOriginal?.description) exif.dateTimeOriginal = e.DateTimeOriginal.description;
        if (e.PixelXDimension?.value) exif.width = Number(e.PixelXDimension.value);
        if (e.PixelYDimension?.value) exif.height = Number(e.PixelYDimension.value);
        if (e.Orientation?.value) exif.orientation = Number(e.Orientation.value);
      }

      if (tags.gps) {
        if (typeof tags.gps.Latitude === 'number') exif.latitude = tags.gps.Latitude;
        if (typeof tags.gps.Longitude === 'number') exif.longitude = tags.gps.Longitude;
      }

      if (tags.iptc) {
        const i = tags.iptc;
        if (i['Object Name']?.description) exif.title = i['Object Name'].description;
        if (i.Caption?.description) exif.caption = i.Caption.description;
        if (i['Copyright Notice']?.description) exif.copyright = i['Copyright Notice'].description;
        if (i['By-line']?.description) exif.creator = i['By-line'].description;
        if (i.Keywords) {
          if (Array.isArray(i.Keywords)) {
            exif.keywords = i.Keywords.map((k: any) => k.description || String(k));
          } else if (i.Keywords.description) {
            exif.keywords = [i.Keywords.description];
          }
        }
      }

      return exif;
    } catch (err) {
      console.warn('EXIF parsing fallback:', err);
      return {};
    }
  }
}
