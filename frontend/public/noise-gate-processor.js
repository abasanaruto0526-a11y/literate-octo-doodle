/**
 * ノイズゲート AudioWorklet プロセッサー
 * 一定音量以下の音声をミュートする
 */
class NoiseGateProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._threshold = 0.02; // 既定のノイズ閾値
    this._holdTime = 0.3;   // ゲートが閉じるまでの保持時間(秒)
    this._holdSamples = 0;
    this._isOpen = false;

    this.port.onmessage = (e) => {
      if (e.data.threshold !== undefined) {
        this._threshold = e.data.threshold;
      }
    };
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input[0]) return true;

    const inputChannel = input[0];
    const outputChannel = output[0];

    // RMS（実効値）で音量を計測
    let rms = 0;
    for (let i = 0; i < inputChannel.length; i++) {
      rms += inputChannel[i] * inputChannel[i];
    }
    rms = Math.sqrt(rms / inputChannel.length);

    if (rms > this._threshold) {
      this._isOpen = true;
      this._holdSamples = this._holdTime * sampleRate;
    } else if (this._holdSamples > 0) {
      this._holdSamples -= inputChannel.length;
    } else {
      this._isOpen = false;
    }

    // ゲートが開いていれば通過、閉じていれば無音
    for (let i = 0; i < inputChannel.length; i++) {
      outputChannel[i] = this._isOpen ? inputChannel[i] : 0;
    }

    // 音量レベルをメインスレッドへ送信
    this.port.postMessage({ rms, isOpen: this._isOpen });

    return true;
  }
}

registerProcessor('noise-gate-processor', NoiseGateProcessor);
