import confetti from 'canvas-confetti';

export function triggerDownload(data, filename) {
  let blob;
  if (data instanceof Blob) {
    blob = data;
  } else if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
    blob = new Blob([data], { type: 'application/pdf' });
  } else {
    blob = new Blob([data]);
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Trigger celebratory confetti
  try {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.8 }
    });
  } catch {}
}
