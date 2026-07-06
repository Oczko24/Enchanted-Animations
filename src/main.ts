import {Plugin, Modal, Menu, Notice} from 'obsidian';
import {DEFAULT_SETTINGS, EnchantedAnimationsSettings, EnchantedAnimationsSettingTab} from "./settings";
import {EnchantedAnimationsController} from "./animations";

declare const activeDocument: Document;
interface AppWithSetting { setting: { close: (...args: unknown[]) => void; open: (...args: unknown[]) => void; containerEl?: HTMLElement }; }
interface MenuWithDom extends Menu { dom: HTMLElement; }
interface NoticeWithDelay extends Notice { _eaDelayed?: boolean; }
interface SimulatedEvent extends Event { _eaSimulated?: boolean; }
interface SimulatedElement extends HTMLElement { _eaSimulated?: boolean; }


export default class EnchantedAnimationsPlugin extends Plugin {
	static instance: EnchantedAnimationsPlugin;
	settings: EnchantedAnimationsSettings;
	originalModalClose: (...args: unknown[]) => unknown;
	originalSettingClose: (...args: unknown[]) => unknown;
	originalMenuUnload: (...args: unknown[]) => unknown;
	originalMenuHide: (...args: unknown[]) => unknown;
	originalNoticeHide: (...args: unknown[]) => unknown;
	noticeObserver: MutationObserver | null;
	animationsController: EnchantedAnimationsController;
	sidebarObserver: ResizeObserver | null;
	activeSelectMenu: Menu | null = null;
	activeSelectMenuEl: HTMLSelectElement | null = null;
	lastMenuClosedTime: number = 0;
	lastMenuClosedEl: HTMLSelectElement | null = null;

	async onload() {
		EnchantedAnimationsPlugin.instance = this;
		activeDocument.body.classList.add('enchanted-animations-present');
		await this.loadSettings();
		this.applyStyles();

		const isFirstLoad = !this.app.workspace.layoutReady;
		if (isFirstLoad) {
			if (this.settings.enableSplashScreen) {
				activeDocument.body.classList.add('enchanted-animations-startup');
				const animationDurationMs = Math.max(1000, this.settings.speed * 5000);
				
				window.setTimeout(() => {
					activeDocument.body.classList.remove('enchanted-animations-startup');
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
			activeDocument.body.classList.add('ea-note-transitioning');
			window.setTimeout(() => {
				activeDocument.body.classList.remove('ea-note-transitioning');
			}, 400);
		};

		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				const currentFile = this.app.workspace.getActiveFile();
				const currentFilePath = currentFile ? currentFile.path : '';
				
				if (currentFilePath !== lastActiveFile) {
					lastActiveFile = currentFilePath;
					
					if (this.settings.animateNoteOpen && currentFile) {
						activeDocument.body.classList.remove('animate-note-open');
						// Force a reflow to restart CSS animations
						void activeDocument.body.offsetWidth;
						activeDocument.body.classList.add('animate-note-open');
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
		this.patchMobileSettingsClose();
		this.patchNotice();
		this.addSettingTab(new EnchantedAnimationsSettingTab(this.app, this));
	}

	onunload() {
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
		if (this.sidebarObserver) {
			this.sidebarObserver.disconnect();
			this.sidebarObserver = null;
		}

		activeDocument.body.style.removeProperty('--enchanted-animations-speed');
		activeDocument.body.style.removeProperty('--enchanted-animations-easing');

		activeDocument.body.classList.remove('enchanted-animations-present');
		activeDocument.body.classList.remove('animate-note-open');
		activeDocument.body.classList.remove('disable-splash-screen');
		activeDocument.body.classList.remove('disable-header-animations');
		activeDocument.body.classList.remove('disable-formatting-animations');
		activeDocument.body.classList.remove('disable-modal-animation');
		activeDocument.body.classList.remove('disable-native-animations');
		activeDocument.body.classList.remove('disable-animated-callouts');
		activeDocument.body.classList.remove('ea-smooth-scroll');
		activeDocument.body.classList.remove('ea-gpu-accel');
		activeDocument.body.classList.remove('enchanted-animations-startup');
		activeDocument.body.classList.remove('ea-status-bar-hover');
		activeDocument.body.classList.remove('ea-fold-hover');
		activeDocument.body.classList.remove('ea-card-hover');
		activeDocument.body.classList.remove('ea-checkbox-animations');
		activeDocument.body.classList.remove('ea-tab-animations');
		activeDocument.body.classList.remove('ea-button-animations');
		activeDocument.body.classList.remove('ea-link-animations');
		activeDocument.body.classList.remove('ea-tag-animations');
		activeDocument.body.classList.remove('ea-ribbon-animations');
		activeDocument.body.classList.remove('ea-image-animations');
		activeDocument.body.classList.remove('ea-autohide-scrollbars');
		activeDocument.body.classList.remove('ea-blockquote-animations');
		activeDocument.body.classList.remove('ea-tooltip-animations');
		activeDocument.body.classList.remove('ea-menu-cascade');
	}

	originalModalOpen: (...args: unknown[]) => unknown;

	patchModalClose() {
		this.originalModalClose = Reflect.get(Modal.prototype, 'close');
		this.originalModalOpen = Reflect.get(Modal.prototype, 'open');
		const plugin = EnchantedAnimationsPlugin.instance;

		if (typeof this.originalModalOpen === 'function') {
			Modal.prototype.open = function() {
				let container = this.containerEl;
				if (container && !container.classList.contains('modal-container')) {
					container = container.closest('.modal-container') as HTMLElement;
				}
				if (container) {
					container.classList.remove('is-closing');
					Object.assign(container.style, { animationName: '' });
					const modal = container.querySelector('.modal') as HTMLElement;
					if (modal) Object.assign(modal.style, { animationName: '' });
				}
				plugin.originalModalOpen.call(this);
			};
		}

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
				const isMobileSettings = activeDocument.body.classList.contains('is-mobile') && container.querySelector('.modal.mod-settings');
				const durationMs = plugin.settings.speed * (isMobileSettings ? 1400 : 700);
				
				window.setTimeout(() => {
					plugin.originalModalClose.call(this);
					window.setTimeout(() => {
						Object.assign(container.style, { animationName: 'none' });
						const modal = container.querySelector('.modal') as HTMLElement;
						if (modal) Object.assign(modal.style, { animationName: 'none' });
						container.classList.remove('is-closing');
					}, 50);
				}, Math.max(0, durationMs - 10));
			} else {
				plugin.originalModalClose.call(this);
			}
		};

		// Specific patch for the app.setting modal as it sometimes handles its own unmount
		// wrapping it in a window.setTimeout for next tick in case app.setting isn't fully ready immediately.
		window.setTimeout(() => {
			if ((this.app as unknown as AppWithSetting).setting) {
				this.originalSettingClose = Reflect.get((this.app as unknown as AppWithSetting).setting, 'close');
				
				// Patch open to clean up any left-over closing classes before it shows
				const originalSettingOpen = Reflect.get((this.app as unknown as AppWithSetting).setting, 'open');
				if (originalSettingOpen) {
					(this.app as unknown as AppWithSetting).setting.open = function(this: { open: (...args: unknown[]) => void; containerEl?: HTMLElement }) {
						let container = this.containerEl as HTMLElement;
						if (container && !container.classList.contains('modal-container')) {
							container = container.closest('.modal-container') as HTMLElement;
						}
						if (!container) {
							container = activeDocument.querySelector('.modal.mod-settings')?.closest('.modal-container') as HTMLElement;
						}
						if (container) {
							container.classList.remove('is-closing');
							Object.assign(container.style, { animationName: '' });
							const modal = container.querySelector('.modal.mod-settings') as HTMLElement;
							if (modal) Object.assign(modal.style, { animationName: '' });
						}
						originalSettingOpen.call(this);
					};
				}

				(this.app as unknown as AppWithSetting).setting.close = function(this: { close: (...args: unknown[]) => void; containerEl?: HTMLElement }) {
					if (!plugin.settings.enableModalAnimations) {
						plugin.originalSettingClose.call(this);
						return;
					}

					let container = this.containerEl as HTMLElement;
					if (container && !container.classList.contains('modal-container')) {
						container = container.closest('.modal-container') as HTMLElement;
					}
					if (!container) {
						container = activeDocument.querySelector('.modal.mod-settings')?.closest('.modal-container') as HTMLElement;
					}
					if (container && !container.classList.contains('is-closing')) {
						container.classList.add('is-closing');
						container.dataset.eaAnimated = 'true';
						const isMobile = activeDocument.body.classList.contains('is-mobile');
						const durationMs = plugin.settings.speed * (isMobile ? 1400 : 700);
						
						window.setTimeout(() => {
							plugin.originalSettingClose.call(this);
							
							// Instead of removing is-closing, we just disable the animation to prevent IN animation flash.
							// It will be cleaned up in open() next time.
							window.setTimeout(() => {
								Object.assign(container.style, { animationName: 'none' });
								const modal = container.querySelector('.modal.mod-settings') as HTMLElement;
								if (modal) Object.assign(modal.style, { animationName: 'none' });
								container.classList.remove('is-closing');
							}, 50);
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
			Modal.prototype.close = this.originalModalClose;
		}
		if (this.originalSettingClose && (this.app as unknown as AppWithSetting).setting) {
			(this.app as unknown as AppWithSetting).setting.close = this.originalSettingClose;
		}
	}

	patchMenuClose() {
		const plugin = EnchantedAnimationsPlugin.instance;

		const createGhost = function(menuObj: any) {
			if (!plugin.settings.enableModalAnimations) return;

			let container = (menuObj as MenuWithDom).dom;
			if (container && container.parentNode && !container.classList.contains('is-closing')) {
				container.classList.add('is-closing');
				const ghost = container.cloneNode(true) as HTMLElement;
				const rect = container.getBoundingClientRect();
				
				Object.assign(ghost.style, {
					position: 'fixed',
					left: rect.left + 'px',
					top: rect.top + 'px',
					width: rect.width + 'px',
					height: rect.height + 'px',
					margin: '0',
					pointerEvents: 'none',
					zIndex: '99999'
				});

				// Prevent children from replaying entrance animations
				ghost.querySelectorAll('*').forEach(el => {
					Object.assign((el as HTMLElement).style, { animationName: 'none' });
				});
				
				activeDocument.body.appendChild(ghost);
				
				const isMobile = activeDocument.body.classList.contains('is-phone');
				const durationMs = plugin.settings.speed * (isMobile ? 1200 : 400);
				
				window.setTimeout(() => {
					ghost.remove();
				}, durationMs);
			}
		};

		if (Menu.prototype.unload) {
			this.originalMenuUnload = Reflect.get(Menu.prototype, 'unload');
			Menu.prototype.unload = function() {
				createGhost(this);
				return plugin.originalMenuUnload.call(this);
			};
		}

		if ((Menu.prototype as any).hide) {
			this.originalMenuHide = Reflect.get(Menu.prototype, 'hide');
			(Menu.prototype as any).hide = function() {
				createGhost(this);
				return plugin.originalMenuHide.call(this);
			};
		}
	}

	unpatchMenuClose() {
		if (this.originalMenuUnload) {
			Menu.prototype.unload = this.originalMenuUnload;
		}
		if (this.originalMenuHide) {
			(Menu.prototype as any).hide = this.originalMenuHide;
		}
	}

	patchNotice() {
		if (Notice.prototype.hide) {
			this.originalNoticeHide = Reflect.get(Notice.prototype, 'hide');
			const plugin = EnchantedAnimationsPlugin.instance;

			Notice.prototype.hide = function() {
				// Extension logic (when offset is > 0)
				if (plugin.settings.noticeDurationOffset > 0) {
					if (!(this as NoticeWithDelay)._eaDelayed) {
						(this as NoticeWithDelay)._eaDelayed = true;
						window.setTimeout(() => {
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
			Notice.prototype.hide = this.originalNoticeHide;
		}
	}

	setupNoticeObserver() {
		const noticeContainer = activeDocument.body.querySelector('.notice-container');
		if (!noticeContainer) return;

		this.noticeObserver = new MutationObserver((mutations) => {
			if (this.settings.noticeDurationOffset >= 0) return; // Only for shortening

			for (const mutation of mutations) {
				for (const node of Array.from(mutation.addedNodes)) {
					if (node.nodeType === 1 && (node as HTMLElement).classList.contains('notice')) {
						const offsetMs = this.settings.noticeDurationOffset * 1000;
						const assumedNative = 4000; // Native notice default is ~4000ms
						let newTimeout = assumedNative + offsetMs;
						if (newTimeout < 0) newTimeout = 0;
						
						window.setTimeout(() => {
							// We mimic the native hide behavior directly on the DOM element
							Object.assign((node as HTMLElement).style, { opacity: '0' });
							window.setTimeout(() => {
								if (node.parentElement) {
									(node as HTMLElement).remove();
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
		const sidebars = activeDocument.querySelectorAll('.workspace-split.mod-sidedock');
		this.sidebarObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const el = entry.target as HTMLElement;
				// Only update if it has a meaningful width (not collapsed)
				if (el.clientWidth > 50) {
					el.style.setProperty('--ea-sidebar-width', el.clientWidth.toString());
				}
			}
		});
		sidebars.forEach(s => this.sidebarObserver?.observe(s));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<EnchantedAnimationsSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	applyStyles() {
		activeDocument.body.style.setProperty('--enchanted-animations-speed-num', this.settings.speed.toString());
		activeDocument.body.style.setProperty('--enchanted-animations-speed', `${this.settings.speed}s`);
		activeDocument.body.style.setProperty('--enchanted-animations-easing', this.settings.easing);

		activeDocument.body.classList.toggle('animate-note-open', this.settings.animateNoteOpen);
		activeDocument.body.classList.toggle('disable-splash-screen', !this.settings.enableSplashScreen);
		activeDocument.body.classList.toggle('disable-header-animations', !this.settings.enableHeaderAnimations);
		activeDocument.body.classList.toggle('disable-formatting-animations', !this.settings.enableFormattingAnimations);
		activeDocument.body.classList.toggle('disable-modal-animation', !this.settings.enableModalAnimations);
		activeDocument.body.classList.toggle('disable-native-animations', !this.settings.enableNativeAnimations);
		activeDocument.body.classList.toggle('disable-animated-callouts', !this.settings.enableAnimatedCallouts);
		activeDocument.body.classList.toggle('ea-layout-animations', this.settings.enableLayoutAnimations);
		activeDocument.body.classList.toggle('ea-smooth-scroll', this.settings.enableSmoothScroll);
		activeDocument.body.classList.toggle('ea-gpu-accel', this.settings.enableGpuAcceleration);
		activeDocument.body.classList.toggle('ea-status-bar-hover', this.settings.enableStatusBarHover);
		activeDocument.body.classList.toggle('ea-fold-hover', this.settings.enableFoldHover);
		activeDocument.body.classList.toggle('ea-card-hover', this.settings.enableCardHover);
		activeDocument.body.classList.toggle('ea-checkbox-animations', this.settings.enableCheckboxAnimations);
		activeDocument.body.classList.toggle('ea-tab-animations', this.settings.enableTabAnimations);
		activeDocument.body.classList.toggle('ea-button-animations', this.settings.enableButtonAnimations);
		activeDocument.body.classList.toggle('ea-link-animations', this.settings.enableLinkAnimations);
		activeDocument.body.classList.toggle('ea-tag-animations', this.settings.enableTagAnimations);
		activeDocument.body.classList.toggle('ea-ribbon-animations', this.settings.enableRibbonAnimations);
		activeDocument.body.classList.toggle('ea-image-animations', this.settings.enableImageAnimations);
		activeDocument.body.classList.toggle('ea-autohide-scrollbars', this.settings.autoHideScrollbars);
		activeDocument.body.style.setProperty('--ea-progress-bar-speed', `${this.settings.progressBarAnimationSpeed}s`);
		activeDocument.body.classList.toggle('ea-blockquote-animations', this.settings.enableBlockquoteAnimations);
		activeDocument.body.classList.toggle('ea-tooltip-animations', this.settings.enableTooltipAnimations);
		activeDocument.body.classList.toggle('ea-menu-cascade', this.settings.enableMenuCascadeAnimations);
	}

	patchGraphControls() {
		this.registerDomEvent(activeDocument, 'click', (evt: MouseEvent) => {
			if (!this.settings.enableModalAnimations) return;

			const target = evt.target as HTMLElement;
			if (!target) return;
			
			const closeBtn = target.closest('.graph-controls-button.mod-close');
			if (closeBtn) {
				if ((closeBtn as SimulatedElement)._eaSimulated) {
					(closeBtn as SimulatedElement)._eaSimulated = false; // Reset for next time
					return;
				}

				const container = closeBtn.closest('.graph-controls');
				if (container && !container.classList.contains('is-closing')) {
					evt.preventDefault();
					evt.stopPropagation();
					evt.stopImmediatePropagation();

					container.classList.add('is-closing');
					const durationMs = this.settings.speed * 600;
					
					window.setTimeout(() => {
						(closeBtn as SimulatedElement)._eaSimulated = true;
						closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
						window.setTimeout(() => container.classList.remove('is-closing'), 50);
					}, Math.max(0, durationMs - 10));
				}
			}
		}, true);
	}

	patchDocumentSearch() {
		// Intercept clicks on the search close button
		this.registerDomEvent(activeDocument, 'click', (evt: MouseEvent) => {
			if (!this.settings.enableModalAnimations) return;

			const target = evt.target as HTMLElement;
			if (!target) return;
			
			const closeBtn = target.closest('.document-search-close-button, [aria-label="Close search"]');
			if (closeBtn) {
				if ((closeBtn as SimulatedElement)._eaSimulated) {
					(closeBtn as SimulatedElement)._eaSimulated = false; // Reset
					return;
				}

				const container = closeBtn.closest('.document-search-container');
				if (container && !container.classList.contains('is-closing')) {
					evt.preventDefault();
					evt.stopPropagation();
					evt.stopImmediatePropagation();

					container.classList.add('is-closing');
					const durationMs = this.settings.speed * 600;
					
					window.setTimeout(() => {
						(closeBtn as SimulatedElement)._eaSimulated = true;
						closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
						window.setTimeout(() => container.classList.remove('is-closing'), 50);
					}, Math.max(0, durationMs - 10));
				}
			}
		}, true);

		// Intercept Escape key press inside search container
		this.registerDomEvent(activeDocument, 'keydown', (evt: KeyboardEvent) => {
			if (!this.settings.enableModalAnimations) return;
			
			if (evt.key === 'Escape') {
				const target = evt.target as HTMLElement;
				if (!target) return;

				const container = target.closest('.document-search-container');
				if (container && !container.classList.contains('is-closing')) {
					if ((evt as SimulatedEvent)._eaSimulated) {
						(evt as SimulatedEvent)._eaSimulated = false;
						return;
					}

					evt.preventDefault();
					evt.stopPropagation();
					evt.stopImmediatePropagation();

					container.classList.add('is-closing');
					const durationMs = this.settings.speed * 600;
					
					window.setTimeout(() => {
						const simulatedEvent = new KeyboardEvent('keydown', { 
							key: 'Escape', 
							code: 'Escape',
							bubbles: true, 
							cancelable: true 
						});
						(simulatedEvent as SimulatedEvent)._eaSimulated = true;
						target.dispatchEvent(simulatedEvent);
						window.setTimeout(() => container.classList.remove('is-closing'), 50);
					}, Math.max(0, durationMs - 10));
				}
			}
		}, true);
	}

	patchMobileSettingsClose() {
		// Intercept clicks on the settings close button specifically to prevent Obsidian from closing it instantly (bypassing animation)
		this.registerDomEvent(activeDocument, 'click', (evt: MouseEvent) => {
			if (!this.settings.enableModalAnimations) return;

			const target = evt.target as HTMLElement;
			if (!target) return;
			
			// Strict selector for the X button, completely avoiding the back button in drill-down menus
			const closeBtn = target.closest('.is-mobile .modal.mod-settings .modal-close-button:not(.mod-back), .is-mobile .modal.mod-settings .clickable-icon.mod-close, .is-mobile .modal.mod-settings [aria-label="Close"], .is-mobile .modal.mod-settings [aria-label="Zamknij"]');
			
			if (closeBtn) {
				const container = closeBtn.closest('.modal-container');
				if (container && !container.classList.contains('is-closing')) {
					// Stop Obsidian's native instant-close
					evt.preventDefault();
					evt.stopPropagation();
					evt.stopImmediatePropagation();

					container.classList.add('is-closing');
					const durationMs = this.settings.speed * 1400; // Mobile modal exit is 1.4x
					
					window.setTimeout(() => {
						if ((this.app as unknown as AppWithSetting).setting) {
							// Trigger the real close natively instead of faking a click
							(this.app as unknown as AppWithSetting).setting.close();
							
							// Clean up after the native close to prevent IN animation flash
							window.setTimeout(() => {
								Object.assign((container as HTMLElement).style, { animationName: 'none' });
								const modal = container.querySelector('.modal.mod-settings') as HTMLElement;
								if (modal) Object.assign(modal.style, { animationName: 'none' });
								container.classList.remove('is-closing');
							}, 50);
						}
					}, Math.max(0, durationMs - 10));
				}
			}
		}, true);
	}

	hijackSelectDropdowns() {
		// 1. Block the native OS dropdown already on mousedown
		this.registerDomEvent(activeDocument.body, 'mousedown', (evt: MouseEvent) => {
			if (!this.settings.enableModalAnimations) return;
			const target = evt.target as HTMLElement;
			const selectElement = target.closest('select.dropdown') as HTMLSelectElement;
			
			if (selectElement && evt.button === 0) {
				evt.preventDefault(); 
			}
		}, true);

		// 2. Create and show our animated menu only on a full click
		this.registerDomEvent(activeDocument.body, 'click', (evt: MouseEvent) => {
			if (!this.settings.enableModalAnimations) return;

			const target = evt.target as HTMLElement;
			const selectElement = target.closest('select.dropdown') as HTMLSelectElement;
			
			if (selectElement && evt.button === 0) {
				evt.preventDefault();
				evt.stopPropagation(); // Block propagation so Obsidian's background click doesn't instantly close it

				if (this.activeSelectMenuEl === selectElement) {
					// We clicked the same select element that is currently open. Close it.
					(this.activeSelectMenu as any)?.hide ? (this.activeSelectMenu as any).hide() : this.activeSelectMenu?.unload();
					return;
				}

				if (this.lastMenuClosedEl === selectElement && Date.now() - this.lastMenuClosedTime < 300) {
					return;
				}

				if (this.activeSelectMenu) {
					(this.activeSelectMenu as any).hide ? (this.activeSelectMenu as any).hide() : this.activeSelectMenu.unload();
				}

				const menu = new Menu();
				this.activeSelectMenu = menu;
				this.activeSelectMenuEl = selectElement;

				// Use native onHide to properly track when menu is closed by clicking outside
				if (typeof (menu as any).onHide === 'function') {
					(menu as any).onHide(() => {
						if (this.activeSelectMenu === menu) {
							this.lastMenuClosedTime = Date.now();
							this.lastMenuClosedEl = this.activeSelectMenuEl;
							this.activeSelectMenu = null;
							this.activeSelectMenuEl = null;
						}
					});
				} else {
					const originalUnload = menu.unload.bind(menu);
					menu.unload = () => {
						if (this.activeSelectMenu === menu) {
							this.lastMenuClosedTime = Date.now();
							this.lastMenuClosedEl = this.activeSelectMenuEl;
							this.activeSelectMenu = null;
							this.activeSelectMenuEl = null;
						}
						originalUnload();
					};
				}

				// Add class BEFORE showing the menu so Obsidian can take into account
				const dom = (menu as MenuWithDom).dom;
				if (dom) {
					dom.classList.add('ea-select-menu');
				}

				Array.from(selectElement.options).forEach((opt) => {
					menu.addItem((item) => {
						item.setTitle(opt.text);
						
						if (opt.value === selectElement.value) {
							item.setChecked(true);
						}

						item.onClick(() => {
							selectElement.value = opt.value;
							selectElement.dispatchEvent(new Event('change', { bubbles: true }));
						});
					});
				});

				const rect = selectElement.getBoundingClientRect();
				menu.showAtPosition({ x: rect.left, y: rect.bottom });

				window.setTimeout(() => {
					if (dom) {
						Object.assign(dom.style, { minWidth: `${rect.width}px` });
					}
				}, 0);
			}
		}, true); // Use capture phase
	}
}
