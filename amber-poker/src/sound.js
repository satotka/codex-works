export class Sound {
  enabled=true;
  play(type) {
    if(!this.enabled)return;
    try {this.ctx??=new (window.AudioContext||window.webkitAudioContext)();this.ctx.resume();const sequences={bet:[400],deal:[260,390,520],hold:[660],draw:[330,440],win:[523,659,784,1047],doubleWin:[659,784,1047,1319],doubleLose:[220,165,110],push:[440,440],collect:[784,659,523]};
      (sequences[type]||[400]).forEach((f,i)=>{const o=this.ctx.createOscillator(),g=this.ctx.createGain(),t=this.ctx.currentTime+i*.095;o.type='square';o.frequency.value=f;g.gain.setValueAtTime(.035,t);g.gain.exponentialRampToValueAtTime(.001,t+.085);o.connect(g);g.connect(this.ctx.destination);o.start(t);o.stop(t+.09);});
    }catch{/* Audio availability must not block gameplay. */}
  }
}
