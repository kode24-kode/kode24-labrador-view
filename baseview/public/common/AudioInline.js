export class AudioInline {

    constructor(container) {
        this.url = container.dataset.src;
        if (!this.url) {
            console.error('AudioInline: "data-src" attribute missing. Cannot play audio.');
            return;
        }
        this.container = container;
        this.state = {
            playing: false
        };
        this.setup();
    }

    setup() {
        this.container.addEventListener('click', (event) => {
            event.preventDefault();
            this.loadAudio();
        });
        this.container.classList.add('fi-play');
    }

    loadAudio() {
        if (this.player) {
            this.togglePlayer();
            return;
        }
        this.player = this.createPlayer(this.url);
        this.togglePlayer();
    }

    togglePlayer() {
        if (this.state.playing) {
            this.player.pause();
        } else {
            this.player.play();
        }
        this.container.classList.toggle('fi-play');
        this.container.classList.toggle('fi-pause');
        this.state.playing = !this.state.playing;
    }

    updateProgress() {
        const progress = this.player.currentTime / this.player.duration;
        this.container.setAttribute('style', `--progress-value: ${ progress.toFixed(4) * 100 }%`);
    }

    updateClass() {
        if (this.state.playing) {
            this.container.classList.remove('fi-play');
            this.container.classList.add('fi-pause');
        } else {
            this.container.classList.remove('fi-pause');
            this.container.classList.add('fi-play');
        }
    }

    createPlayer(url) {
        this.container.classList.add('audio-inline-loading');
        const player = document.createElement('audio');
        player.addEventListener('timeupdate', (event) => {
            this.updateProgress();
        });
        player.addEventListener('loadeddata', (event) => {
            this.container.classList.remove('audio-inline-loading');
        });
        player.addEventListener('play', () => {
            this.state.playing = true;
            this.updateClass();
        });
        player.addEventListener('pause', () => {
            this.state.playing = false;
            this.updateClass();
        });
        player.addEventListener('ended', () => {
            this.state.playing = false;
            this.updateClass();
        });
        player.classList.add('audio-inline-src');
        player.src = url;
        document.body.appendChild(player);
        return player;
    }

}
