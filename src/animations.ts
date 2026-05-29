export class EnchantedAnimationsController {
	private plugin: any;
	private _animating: WeakSet<Element>;
	private resizeObserver: ResizeObserver | null = null;
	private mutationObserver: MutationObserver | null = null;

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

					// Initialize state silently if we haven't seen this element before
					if (!this.inlineTitleState.has(el)) {
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

							// Animate Numbers Appearance/Disappearance
							if (diff > 0) {
								// Intro (Grew)
								const activeLineNumbers = el.querySelector('.cm-lineNumbers') as HTMLElement;
								if (activeLineNumbers) {
									activeLineNumbers.animate([
										{ opacity: 0, transform: 'translateX(-15px)' },
										{ opacity: 1, transform: 'translateX(0)' }
									], { duration: dur, easing: ease });
								}
							} else if (diff < 0) {
								// Outro (Shrunk)
								// Create a ghost node to fade out
								const ghost = document.createElement('div');
								ghost.className = 'cm-gutter cm-lineNumbers ea-ghost-numbers';
								ghost.style.position = 'absolute';
								ghost.style.left = '0';
								ghost.style.top = '0';
								ghost.style.width = `${Math.abs(diff)}px`;
								ghost.style.height = '100%';
								ghost.style.zIndex = '0';
								ghost.style.pointerEvents = 'none';
								ghost.style.backgroundColor = 'transparent';
								
								// We fake the appearance of numbers since the real ones are gone
								// A simple fading box is usually enough since text is sliding over it
								
								el.style.position = 'relative';
								el.appendChild(ghost);
								
								ghost.animate([
									{ opacity: 1, transform: 'translateX(0)' },
									{ opacity: 0, transform: 'translateX(-15px)' }
								], { duration: dur, easing: ease }).onfinish = () => ghost.remove();
							}
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
					if (this.plugin.settings.enableLayoutAnimations) {
						// Outro/Intro for line numbers is now safely handled by ResizeObserver based on real width changes!
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
	}

	public teardown() {
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		
		this.mutationObserver?.disconnect();
		this.mutationObserver = null;
	}
}
