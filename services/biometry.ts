
import { SampleFormat, SdkEventListener } from '../types';

export class DigitalPersonaService {
  private reader: any;
  private isConnected: boolean = false;
  private acquisitionStarted: boolean = false;
  private currentFormat: SampleFormat = SampleFormat.PngImage;

  constructor() {
    // Lazy initialization handled in getReader
  }

  public isSdkLoaded(): boolean {
    return typeof window.Fingerprint !== 'undefined';
  }

  private getReader() {
    if (this.reader) return this.reader;

    if (!this.isSdkLoaded()) {
      return null;
    }

    try {
      this.reader = new window.Fingerprint.WebApi();
      return this.reader;
    } catch (e) {
      console.error('Failed to initialize Fingerprint WebApi', e);
      return null;
    }
  }

  public async enumerateDevices(): Promise<string[]> {
    const reader = this.getReader();
    if (!reader) return [];
    try {
      const devices = await reader.enumerateDevices();
      // O SDK pode retornar uma string JSON ou já o array dependendo da versão
      return typeof devices === 'string' ? JSON.parse(devices) : devices;
    } catch (e) {
      console.error('Error enumerating devices', e);
      return [];
    }
  }

  public async startAcquisition(format: SampleFormat = SampleFormat.PngImage, deviceUid?: string): Promise<string> {
    const reader = this.getReader();
    if (!reader) throw new Error("SDK_NOT_LOADED");

    if (this.acquisitionStarted) {
        await this.stopAcquisition();
    }

    let targetUid = deviceUid;
    if (!targetUid) {
        const devices = await this.enumerateDevices();
        if (devices && devices.length > 0) {
            targetUid = devices[0];
        } else {
            throw new Error("NO_DEVICE_FOUND");
        }
    }

    this.currentFormat = format;

    try {
      await reader.startAcquisition(format, targetUid);
      this.acquisitionStarted = true;
      this.isConnected = true;
      console.log(`[Biometry] Started acquisition on ${targetUid}`);
      return targetUid;
    } catch (error) {
      this.acquisitionStarted = false;
      this.isConnected = false;
      console.error('[Biometry] Error starting acquisition:', error);
      throw error;
    }
  }

  public async stopAcquisition(): Promise<void> {
    const reader = this.getReader();
    if (!reader) return;

    try {
      await reader.stopAcquisition();
      this.acquisitionStarted = false;
    } catch (error) {
      console.warn('[Biometry] Error stopping:', error);
    }
  }

  public setListener(listener: SdkEventListener) {
    const reader = this.getReader();
    if (!reader) return;

    reader.onDeviceConnected = (e: any) => {
      this.isConnected = true;
      if (listener.onDeviceConnected) listener.onDeviceConnected(e);
    };

    reader.onDeviceDisconnected = (e: any) => {
      this.isConnected = false;
      this.acquisitionStarted = false;
      if (listener.onDeviceDisconnected) listener.onDeviceDisconnected(e);
    };

    reader.onQualityReported = (e: any) => {
      if (listener.onQualityReported) listener.onQualityReported(e);
    };

    reader.onErrorOccurred = (e: any) => {
      this.acquisitionStarted = false;
      if (listener.onErrorOccurred) listener.onErrorOccurred(e);
    };

    reader.onSamplesAcquired = (s: any) => {
      try {
          const Fingerprint = window.Fingerprint;
          if (!Fingerprint) return;

          let samples: any;
          try {
              samples = JSON.parse(s.samples);
          } catch (e) {
              samples = s.samples;
          }

          let processedData: string = "";

          if (samples && samples.length > 0) {
              if (this.currentFormat === SampleFormat.PngImage) {
                  // Formato PngImage retorna Base64Url que precisa ser convertido para Base64 padrão
                  const raw = samples[0]; 
                  const b64 = Fingerprint.b64UrlTo64(raw);
                  processedData = "data:image/png;base64," + b64;
              } 
              else if (this.currentFormat === SampleFormat.Intermediate || this.currentFormat === SampleFormat.Compressed) {
                  // Outros formatos podem vir encapsulados em objetos Data
                  const sampleObj = samples[0];
                  const rawData = sampleObj.Data || sampleObj;
                  processedData = Fingerprint.b64UrlTo64(rawData);
              } else {
                  // Fallback
                  processedData = JSON.stringify(samples[0]);
              }
          }

          if (listener.onSamplesAcquired) {
              listener.onSamplesAcquired({
                  originalEvent: s,
                  samples: processedData, // Retorna string pronta para uso (src imagem ou hash)
                  format: this.currentFormat
              });
          }

      } catch (e) {
          console.error("[Biometry] Error processing samples:", e);
      }
    };
  }
}

export const biometryService = new DigitalPersonaService();
