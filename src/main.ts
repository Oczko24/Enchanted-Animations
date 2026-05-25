import {Plugin, Modal} from 'obsidian';
import {DEFAULT_SETTINGS, EnchantedAnimationsSettings, EnchantedAnimationsSettingTab} from "./settings";

export default class EnchantedAnimationsPlugin extends Plugin {
	settings: EnchantedAnimationsSettings;
	originalModalClose: Function;
	originalSettingClose: Function;

	async onload() {
		console.log('Loading Enchanted Animations...');
		await this.loadSettings();
		this.applyStyles();

		const isFirstLoad = !this.app.workspace.layoutReady;
		if (isFirstLoad) {
			if (this.settings.enableSplashScreen) {
				document.body.classList.add('enchanted-animations-startup');
				const animationDurationMs = Math.max(1000, this.settings.speed * 5000);
				
				setTimeout(() => {
					document.body.classList.remove('enchanted-animations-startup');
				}, animationDurationMs);
			}
		}

		this.app.workspace.onLayoutReady(() => {
			this.setupSidebarVelocity();
		});

		// Re-trigger note animation when switching between existing .md tabs
		let lastActiveFile = '';
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				const currentFile = this.app.workspace.getActiveFile();
				const currentFilePath = currentFile ? currentFile.path : '';
				
				if (currentFilePath !== lastActiveFile) {
					lastActiveFile = currentFilePath;
					
					if (this.settings.animateNoteOpen && currentFile) {
						document.body.classList.remove('animate-note-open');
						// Force a reflow to restart CSS animations
						void document.body.offsetWidth;
						document.body.classList.add('animate-note-open');
					}
				}
			})
		);

		this.patchModalClose();
		this.addSettingTab(new EnchantedAnimationsSettingTab(this.app, this));
	}

	onunload() {
		console.log('Unloading Enchanted Animations...');

		this.unpatchModalClose();

		document.body.style.removeProperty('--enchanted-animations-speed');
		document.body.style.removeProperty('--enchanted-animations-easing');

		document.body.classList.remove('animate-note-open');
		document.body.classList.remove('disable-splash-screen');
		document.body.classList.remove('disable-header-animations');
		document.body.classList.remove('disable-formatting-animations');
		document.body.classList.remove('disable-modal-animation');
		document.body.classList.remove('disable-native-animations');
		document.body.classList.remove('ea-smooth-scroll');
		document.body.classList.remove('ea-gpu-accel');
		document.body.classList.remove('enchanted-animations-startup');
		document.body.classList.remove('ea-status-bar-hover');
		document.body.classList.remove('ea-fold-hover');
		document.body.classList.remove('ea-card-hover');
	}

	patchModalClose() {
		this.originalModalClose = Modal.prototype.close;
		const plugin = this;

		Modal.prototype.close = function() {
			if (!plugin.settings.enableModalAnimations) {
				plugin.originalModalClose.call(this);
				return;
			}

			let container = this.containerEl;
			if (container && !container.classList.contains('modal-container')) {
				container = container.closest('.modal-container') as HTMLElement;
			}

			if (container && !container.classList.contains('is-closing')) {
				container.classList.add('is-closing');
				const durationMs = plugin.settings.speed * 700;
				
				setTimeout(() => {
					container.classList.remove('is-closing');
					plugin.originalModalClose.call(this);
				}, Math.max(0, durationMs - 10));
			} else {
				plugin.originalModalClose.call(this);
			}
		};

		// Specific patch for the app.setting modal as it sometimes handles its own unmount
		// wrapping it in a setTimeout for next tick in case app.setting isn't fully ready immediately.
		setTimeout(() => {
			if ((this.app as any).setting && (this.app as any).setting.close) {
				this.originalSettingClose = (this.app as any).setting.close;
				(this.app as any).setting.close = function() {
					if (!plugin.settings.enableModalAnimations) {
						plugin.originalSettingClose.call(this);
						return;
					}

					let container = this.containerEl || document.querySelector('.modal-container.mod-settings');
					if (container && !container.classList.contains('is-closing')) {
						container.classList.add('is-closing');
						const durationMs = plugin.settings.speed * 700;
						
						setTimeout(() => {
							container.classList.remove('is-closing');
							plugin.originalSettingClose.call(this);
						}, Math.max(0, durationMs - 10));
					} else {
						plugin.originalSettingClose.call(this);
					}
				};
			}
		}, 0);
	}

	unpatchModalClose() {
		if (this.originalModalClose) {
			Modal.prototype.close = this.originalModalClose as any;
		}
		if (this.originalSettingClose && (this.app as any).setting) {
			(this.app as any).setting.close = this.originalSettingClose as any;
		}
	}

	setupSidebarVelocity() {
		// Calculate sidebar width and set it as a variable so CSS can calculate velocity (px/s)
		const sidebars = document.querySelectorAll('.workspace-split.mod-sidedock');
		const ro = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const el = entry.target as HTMLElement;
				// Only update if it has a meaningful width (not collapsed)
				if (el.clientWidth > 50) {
					el.style.setProperty('--ea-sidebar-width', el.clientWidth.toString());
				}
			}
		});
		sidebars.forEach(s => ro.observe(s));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<EnchantedAnimationsSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	applyStyles() {
		document.body.style.setProperty('--enchanted-animations-speed-num', this.settings.speed.toString());
		document.body.style.setProperty('--enchanted-animations-speed', `${this.settings.speed}s`);
		document.body.style.setProperty('--enchanted-animations-easing', this.settings.easing);

		document.body.classList.toggle('animate-note-open', this.settings.animateNoteOpen);
		document.body.classList.toggle('disable-splash-screen', !this.settings.enableSplashScreen);
		document.body.classList.toggle('disable-header-animations', !this.settings.enableHeaderAnimations);
		document.body.classList.toggle('disable-formatting-animations', !this.settings.enableFormattingAnimations);
		document.body.classList.toggle('disable-modal-animation', !this.settings.enableModalAnimations);
		document.body.classList.toggle('disable-native-animations', !this.settings.enableNativeAnimations);
		document.body.classList.toggle('ea-smooth-scroll', this.settings.enableSmoothScroll);
		document.body.classList.toggle('ea-gpu-accel', this.settings.enableGpuAcceleration);
		document.body.classList.toggle('ea-status-bar-hover', this.settings.enableStatusBarHover);
		document.body.classList.toggle('ea-fold-hover', this.settings.enableFoldHover);
		document.body.classList.toggle('ea-card-hover', this.settings.enableCardHover);
	}
}
