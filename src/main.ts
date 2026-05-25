import {Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, SmoothObsidianSettings, SmoothObsidianSettingTab} from "./settings";

export default class SmoothObsidianPlugin extends Plugin {
	settings: SmoothObsidianSettings;

	async onload() {
		console.log('Loading Smooth Obsidian...');
		await this.loadSettings();
		this.applyStyles();

		const isFirstLoad = !(window as any)._smoothObsidianLoaded;
		if (isFirstLoad) {
			(window as any)._smoothObsidianLoaded = true;

			if (this.settings.enableSplashScreen) {
				document.body.classList.add('smooth-obsidian-startup');
				const animationDurationMs = Math.max(1000, this.settings.speed * 5000);
				
				setTimeout(() => {
					document.body.classList.remove('smooth-obsidian-startup');
				}, animationDurationMs);
			}
		}

		this.addSettingTab(new SmoothObsidianSettingTab(this.app, this));
	}

	onunload() {
		console.log('Unloading Smooth Obsidian...');

		document.body.style.removeProperty('--smooth-obsidian-speed');
		document.body.style.removeProperty('--smooth-obsidian-easing');

		document.body.classList.remove('animate-note-open');
		document.body.classList.remove('disable-splash-screen');
		document.body.classList.remove('disable-header-animations');
		document.body.classList.remove('disable-formatting-animations');
		document.body.classList.remove('disable-modal-animation');
		document.body.classList.remove('smooth-obsidian-startup');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<SmoothObsidianSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	applyStyles() {
		document.body.style.setProperty('--smooth-obsidian-speed', `${this.settings.speed}s`);
		document.body.style.setProperty('--smooth-obsidian-easing', this.settings.easing);

		document.body.classList.toggle('animate-note-open', this.settings.animateNoteOpen);
		document.body.classList.toggle('disable-splash-screen', !this.settings.enableSplashScreen);
		document.body.classList.toggle('disable-header-animations', !this.settings.enableHeaderAnimations);
		document.body.classList.toggle('disable-formatting-animations', !this.settings.enableFormattingAnimations);
		document.body.classList.toggle('disable-modal-animation', !this.settings.enableModalAnimations);
	}
}
