import EncoderWav from "./encoder-wav-worker.js"

/**
 * AudioWorkService
 * WebAudioAPI
 */
export default class AudioWorkService {

    /**
     * 생성자
     * @param {Map} config 서비스 설정
     * @public
     */
    constructor (config) {
        // Set user config
        this.config = {};
        this.config.debugLog = config.debugLog ?? false;
        this.config.sampleRate = config.sampleRate ?? 16000;

        this._debug(() => console.log("AudioWorkService: Configuration", this.config));
        
        // Dedicated DOM Event manager
        this.eventManager = document.createDocumentFragment();

        // Type of audio
        this.encoderMimeType = "audio/wav";
        
        // Create WAV Worker
        this.encoderWorker = this.createWorker(EncoderWav);
        
        // Add event listener for worker encoding done
        this.encoderWorker.addEventListener('message', (e) => {
            // Create audio data blob
            let event = new Event('dataavailable');
            event.data = new Blob(e.data, { type: this.encoderMimeType });

            this._onDataAvailable(event);
        })
    }

    /**
     * 인코딩 Worker 생성
     * @param {*} fn Worker script
     * @returns {Worker} 인코딩 Worker
     */
    createWorker(fn) {
        let js = fn
            .toString()
            .replace(/^function.*\(\)\s*{/g, '')
            .replace(/}$/, '');

        let blob = new Blob([js]);

        return new Worker(URL.createObjectURL(blob));
    }

    /**
     * URL에서 오디오 데이터 로드
     * @param {String} url
     * @public
     */
    loadFromUrl(url) {
        this.xhr = new XMLHttpRequest();

        this.xhr.open("GET", url, true);
        this.xhr.responseType = "arraybuffer";

        this.xhr.onload = () => {
            this._debug(() => console.log("AudioWorkService: load audio file from url"));
            this.audioData = this.xhr.response
            this._load(this.audioData);
        };
                
        return this;
    }

    /**
     * 오디오 데이터 로드
     * @param arrayBuffer
     * @public
     */
    load(arrayBuffer) {
        this.audioData = arrayBuffer;

        return this;
    }

    /**
     * 오디오 데이터 디코딩
     * @param arrayBuffer
     * @private
     */
    _load(arrayBuffer) {
        this._debug(() => console.log("AudioWorkService: load audio buffer from audio data"));

        let offlineAudioCtx = new OfflineAudioContext(1, this.config.sampleRate * 50, this.config.sampleRate);
        offlineAudioCtx.decodeAudioData(arrayBuffer, (decodedData) => {
            this._debug(() => console.log("AudioWorkService: decode audio data", decodedData));
            this.eventManager.dispatchEvent(new CustomEvent("loaded", { detail: { decodedData: decodedData } }));
        });
    }

    /**
     * 특정 길이 오디오 추출
     * @param from 추출 시작 지점
     * @param to 추출 끝 지점
     * @public
     */
    extract(from, to) {
        if (from >= to) {
            this._debug(() => onsole.log("AudioWorkService: 'from' time must be equal or less than 'to'. now:", from, ">=", to));
            return;
        }

        let start = from * this.config.sampleRate;
        let end = to * this.config.sampleRate;
        
        this.eventManager.addEventListener("loaded", (event) => {
            const audioBuffer = event.detail.decodedData;
            if (audioBuffer.length < end) {
                this._debug(() => console.log("AudioWorkService: 'to' time must be less than audio length. now:", audioBuffer.duration, "<", to));
                return;
            }

            let array = Float32Array.from(audioBuffer.getChannelData(0));
            let sliced = array.slice(start, end);
            
            this._debug(() => console.log("AudioWorkService: Extracted audio from", start, "to", end, sliced));
            this.encoderWorker.postMessage(["dump", this.config.sampleRate, sliced]);

            this.eventManager.removeEventListener("loaded", null);
        });
        
        if (this.xhr) {
            this.xhr.send();
        } else { 
            this._load(this.audioData);
        }

        return this;
    }

    /**
     * 인스턴스 정리
     * @public
     */
    destroy() {
        this.xhr = null;
        this.offlineAudioCtx = null;
        this.eventManager.removeEventListener("loaded", null);
        this.eventManager.removeEventListener("encoded", null);
        this.encoderWorker.postMessage(["close"]);
    }
    
    /**
     * 인코딩 완료 이벤트
     * @param event
     * @public
     */
    onEncoded(callback) {
        this.eventManager.addEventListener("encoded", (event) => {
            callback(event.detail.encoded);
            this.eventManager.removeEventListener("encoded", null);
        });

        return this;
    }

    /**
     * 오류 발생 이벤트
     * @param event
     * @public
     */
    onError(callback) {
        this.eventManage.addEventListener("error", (event) => callback(event));
    }

    _onDataAvailable(event) {
        this._debug(() => console.log("AudioWorkService: DataAvailable", event));
        let blob = new Blob([event.data], { type: event.data.type });
        let blobUrl = URL.createObjectURL(blob);

        const encoded = {
            timestamp: new Date().getTime(),
            blob: blob,
            blobUrl: blobUrl,
            mimeType: blob.type,
            size: blob.size
        };

        this.eventManager.dispatchEvent(new CustomEvent("encoded", { detail: { encoded: encoded } }));
    }

    _debug(run) {
        if (this.config.debugLog && run) {
            run();
        }
    }
}
