export class EnchantedAnimationsController {
	private plugin: any;
	private _animating: WeakSet<Element>;
	private resizeObserver: ResizeObserver | null = null;
	private mutationObserver: MutationObserver | null = null;
	private bodyObserver: MutationObserver | null = null;

	// Track previous states for FLIP
	private inlineTitleState = new WeakMap<Element, { height: number, isHidden: boolean }>();
	private scrollerGutterWidth = new WeakMap<Element, number>();

	constructor(plugin: any) {
		this.plugin = plugin;
		this._animating = new WeakSet<Element>();
	}

	public setup() {
		this.teardown();

		const root = document.querySelector('.workspace');
		if (!root) return;

		// 1. ResizeObserver for precise FLIP animations (Inline Title & Line Numbers)
		this.resizeObserver = new ResizeObserver((entries) => {
			if (!this.plugin.settings.enableLayoutAnimations) return;
			const isTransitioning = document.body.classList.contains('ea-note-transitioning');
			const dur = this.plugin.settings.speed * 750;
			const ease = this.plugin.settings.easing;

			for (const entry of entries) {
				const el = entry.target as HTMLElement;

				// ── Inline Title Visibility ──
				if (el.classList.contains('inline-title')) {
					const leaf = el.closest('.workspace-leaf') as HTMLElement;
					if (leaf && leaf.getBoundingClientRect().width === 0) {
						// Tab is hidden. Ignore any resizes triggered by the tab switching.
						continue;
					}

					const newHeight = entry.contentRect.height;
					const isNowHidden = newHeight === 0;

					// Initialize state silently if we haven't seen this element before, or if transitioning
					if (!this.inlineTitleState.has(el) || isTransitioning) {
						this.inlineTitleState.set(el, { height: el.scrollHeight, isHidden: isNowHidden });
						continue;
					}

					const currentState = this.inlineTitleState.get(el)!;

					if (isNowHidden && !currentState.isHidden && !this._animating.has(el)) {
						// It just hid via setting!
						this._animating.add(el);
						// IMMEDIATELY update state to prevent infinite loops when ResizeObserver fires again after animation
						this.inlineTitleState.set(el, { height: currentState.height, isHidden: true });
						
						// Temporarily force it visible to animate it out
						el.style.setProperty('display', 'block', 'important');
						el.style.overflow = 'hidden';
						
						const anim = el.animate([
							{ maxHeight: `${currentState.height}px`, opacity: 1, margin: '0 0 12px 0' },
							{ maxHeight: '0px', opacity: 0, margin: '0' }
						], { duration: dur, easing: ease });

						anim.onfinish = () => {
							el.style.removeProperty('display');
							el.style.removeProperty('overflow');
							this._animating.delete(el);
						};
					} else if (!isNowHidden && currentState.isHidden && !this._animating.has(el)) {
						// It just appeared via setting!
						this._animating.add(el);
						// IMMEDIATELY update state
						this.inlineTitleState.set(el, { height: el.scrollHeight, isHidden: false });
						
						el.style.overflow = 'hidden';

						const anim = el.animate([
							{ maxHeight: '0px', opacity: 0, margin: '0' },
							{ maxHeight: `${el.scrollHeight}px`, opacity: 1, margin: '0 0 12px 0' }
						], { duration: dur, easing: ease });

						anim.onfinish = () => {
							el.style.removeProperty('overflow');
							this._animating.delete(el);
						};
					}

					// Update state ONLY if we are not animating
					// If we are animating, we don't want a random ResizeObserver event (like the one triggered by our own animation) to corrupt the state
					if (!this._animating.has(el)) {
						this.inlineTitleState.set(el, { height: isNowHidden ? currentState.height : el.scrollHeight, isHidden: isNowHidden });
					}
				}

				// ── Line Numbers (Gutter Width Change) ──
				if (el.classList.contains('cm-gutters')) {
					const scroller = el.closest('.cm-scroller');
					if (!scroller) continue;

					// If scroller width state doesn't exist, initialize it with current width to prevent animating on first load
					if (!this.scrollerGutterWidth.has(scroller)) {
						this.scrollerGutterWidth.set(scroller, entry.contentRect.width);
						continue;
					}

					const oldWidth = this.scrollerGutterWidth.get(scroller) || entry.contentRect.width;
					const newWidth = entry.contentRect.width;
					const diff = newWidth - oldWidth; // >0 means grew (Intro), <0 means shrunk (Outro)

					// Only act if the width changed significantly (ignores sub-pixel virtual scroll updates)
					if (Math.abs(diff) > 5) {
						if (isTransitioning) {
							this.scrollerGutterWidth.set(scroller, newWidth);
							continue;
						}
						const content = scroller.querySelector('.cm-contentContainer') as HTMLElement;
						if (content && !this._animating.has(content)) {
							this._animating.add(content);

							// FLIP Text
							content.style.transform = `translateX(${-diff}px)`;
							content.style.transition = 'none';

							requestAnimationFrame(() => {
								content.style.transition = `transform ${dur}ms ${ease}`;
								content.style.transform = 'translateX(0)';
								
								setTimeout(() => {
									content.style.transition = '';
									content.style.transform = '';
									this._animating.delete(content);
								}, dur);
							});


						}
					}

					this.scrollerGutterWidth.set(scroller, newWidth);
				}
			}
		});

		// 2. MutationObserver for adding elements to ResizeObserver, and inline formatting
		this.mutationObserver = new MutationObserver((mutations) => {
			const dur = this.plugin.settings.speed * 750;
			const ease = this.plugin.settings.easing;

			for (const m of mutations) {
				// ── Observe dynamically added Title and Gutters, and Animate Line Numbers ──
				if (m.type === 'childList') {
					const isTransitioning = document.body.classList.contains('ea-note-transitioning');
					if (this.plugin.settings.enableLayoutAnimations && !isTransitioning) {
						for (const node of Array.from(m.addedNodes)) {
							if (node instanceof HTMLElement) {
								const lineNumbers = node.classList.contains('cm-lineNumbers') ? node : node.querySelector('.cm-lineNumbers');
								if (lineNumbers && lineNumbers instanceof HTMLElement) {
									const scroller = lineNumbers.closest('.cm-scroller');
									if (scroller && this.scrollerGutterWidth.has(scroller)) {
										lineNumbers.animate([
											{ opacity: 0, transform: 'translateX(-100%)' },
											{ opacity: 1, transform: 'translateX(0)' }
										], { duration: dur, easing: ease });
									}
								}
							}
						}
						for (const node of Array.from(m.removedNodes)) {
							if (node instanceof HTMLElement) {
								if (node.classList.contains('cm-lineNumbers')) {
									const gutters = m.target as HTMLElement;
									const scroller = gutters.closest('.cm-scroller');
									if (gutters && gutters.classList.contains('cm-gutters') && scroller && this.scrollerGutterWidth.has(scroller)) {
										const editor = gutters.closest('.cm-editor') as HTMLElement;
										if (editor) {
											const ghost = node.cloneNode(true) as HTMLElement;
											ghost.classList.add('ea-ghost-numbers');
											
											const editorRect = editor.getBoundingClientRect();
											const guttersRect = gutters.getBoundingClientRect();
											
											const bgColor = window.getComputedStyle(gutters).backgroundColor;
											ghost.style.backgroundColor = (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') ? bgColor : 'var(--background-secondary)';
											
											ghost.style.position = 'absolute';
											ghost.style.left = `${guttersRect.left - editorRect.left}px`;
											ghost.style.top = `${guttersRect.top - editorRect.top}px`;
											ghost.style.height = `${guttersRect.height}px`;
											ghost.style.zIndex = '99';
											ghost.style.pointerEvents = 'none';
											ghost.style.overflow = 'hidden';
											ghost.style.display = 'flex';
											ghost.style.flexDirection = 'column';
											ghost.style.alignItems = 'flex-end'; // Line numbers typically align right
											
											editor.appendChild(ghost);

											ghost.animate([
												{ opacity: 1, transform: 'translateX(0)' },
												{ opacity: 0, transform: 'translateX(-100%)' }
											], { duration: dur, easing: ease }).onfinish = () => ghost.remove();
										}
									}
								}
							}
						}
					}

					m.addedNodes.forEach(node => {
						if (node instanceof HTMLElement) {
							if (node.classList.contains('inline-title') || node.classList.contains('cm-gutters')) {
								this.resizeObserver?.observe(node);
							}
							const titles = node.querySelectorAll('.inline-title, .cm-gutters');
							titles.forEach(t => this.resizeObserver?.observe(t));
						}
					});
				}

				// ── Formatting exit (hmd-hidden-token added) ──
				if (this.plugin.settings.enableFormattingAnimations && m.type === 'attributes' && m.attributeName === 'class') {
					const el = m.target as HTMLElement;
					if (!el.classList || this._animating.has(el)) continue;

					const was = (m.oldValue || '').includes('hmd-hidden-token');
					const is = el.classList.contains('hmd-hidden-token');
					if (was || !is) continue;

					const isFormatting = el.classList.contains('cm-formatting') || el.classList.contains('cm-formatting-link');
					const excluded = el.classList.contains('cm-formatting-header')
						|| el.classList.contains('cm-formatting-list')
						|| el.classList.contains('cm-formatting-task');
					if (!isFormatting || excluded) continue;

					this._animating.add(el);

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
						this._animating.delete(el);
					};
				}

				// ── Embed line added/removed → smooth slide ──
				if (this.plugin.settings.enableFormattingAnimations && m.type === 'childList') {
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

		this.mutationObserver.observe(root, {
			childList: true,
			attributes: true,
			attributeFilter: ['class'],
			attributeOldValue: true,
			subtree: true
		});

		// Attach ResizeObserver to already existing elements
		document.querySelectorAll('.inline-title, .cm-gutters').forEach(el => {
			this.resizeObserver?.observe(el);
		});

		// 3. Body observer for elements appended directly to body (like mobile tab switcher)
		this.bodyObserver = new MutationObserver((mutations) => {
			const isTabAnimationsEnabled = document.body.classList.contains('ea-tab-animations');
			const dur = this.plugin.settings.speed * 1500; // * 1.5 as requested ("wolniejsza ciutkę")
			const ease = this.plugin.settings.easing;

			for (const m of mutations) {
				if (m.type === 'childList') {
					if (isTabAnimationsEnabled && !this.plugin.settings.disableNativeAnimations) {
						for (const node of Array.from(m.addedNodes)) {
							if (node instanceof HTMLElement && node.classList.contains('mobile-tab-switcher') && !node.classList.contains('ea-ghost-tab-switcher')) {
								// Cancel Obsidian's native JS animation if any
								node.getAnimations().forEach(a => a.cancel());
								node.animate([
									{ opacity: 0, transform: 'translateY(15px) scale(0.98)' },
									{ opacity: 1, transform: 'translateY(0) scale(1)' }
								], { duration: dur, easing: ease, fill: 'forwards' });
							}
						}
						
						for (const node of Array.from(m.removedNodes)) {
							if (node instanceof HTMLElement && node.classList.contains('mobile-tab-switcher') && !node.classList.contains('ea-ghost-tab-switcher')) {
								const ghost = node.cloneNode(true) as HTMLElement;
								ghost.classList.add('ea-ghost-tab-switcher');
								
								// CRITICAL: Prevent the ghost from blocking any clicks
								ghost.style.setProperty('pointer-events', 'none', 'important');
								ghost.style.position = 'fixed';
								ghost.style.zIndex = '99999';
								
								// Ensure it doesn't scroll or capture focus
								ghost.setAttribute('aria-hidden', 'true');
								
								// Prevent ERR_FILE_NOT_FOUND console errors from revoked thumbnail URLs
								// by stripping image sources before appending the ghost to the DOM.
								ghost.querySelectorAll('img').forEach(img => {
									// Replace with a transparent 1x1 pixel to maintain layout if it relies on img dimensions
									img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
								});
								ghost.querySelectorAll('*').forEach(el => {
									if (el instanceof HTMLElement && el.style.backgroundImage) {
										el.style.backgroundImage = 'none';
									}
								});

								document.body.appendChild(ghost);
								
								const exitDur = this.plugin.settings.speed * 800; // 2x longer exit animation
								
								// Use Web Animations API but with a hard setTimeout fallback to guarantee removal
								try {
									const anim = ghost.animate([
										{ opacity: 1, transform: 'translateY(0) scale(1)' },
										{ opacity: 0, transform: 'translateY(15px) scale(0.98)' }
									], { duration: exitDur, easing: ease, fill: 'forwards' });
									
									anim.onfinish = () => ghost.remove();
								} catch (e) {
									// Fallback if animate fails
									ghost.style.opacity = '0';
								}
								
								// Failsafe: ALWAYS remove the ghost from DOM after the duration + 50ms buffer
								// This prevents the "mega bug" where the ghost stays on screen forever
								setTimeout(() => {
									if (document.body.contains(ghost)) {
										ghost.remove();
									}
								}, exitDur + 50);
							}
						}
					}
				}
			}
		});

		this.bodyObserver.observe(document.body, { childList: true });
	}

	public teardown() {
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		
		this.mutationObserver?.disconnect();
		this.mutationObserver = null;

		this.bodyObserver?.disconnect();
		this.bodyObserver = null;
	}
}
