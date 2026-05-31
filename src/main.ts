import {Plugin, Modal, Menu, Notice} from 'obsidian';
import {DEFAULT_SETTINGS, EnchantedAnimationsSettings, EnchantedAnimationsSettingTab} from "./settings";
import {EnchantedAnimationsController} from "./animations";

export default class EnchantedAnimationsPlugin extends Plugin {
	settings: EnchantedAnimationsSettings;
	originalModalClose: Function;
	originalSettingClose: Function;
	originalMenuUnload: Function;
	originalNoticeHide: Function;
	noticeObserver: MutationObserver | null;
	animationsController: EnchantedAnimationsController;

	async onload() {
		console.log('Enchanted Animations loaded!');
		document.body.classList.add('enchanted-animations-present');
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
			this.setupEditorAnimations();
			this.hijackSelectDropdowns();
			this.setupNoticeObserver();
		});

		// Re-trigger note animation when switching between existing .md tabs
		let lastActiveFile = '';
		
		const blockTransitions = () => {
			document.body.classList.add('ea-note-transitioning');
			setTimeout(() => {
				document.body.classList.remove('ea-note-transitioning');
			}, 400);
		};

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
				
				blockTransitions();
			})
		);
		
		this.registerEvent(
			this.app.workspace.on('layout-change', blockTransitions)
		);

		this.patchModalClose();
		this.patchMenuClose();
		this.patchGraphControls();
		this.patchDocumentSearch();
		this.patchNotice();
		this.addSettingTab(new EnchantedAnimationsSettingTab(this.app, this));
	}

	onunload() {
		console.log('Unloading Enchanted Animations...');

		this.unpatchModalClose();
		this.unpatchMenuClose();
		this.unpatchNotice();
		if (this.noticeObserver) {
			this.noticeObserver.disconnect();
			this.noticeObserver = null;
		}
		if (this.animationsController) {
			this.animationsController.teardown();
		}

		document.body.style.removeProperty('--enchanted-animations-speed');
		document.body.style.removeProperty('--enchanted-animations-easing');

		document.body.classList.remove('enchanted-animations-present');
		document.body.classList.remove('animate-note-open');
		document.body.classList.remove('disable-splash-screen');
		document.body.classList.remove('disable-header-animations');
		document.body.classList.remove('disable-formatting-animations');
		document.body.classList.remove('disable-modal-animation');
		document.body.classList.remove('disable-native-animations');
		document.body.classList.remove('disable-animated-callouts');
		document.body.classList.remove('ea-smooth-scroll');
		document.body.classList.remove('ea-gpu-accel');
		document.body.classList.remove('enchanted-animations-startup');
		document.body.classList.remove('ea-status-bar-hover');
		document.body.classList.remove('ea-fold-hover');
		document.body.classList.remove('ea-card-hover');
		document.body.classList.remove('ea-checkbox-animations');
		document.body.classList.remove('ea-tab-animations');
		document.body.classList.remove('ea-button-animations');
		document.body.classList.remove('ea-link-animations');
		document.body.classList.remove('ea-tag-animations');
		document.body.classList.remove('ea-ribbon-animations');
		document.body.classList.remove('ea-image-animations');
		document.body.classList.remove('ea-autohide-scrollbars');
		document.body.classList.remove('ea-blockquote-animations');
		document.body.classList.remove('ea-tooltip-animations');
		document.body.classList.remove('ea-menu-cascade');
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
				container.dataset.eaAnimated = 'true';
				const isMobileSettings = document.body.classList.contains('is-phone') && container.querySelector('.modal.mod-settings');
				const durationMs = plugin.settings.speed * (isMobileSettings ? 1400 : 700);
				
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
						container.dataset.eaAnimated = 'true';
						const isMobile = document.body.classList.contains('is-phone');
						const durationMs = plugin.settings.speed * (isMobile ? 1400 : 700);
						
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

	patchMenuClose() {
		const plugin = this;

		// We patch unload to create a visual ghost that animates out while the real menu dies instantly,
		// preventing Obsidian's state machine from breaking and menus accumulating.
		if (Menu.prototype.unload) {
			this.originalMenuUnload = Menu.prototype.unload;
			Menu.prototype.unload = function() {
				if (!plugin.settings.enableModalAnimations) {
					return plugin.originalMenuUnload.call(this);
				}

				let container = (this as any).dom as HTMLElement;
				if (container && container.parentNode) {
					const ghost = container.cloneNode(true) as HTMLElement;
					const rect = container.getBoundingClientRect();
					
					ghost.style.position = 'fixed';
					ghost.style.left = rect.left + 'px';
					ghost.style.top = rect.top + 'px';
					ghost.style.width = rect.width + 'px';
					ghost.style.height = rect.height + 'px';
					ghost.style.margin = '0';
					ghost.style.pointerEvents = 'none';
					ghost.style.zIndex = '99999';

					// Prevent children from replaying entrance animations
					ghost.querySelectorAll('*').forEach(el => {
						(el as HTMLElement).style.animationName = 'none';
					});
					
					ghost.classList.add('is-closing');
					document.body.appendChild(ghost);
					
					const isMobile = document.body.classList.contains('is-phone');
					const durationMs = plugin.settings.speed * (isMobile ? 1200 : 400);
					
					setTimeout(() => {
						ghost.remove();
					}, durationMs);
				}

				return plugin.originalMenuUnload.call(this);
			};
		}
	}

	unpatchMenuClose() {
		if (this.originalMenuUnload) {
			Menu.prototype.unload = this.originalMenuUnload as any;
		}
	}

	patchNotice() {
		if (Notice.prototype.hide) {
			this.originalNoticeHide = Notice.prototype.hide;
			const plugin = this;

			Notice.prototype.hide = function() {
				// Extension logic (when offset is > 0)
				if (plugin.settings.noticeDurationOffset > 0) {
					if (!(this as any)._eaDelayed) {
						(this as any)._eaDelayed = true;
						setTimeout(() => {
							plugin.originalNoticeHide.call(this);
						}, plugin.settings.noticeDurationOffset * 1000);
					} else {
						plugin.originalNoticeHide.call(this);
					}
				} else {
					plugin.originalNoticeHide.call(this);
				}
			};
		}
	}

	unpatchNotice() {
		if (this.originalNoticeHide) {
			Notice.prototype.hide = this.originalNoticeHide as any;
		}
	}

	setupNoticeObserver() {
		const noticeContainer = document.body.querySelector('.notice-container');
		if (!noticeContainer) return;

		this.noticeObserver = new MutationObserver((mutations) => {
			if (this.settings.noticeDurationOffset >= 0) return; // Only for shortening

			for (const mutation of mutations) {
				for (const node of Array.from(mutation.addedNodes)) {
					if (node instanceof HTMLElement && node.classList.contains('notice')) {
						const offsetMs = this.settings.noticeDurationOffset * 1000;
						const assumedNative = 4000; // Native notice default is ~4000ms
						let newTimeout = assumedNative + offsetMs;
						if (newTimeout < 0) newTimeout = 0;
						
						setTimeout(() => {
							// We mimic the native hide behavior directly on the DOM element
							node.style.opacity = '0';
							setTimeout(() => {
								if (node.parentElement) {
									node.remove();
								}
							}, 500); // Wait for transition
						}, newTimeout);
					}
				}
			}
		});

		this.noticeObserver.observe(noticeContainer, { childList: true });
	}

	setupEditorAnimations() {
		if (!this.animationsController) {
			this.animationsController = new EnchantedAnimationsController(this);
		}
		this.animationsController.setup();
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
		document.body.classList.toggle('disable-animated-callouts', !this.settings.enableAnimatedCallouts);
		document.body.classList.toggle('ea-layout-animations', this.settings.enableLayoutAnimations);
		document.body.classList.toggle('ea-smooth-scroll', this.settings.enableSmoothScroll);
		document.body.classList.toggle('ea-gpu-accel', this.settings.enableGpuAcceleration);
		document.body.classList.toggle('ea-status-bar-hover', this.settings.enableStatusBarHover);
		document.body.classList.toggle('ea-fold-hover', this.settings.enableFoldHover);
		document.body.classList.toggle('ea-card-hover', this.settings.enableCardHover);
		document.body.classList.toggle('ea-checkbox-animations', this.settings.enableCheckboxAnimations);
		document.body.classList.toggle('ea-tab-animations', this.settings.enableTabAnimations);
		document.body.classList.toggle('ea-button-animations', this.settings.enableButtonAnimations);
		document.body.classList.toggle('ea-link-animations', this.settings.enableLinkAnimations);
		document.body.classList.toggle('ea-tag-animations', this.settings.enableTagAnimations);
		document.body.classList.toggle('ea-ribbon-animations', this.settings.enableRibbonAnimations);
		document.body.classList.toggle('ea-image-animations', this.settings.enableImageAnimations);
		document.body.classList.toggle('ea-autohide-scrollbars', this.settings.autoHideScrollbars);
		document.body.style.setProperty('--ea-progress-bar-speed', `${this.settings.progressBarAnimationSpeed}s`);
		document.body.classList.toggle('ea-blockquote-animations', this.settings.enableBlockquoteAnimations);
		document.body.classList.toggle('ea-tooltip-animations', this.settings.enableTooltipAnimations);
		document.body.classList.toggle('ea-menu-cascade', this.settings.enableMenuCascadeAnimations);
	}

	patchGraphControls() {
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			if (!this.settings.enableModalAnimations) return;

			const target = evt.target as HTMLElement;
			if (!target) return;
			
			const closeBtn = target.closest('.graph-controls-button.mod-close');
			if (closeBtn) {
				if ((closeBtn as any)._eaSimulated) {
					(closeBtn as any)._eaSimulated = false; // Reset for next time
					return;
				}

				const container = closeBtn.closest('.graph-controls');
				if (container && !container.classList.contains('is-closing')) {
					evt.preventDefault();
					evt.stopPropagation();
					evt.stopImmediatePropagation();

					container.classList.add('is-closing');
					const durationMs = this.settings.speed * 600;
					
					setTimeout(() => {
						container.classList.remove('is-closing');
						(closeBtn as any)._eaSimulated = true;
						closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
					}, Math.max(0, durationMs - 10));
				}
			}
		}, true);
	}

	patchDocumentSearch() {
		// Intercept clicks on the search close button
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			if (!this.settings.enableModalAnimations) return;

			const target = evt.target as HTMLElement;
			if (!target) return;
			
			const closeBtn = target.closest('.document-search-close-button, [aria-label="Close search"]');
			if (closeBtn) {
				if ((closeBtn as any)._eaSimulated) {
					(closeBtn as any)._eaSimulated = false; // Reset
					return;
				}

				const container = closeBtn.closest('.document-search-container');
				if (container && !container.classList.contains('is-closing')) {
					evt.preventDefault();
					evt.stopPropagation();
					evt.stopImmediatePropagation();

					container.classList.add('is-closing');
					const durationMs = this.settings.speed * 600;
					
					setTimeout(() => {
						container.classList.remove('is-closing');
						(closeBtn as any)._eaSimulated = true;
						closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
					}, Math.max(0, durationMs - 10));
				}
			}
		}, true);

		// Intercept Escape key press inside search container
		this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
			if (!this.settings.enableModalAnimations) return;
			
			if (evt.key === 'Escape') {
				const target = evt.target as HTMLElement;
				if (!target) return;

				const container = target.closest('.document-search-container');
				if (container && !container.classList.contains('is-closing')) {
					if ((evt as any)._eaSimulated) {
						(evt as any)._eaSimulated = false;
						return;
					}

					evt.preventDefault();
					evt.stopPropagation();
					evt.stopImmediatePropagation();

					container.classList.add('is-closing');
					const durationMs = this.settings.speed * 600;
					
					setTimeout(() => {
						container.classList.remove('is-closing');
						const simulatedEvent = new KeyboardEvent('keydown', { 
							key: 'Escape', 
							code: 'Escape',
							bubbles: true, 
							cancelable: true 
						});
						(simulatedEvent as any)._eaSimulated = true;
						target.dispatchEvent(simulatedEvent);
					}, Math.max(0, durationMs - 10));
				}
			}
		}, true);
	}

	hijackSelectDropdowns() {
		// 1. Block the native OS dropdown already on mousedown
		this.registerDomEvent(document.body, 'mousedown', (evt: MouseEvent) => {
			if (!this.settings.enableModalAnimations) return;
			const target = evt.target as HTMLElement;
			const selectElement = target.closest('select.dropdown') as HTMLSelectElement;
			
			if (selectElement && evt.button === 0) {
				evt.preventDefault(); 
			}
		}, true);

		// 2. Create and show our animated menu only on a full click
		this.registerDomEvent(document.body, 'click', (evt: MouseEvent) => {
			if (!this.settings.enableModalAnimations) return;

			const target = evt.target as HTMLElement;
			const selectElement = target.closest('select.dropdown') as HTMLSelectElement;
			
			if (selectElement && evt.button === 0) {
				evt.preventDefault();
				evt.stopPropagation(); // Block propagation so the click doesn't close the menu immediately!

				const menu = new Menu();
				
				// Add class BEFORE showing the menu so Obsidian can take into account
				// our CSS restrictions (max-width) when calculating screen edge collisions!
				const dom = (menu as any).dom as HTMLElement;
				if (dom) {
					dom.classList.add('ea-select-menu');
				}

				Array.from(selectElement.options).forEach((opt) => {
					menu.addItem((item) => {
						item.setTitle(opt.text);
						
						// Mark the currently selected option
						if (opt.value === selectElement.value) {
							item.setChecked(true);
						}

						item.onClick(() => {
							selectElement.value = opt.value;
							// Dispatch a 'change' event so Obsidian saves the setting
							selectElement.dispatchEvent(new Event('change', { bubbles: true }));
						});
					});
				});

				// Show the custom menu using the bounding rect, which allows Obsidian to position it better
				const rect = selectElement.getBoundingClientRect();
				menu.showAtPosition({ x: rect.left, y: rect.bottom });

				// Force the menu to be at least as wide as the button
				setTimeout(() => {
					if (dom) {
						dom.style.minWidth = `${rect.width}px`;
					}
				}, 0);
			}
		}, true); // Use capture phase
	}
}
