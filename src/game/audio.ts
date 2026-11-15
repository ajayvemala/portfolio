// Original synthesized soundscape. No recordings or third-party audio assets.
class Soundscape {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private motor: OscillatorNode | null = null
  private motorGain: GainNode | null = null
  private engineHarmonic: OscillatorNode | null = null
  private motorFilter: BiquadFilterNode | null = null
  private noise: AudioBuffer | null = null
  private ambience: AudioBufferSourceNode | null = null
  private enabled = false
  private volume = 0.28
  private lastCollision = 0
  private lastBrake = 0
  private nextBird = 3

  async start() {
    if (!this.context) {
      this.context = new AudioContext()
      const c = this.context
      this.master = c.createGain()
      this.master.gain.value = 0
      this.master.connect(c.destination)
      this.motor = c.createOscillator()
      this.motor.type = 'sawtooth'
      this.motor.frequency.value = 38
      this.motorGain = c.createGain()
      this.motorGain.gain.value = 0
      const filter = c.createBiquadFilter()
      this.motorFilter = filter
      filter.type = 'lowpass'
      filter.frequency.value = 230
      this.motor.connect(filter).connect(this.motorGain).connect(this.master)
      this.motor.start()
      this.engineHarmonic = c.createOscillator()
      this.engineHarmonic.type = 'triangle'
      this.engineHarmonic.frequency.value = 76
      const harmonicGain = c.createGain()
      harmonicGain.gain.value = .3
      this.engineHarmonic.connect(harmonicGain).connect(filter)
      this.engineHarmonic.start()
      this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate)
      const samples = this.noise.getChannelData(0)
      let smooth = 0
      for (let i = 0; i < samples.length; i++) { smooth = smooth * 0.94 + (Math.random() * 2 - 1) * 0.06; samples[i] = smooth }
      this.ambience = c.createBufferSource()
      this.ambience.buffer = this.noise
      this.ambience.loop = true
      const ambienceGain = c.createGain()
      ambienceGain.gain.value = 0.22
      this.ambience.connect(ambienceGain).connect(this.master)
      this.ambience.start()
    }
    if (this.context.state === 'suspended') await this.context.resume()
    this.applyVolume()
  }

  setEnabled(value: boolean) { this.enabled = value; this.applyVolume() }
  setVolume(value: number) { this.volume = value; this.applyVolume() }
  private applyVolume() {
    if (this.context && this.master) this.master.gain.setTargetAtTime(this.enabled ? this.volume : 0, this.context.currentTime, 0.08)
  }
  update(speed: number, throttle: number, brake: boolean) {
    if (!this.context || !this.motor || !this.motorGain) return
    const now = this.context.currentTime
    const rpm = 38 + Math.min(Math.abs(speed), 22) * 4 + Math.abs(throttle) * 22
    this.motor.frequency.setTargetAtTime(rpm, now, 0.12)
    this.engineHarmonic?.frequency.setTargetAtTime(rpm * 2.02, now, .12)
    this.motorFilter?.frequency.setTargetAtTime(240 + Math.abs(throttle) * 280 + Math.abs(speed) * 9, now, .15)
    this.motorGain.gain.setTargetAtTime(0.055 + Math.min(Math.abs(speed) / 90, 0.18) + Math.abs(throttle) * 0.075, now, 0.15)
    if (this.enabled && now > this.nextBird) { this.nextBird = now + 6 + Math.random() * 7; this.birds() }
    if (brake && Math.abs(speed) > 8 && now - this.lastBrake > 0.45) { this.lastBrake = now; this.burst(0.1, 0.09, 1100) }
  }
  collision(intensity: number) {
    if (!this.context || this.context.currentTime - this.lastCollision < 0.22) return
    this.lastCollision = this.context.currentTime
    this.burst(Math.min(Math.max(intensity * 0.25, 0.05), 0.35), 0.17, 190)
  }
  private birds() {
    if (!this.context || !this.master) return
    const c = this.context
    for (let i = 0; i < 3; i++) {
      const start = c.currentTime + i * .19
      const bird = c.createOscillator()
      const gain = c.createGain()
      const pan = c.createStereoPanner()
      pan.pan.value = Math.sin(start * .7) * .65
      bird.type = 'sine'
      bird.frequency.setValueAtTime(1900 + i * 160, start)
      bird.frequency.exponentialRampToValueAtTime(3200 + i * 120, start + .055)
      bird.frequency.exponentialRampToValueAtTime(2200, start + .14)
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(.025, start + .025)
      gain.gain.exponentialRampToValueAtTime(.001, start + .16)
      bird.connect(gain).connect(pan).connect(this.master)
      bird.start(start); bird.stop(start + .17)
      bird.onended = () => { bird.disconnect(); gain.disconnect(); pan.disconnect() }
    }
  }
  private burst(volume: number, duration: number, frequency: number) {
    if (!this.context || !this.noise || !this.master) return
    const c = this.context
    const source = c.createBufferSource()
    source.buffer = this.noise
    const filter = c.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = frequency
    const gain = c.createGain()
    gain.gain.setValueAtTime(volume, c.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
    source.connect(filter).connect(gain).connect(this.master)
    source.start()
    source.stop(c.currentTime + duration)
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect() }
  }
  interact() {
    if (!this.context || !this.master) return
    const c = this.context
    const oscillator = c.createOscillator()
    const gain = c.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(540, c.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(820, c.currentTime + 0.11)
    gain.gain.setValueAtTime(0.08, c.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18)
    oscillator.connect(gain).connect(this.master)
    oscillator.start()
    oscillator.stop(c.currentTime + 0.19)
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
  }
  dispose() {
    this.motor?.stop(); this.engineHarmonic?.stop(); this.ambience?.stop()
    void this.context?.close()
    this.context = null; this.motor = null; this.engineHarmonic = null; this.motorFilter = null; this.ambience = null
  }
}

export const audioSystem = new Soundscape()
