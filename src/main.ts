import {Plugin, Modal, Menu} from 'obsidian';
import {DEFAULT_SETTINGS, EnchantedAnimationsSettings, EnchantedAnimationsSettingTab} from "./settings";

export default class EnchantedAnimationsPlugin extends Plugin {
	settings: EnchantedAnimationsSettings;
	originalModalClose: Function;
	originalSettingClose: Function;
	originalMenuHide: Function;
	originalMenuClose: Function;
	editorObserver: MutationObserver | null = null;
	private _animating = new WeakSet<Element>();

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
			this.setupEditorAnimations();
			this.hijackSelectDropdowns();
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
		this.patchMenuClose();
		this.patchGraphControls();
		this.patchDocumentSearch();
		this.addSettingTab(new EnchantedAnimationsSettingTab(this.app, this));
	}

	onunload() {
		console.log('Unloading Enchanted Animations...');

		this.unpatchModalClose();
		this.unpatchMenuClose();
		this.editorObserver?.disconnect();
		this.editorObserver = null;

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

	patchMenuClose() {
		const plugin = this;

		if (Menu.prototype.hide) {
			this.originalMenuHide = Menu.prototype.hide;
			Menu.prototype.hide = function() {
				if (!plugin.settings.enableModalAnimations) {
					return plugin.originalMenuHide.call(this);
				}

				let container = (this as any).dom || document.querySelector('.menu');
				if (container && !container.classList.contains('is-closing')) {
					container.classList.add('is-closing');
					const durationMs = plugin.settings.speed * 600;
					
					setTimeout(() => {
						container.classList.remove('is-closing');
						plugin.originalMenuHide.call(this);
					}, Math.max(0, durationMs - 10));
					
					return this;
				} else {
					return plugin.originalMenuHide.call(this);
				}
			};
		}
		
		if (Menu.prototype.close) {
			this.originalMenuClose = Menu.prototype.close;
			Menu.prototype.close = function() {
				if (!plugin.settings.enableModalAnimations) {
					return plugin.originalMenuClose.call(this);
				}

				let container = (this as any).dom || document.querySelector('.menu');
				if (container && !container.classList.contains('is-closing')) {
					container.classList.add('is-closing');
					const durationMs = plugin.settings.speed * 600;
					
					setTimeout(() => {
						container.classList.remove('is-closing');
						plugin.originalMenuClose.call(this);
					}, Math.max(0, durationMs - 10));
				} else {
					return plugin.originalMenuClose.call(this);
				}
			};
		}
	}

	unpatchMenuClose() {
		if (this.originalMenuHide) {
			Menu.prototype.hide = this.originalMenuHide as any;
		}
		if (this.originalMenuClose) {
			Menu.prototype.close = this.originalMenuClose as any;
		}
	}

	setupEditorAnimations() {
		this.editorObserver?.disconnect();
		const plugin = this;

		this.editorObserver = new MutationObserver((mutations) => {
			if (!plugin.settings.enableFormattingAnimations) return;

			const dur = plugin.settings.speed * 750;
			const ease = plugin.settings.easing;

			for (const m of mutations) {
				// ── Formatting exit (hmd-hidden-token added) ──
				if (m.type === 'attributes' && m.attributeName === 'class') {
					const el = m.target as HTMLElement;
					if (!el.classList || plugin._animating.has(el)) continue;

					const was = (m.oldValue || '').includes('hmd-hidden-token');
					const is = el.classList.contains('hmd-hidden-token');
					if (was || !is) continue;

					const isFormatting = el.classList.contains('cm-formatting') || el.classList.contains('cm-formatting-link');
					const excluded = el.classList.contains('cm-formatting-header')
						|| el.classList.contains('cm-formatting-list')
						|| el.classList.contains('cm-formatting-task');
					if (!isFormatting || excluded) continue;

					plugin._animating.add(el);

					// Override Obsidian's hiding so the element stays visible during anim
					el.style.setProperty('font-size', 'inherit');
					el.style.setProperty('letter-spacing', 'normal');
					el.style.setProperty('color', 'inherit');
					el.style.setProperty('font-family', 'inherit');
					el.style.display = 'inline-block';
					el.style.verticalAlign = 'baseline';

					const anim = el.animate([
						{ marginInline: '0', opacity: 1, transform: 'scale(1)' },
						{ marginInline: '-0.25em', opacity: 0, transform: 'scale(0.85)' }
					], { duration: dur, easing: ease, fill: 'forwards' });

					anim.onfinish = () => {
						el.style.removeProperty('font-size');
						el.style.removeProperty('letter-spacing');
						el.style.removeProperty('color');
						el.style.removeProperty('font-family');
						el.style.removeProperty('display');
						el.style.removeProperty('vertical-align');
						plugin._animating.delete(el);
					};
				}

				// ── Embed line added/removed → smooth slide ──
				if (m.type === 'childList') {
					for (const node of Array.from(m.addedNodes)) {
						if (!(node instanceof HTMLElement) || !node.classList.contains('cm-line')) continue;
						if (!node.querySelector(':scope > .cm-formatting-embed')) continue;

						const embedBlock = node.nextElementSibling;
						if (!embedBlock) continue;

						const h = node.offsetHeight || 28;
						embedBlock.animate([
							{ transform: `translateY(-${h}px)` },
							{ transform: 'translateY(0)' }
						], { duration: dur, easing: ease });

						node.style.overflow = 'hidden';
						const lineAnim = node.animate([
							{ maxHeight: '0px', opacity: 0 },
							{ maxHeight: h + 'px', opacity: 1 }
						], { duration: dur, easing: ease });
						lineAnim.onfinish = () => { node.style.removeProperty('overflow'); };
					}

					for (const node of Array.from(m.removedNodes)) {
						if (!(node instanceof HTMLElement) || !node.classList.contains('cm-line')) continue;
						if (!node.querySelector(':scope > .cm-formatting-embed')) continue;

						const embedBlock = m.nextSibling as HTMLElement;
						if (!embedBlock || !(embedBlock instanceof HTMLElement)) continue;

						const h = 28;
						embedBlock.animate([
							{ transform: `translateY(${h}px)` },
							{ transform: 'translateY(0)' }
						], { duration: dur, easing: ease });
					}
				}
			}
		});

		const root = document.querySelector('.workspace');
		if (root) {
			this.editorObserver.observe(root, {
				childList: true,
				attributes: true,
				attributeFilter: ['class'],
				attributeOldValue: true,
				subtree: true
			});
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
		document.body.classList.toggle('ea-checkbox-animations', this.settings.enableCheckboxAnimations);
		document.body.classList.toggle('ea-tab-animations', this.settings.enableTabAnimations);
		document.body.classList.toggle('ea-button-animations', this.settings.enableButtonAnimations);
		document.body.classList.toggle('ea-link-animations', this.settings.enableLinkAnimations);
		document.body.classList.toggle('ea-tag-animations', this.settings.enableTagAnimations);
		document.body.classList.toggle('ea-ribbon-animations', this.settings.enableRibbonAnimations);
		document.body.classList.toggle('ea-image-animations', this.settings.enableImageAnimations);
		document.body.classList.toggle('ea-autohide-scrollbars', this.settings.autoHideScrollbars);
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
