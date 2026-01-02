import { ref } from 'vue';
import bwipjs from 'bwip-js';

export function useBarcode() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  const generateBarcode = async (text: string, format: string = 'CODE_128'): Promise<string | null> => {
    loading.value = true;
    error.value = null;

    try {
      // Generate barcode as PNG buffer
      const buffer = await bwipjs.toBuffer({
        bcid: format.toLowerCase().replace('_', ''),
        text: text,
        scale: 3,
        height: 10,
        includetext: false,
        textxalign: 'center',
        backgroundcolor: 'ffffff',
        color: '000000'
      });

      // Convert buffer to data URL
      const blob = new Blob([buffer], { type: 'image/png' });
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      return dataUrl;
    } catch (err: any) {
      error.value = `Failed to generate barcode: ${err.message}`;
      return null;
    } finally {
      loading.value = false;
    }
  };

  const generateQRCode = async (text: string): Promise<string | null> => {
    loading.value = true;
    error.value = null;

    try {
      const buffer = await bwipjs.toBuffer({
        bcid: 'qrcode',
        text: text,
        scale: 3,
        backgroundcolor: 'ffffff',
        color: '000000'
      });

      const blob = new Blob([buffer], { type: 'image/png' });
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      return dataUrl;
    } catch (err: any) {
      error.value = `Failed to generate QR code: ${err.message}`;
      return null;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    error,
    generateBarcode,
    generateQRCode,
  };
}