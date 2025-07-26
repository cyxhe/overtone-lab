let audioCtx;

const voiceData = {
    1: {
        fundamentalOsc: null,
        fundamentalGain: null,
        overtoneNodes: [],
        freqInput: document.getElementById("freqInput1"),
        freqSlider: document.getElementById("freqSlider1"),
        ampSlider: document.getElementById("ampSlider1"),
        overtonesContainer: document.getElementById("overtonesContainer1"),
        addOvertoneButton: document.getElementById("addOvertoneButton1"),
        playButton: document.getElementById("playButton1"),
        stopButton: document.getElementById("stopButton1"),
    },
    2: {
        fundamentalOsc: null,
        fundamentalGain: null,
        overtoneNodes: [],
        freqInput: document.getElementById("freqInput2"),
        freqSlider: document.getElementById("freqSlider2"),
        ampSlider: document.getElementById("ampSlider2"),
        overtonesContainer: document.getElementById("overtonesContainer2"),
        addOvertoneButton: document.getElementById("addOvertoneButton2"),
        playButton: document.getElementById("playButton2"),
        stopButton: document.getElementById("stopButton2"),
    }
};

function createAudioContext() {
    if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function isVoicePlaying(voiceNum) {
    const voice = voiceData[voiceNum];
    return voice.fundamentalOsc !== null;
}


function stopVoice(voiceNum) {
    const voice = voiceData[voiceNum];
    if (voice.fundamentalOsc) {
        voice.fundamentalOsc.stop();
        voice.fundamentalOsc.disconnect();
        voice.fundamentalOsc = null;
    }
    voice.overtoneNodes.forEach(({ osc, gain }) => {
        if (osc) osc.stop();
        if (gain) gain.disconnect();
    });
    voice.overtoneNodes = [];
    if (voice.fundamentalGain) {
        voice.fundamentalGain.disconnect();
        voice.fundamentalGain = null;
    }
}

function playVoice(voiceNum) {
    const voice = voiceData[voiceNum];
    const freq = parseFloat(voice.freqInput.value);
    const amp = parseFloat(voice.ampSlider.value);

    if (isNaN(freq) || freq <= 0) {
        alert(`Please enter a valid frequency above 0 Hz for Voice ${voiceNum}.`);
        return;
    }

    createAudioContext();

    stopVoice(voiceNum); // stop any existing sound for this voice

    voice.fundamentalOsc = audioCtx.createOscillator();
    voice.fundamentalGain = audioCtx.createGain();

    voice.fundamentalOsc.type = "sine";
    voice.fundamentalOsc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    voice.fundamentalGain.gain.setValueAtTime(amp, audioCtx.currentTime);

    voice.fundamentalOsc.connect(voice.fundamentalGain);
    voice.fundamentalGain.connect(audioCtx.destination);
    voice.fundamentalOsc.start();

    const overtoneElements = voice.overtonesContainer.querySelectorAll('[data-overtone]');
    overtoneElements.forEach(overtoneEl => {
        const ratioInput = overtoneEl.querySelector('.ratioInput');
        const ampInput = overtoneEl.querySelector('.ampInput');
        const muteCheckbox = overtoneEl.querySelector('.muteCheckbox');

        const overtoneOsc = audioCtx.createOscillator();
        const overtoneGain = audioCtx.createGain();

        const ratio = parseFloat(ratioInput.value);
        const overtoneFreq = freq * ratio;
        const overtoneAmp = parseFloat(ampInput.value);

        overtoneOsc.type = "sine";
        overtoneOsc.frequency.setValueAtTime(overtoneFreq, audioCtx.currentTime);
        overtoneGain.gain.setValueAtTime(muteCheckbox.checked ? 0 : overtoneAmp, audioCtx.currentTime);

        overtoneOsc.connect(overtoneGain);
        overtoneGain.connect(audioCtx.destination);
        overtoneOsc.start();

        voice.overtoneNodes.push({
            osc: overtoneOsc,
            gain: overtoneGain,
            ratio: ratioInput,
            amp: ampInput,
            mute: muteCheckbox
        });

        // Update frequency in real time when ratio changes
        ratioInput.addEventListener("input", () => {
            const updatedRatio = parseFloat(ratioInput.value);
            overtoneOsc.frequency.setValueAtTime(freq * updatedRatio, audioCtx.currentTime);
        });

        // Update amplitude in real time when amp changes
        ampInput.addEventListener("input", () => {
            const ampVal = parseFloat(ampInput.value);
            if (!muteCheckbox.checked) {
                overtoneGain.gain.setValueAtTime(ampVal, audioCtx.currentTime);
            }
        });

        // Mute/unmute overtone
        muteCheckbox.addEventListener("change", () => {
            if (muteCheckbox.checked) {
                overtoneGain.gain.setValueAtTime(0, audioCtx.currentTime);
            } else {
                overtoneGain.gain.setValueAtTime(parseFloat(ampInput.value), audioCtx.currentTime);
            }
        });
    });
}

// Update fundamental frequency in real time
function setupFreqAmpControls(voiceNum) {
    const voice = voiceData[voiceNum];

    // Sync number input and slider for frequency
    voice.freqInput.addEventListener("input", () => {
        let val = parseFloat(voice.freqInput.value);
        if (isNaN(val) || val < 0) return;

        if (val > 2000) val = 2000;
        voice.freqInput.value = val;
        voice.freqSlider.value = val;

        if (voice.fundamentalOsc) {
            voice.fundamentalOsc.frequency.setValueAtTime(val, audioCtx.currentTime);
            voice.overtoneNodes.forEach(({ osc, ratio }) => {
                const ratioVal = parseFloat(ratio.value);
                osc.frequency.setValueAtTime(val * ratioVal, audioCtx.currentTime);
            });
        }
    });

    voice.freqSlider.addEventListener("input", () => {
        const val = parseFloat(voice.freqSlider.value);
        voice.freqInput.value = val;

        if (voice.fundamentalOsc) {
            voice.fundamentalOsc.frequency.setValueAtTime(val, audioCtx.currentTime);
            voice.overtoneNodes.forEach(({ osc, ratio }) => {
                const ratioVal = parseFloat(ratio.value);
                osc.frequency.setValueAtTime(val * ratioVal, audioCtx.currentTime);
            });
        }
    });

    // Amplitude slider as before
    voice.ampSlider.addEventListener("input", () => {
      if (voice.fundamentalGain) {
          const amp = parseFloat(voice.ampSlider.value);
          voice.fundamentalGain.gain.setValueAtTime(amp, audioCtx.currentTime);
          updateOvertoneGains(voiceNum);
      }
    });
}

function addOvertone(voiceNum) {
    const voice = voiceData[voiceNum];

    const container = document.createElement("div");
    container.setAttribute("data-overtone", "");

    const ratioInput = document.createElement("input");
    ratioInput.type = "number";
    ratioInput.step = "0.01";
    ratioInput.value = "1.0";
    ratioInput.classList.add("ratioInput");

    const ampInput = document.createElement("input");
    ampInput.type = "number";
    ampInput.step = "0.01";
    ampInput.value = "1.0";
    ampInput.classList.add("ampInput");

    const muteCheckbox = document.createElement("input");
    muteCheckbox.type = "checkbox";
    muteCheckbox.classList.add("muteCheckbox");

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";

    container.appendChild(document.createTextNode("Ratio: "));
    container.appendChild(ratioInput);
    container.appendChild(document.createTextNode(" Amplitude Multiplier: "));
    container.appendChild(ampInput);
    container.appendChild(document.createTextNode(" Mute: "));
    container.appendChild(muteCheckbox);
    container.appendChild(deleteButton);

    voice.overtonesContainer.appendChild(container);

    // Rebind update listeners
    ampInput.addEventListener("input", () => updateOvertoneGains(voiceNum));
    muteCheckbox.addEventListener("change", () => updateOvertoneGains(voiceNum));
    ratioInput.addEventListener("input", () => updateOvertoneFrequencies(voiceNum));

    deleteButton.addEventListener("click", () => {
        container.remove();
        if (isVoicePlaying(voiceNum)) {
        playVoice(voiceNum);
        drawSpectrum();
        } else {
            drawSpectrum(); // update visual preview only
        }
    });

    // Rebuild voice audio to include this new overtone
    if (isVoicePlaying(voiceNum)) {
        playVoice(voiceNum);
        drawSpectrum();
    } else {
        drawSpectrum(); // update visual preview only
    }
}


function updateOvertoneGains(voiceNum) {
    const voice = voiceData[voiceNum];
    const baseAmp = parseFloat(voice.ampSlider.value);

    voice.overtoneNodes.forEach(({ gain, amp, mute }) => {
        const multiplier = parseFloat(amp.value);
        const effectiveAmp = mute.checked ? 0 : baseAmp * multiplier;
        gain.gain.setValueAtTime(effectiveAmp, audioCtx.currentTime);
    });
}

function updateOvertoneFrequencies(voiceNum) {
    const voice = voiceData[voiceNum];
    const freq = parseFloat(voice.freqInput.value);

    voice.overtoneNodes.forEach(({ osc, ratio }) => {
        const r = parseFloat(ratio.value);
        if (!isNaN(r)) {
            osc.frequency.setValueAtTime(freq * r, audioCtx.currentTime);
        }
    });

    drawSpectrum();
}


// Setup buttons and controls for each voice
function setupVoice(voiceNum) {
    const voice = voiceData[voiceNum];

    voice.addOvertoneButton.addEventListener("click", () => addOvertone(voiceNum));
    voice.playButton.addEventListener("click", () => playVoice(voiceNum));
    voice.stopButton.addEventListener("click", () => stopVoice(voiceNum));

    setupFreqAmpControls(voiceNum);
}

// Initialize both voices
setupVoice(1);
setupVoice(2);
