/**
 * Handles MP4/WebM video export using MediaRecorder API
 */
export class VideoExporter {
  constructor() {
    this.isRecording = false;
    this.mediaRecorder = null;
    this.chunks = [];
    this.frameCount = 0;
    this.targetFrames = 0;
    this.onComplete = null;
    this.stream = null;
  }

  startRecording(canvas, framesPerRound, onComplete) {
    this.isRecording = true;
    this.frameCount = 0;
    this.targetFrames = framesPerRound * 2; // 2 full rotations
    this.onComplete = onComplete;
    this.chunks = [];

    console.log(`Starting video recording: ${this.targetFrames} frames`);

    try {
      // Get the canvas element
      const canvasElement = canvas.elt || canvas;

      // Create stream from canvas at 30fps (reduces recording overhead significantly)
      this.stream = canvasElement.captureStream(30);

      // Check available MIME types
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4'
      ];

      let selectedMimeType = null;
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        throw new Error('No supported video MIME type found');
      }

      console.log(`Using MIME type: ${selectedMimeType}`);

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 2500000 // 2.5 Mbps - good quality, less overhead
      });

      // Handle data available
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      // Handle recording stop
      this.mediaRecorder.onstop = () => {
        console.log('Recording stopped, processing video...');

        // Create blob from chunks
        const blob = new Blob(this.chunks, { type: selectedMimeType });

        // Download the file
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const extension = selectedMimeType.includes('mp4') ? 'mp4' : 'webm';
        a.download = `linkage-${Date.now()}.${extension}`;
        a.click();
        URL.revokeObjectURL(url);

        // Cleanup
        this.cleanup();

        if (this.onComplete) {
          this.onComplete();
        }
      };

      // Start recording
      this.mediaRecorder.start();

    } catch (error) {
      console.error('Error starting video recording:', error);
      this.cleanup();
      if (this.onComplete) {
        this.onComplete();
      }
    }
  }

  updateFrameCount() {
    if (!this.isRecording) return false;

    this.frameCount++;

    // Check if we've captured enough frames
    if (this.frameCount >= this.targetFrames) {
      console.log(`Recording complete: captured ${this.frameCount} frames`);
      this.stopRecording();
      return true;
    }

    return false;
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.isRecording = false;
  }

  cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.chunks = [];
  }

  isCurrentlyRecording() {
    return this.isRecording;
  }

  cancel() {
    this.stopRecording();
    this.cleanup();
  }
}
