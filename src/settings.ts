import { App, PluginSettingTab, Setting } from "obsidian";
import EnchantedAnimationsPlugin from "./main";

export interface EnchantedAnimationsSettings {
	speed: number;
	easing: string;
	enableSplashScreen: boolean;
	animateNoteOpen: boolean;
	enableHeaderAnimations: boolean;
	enableFormattingAnimations: boolean;
	enableModalAnimations: boolean;
	enableNativeAnimations: boolean;
	enableSmoothScroll: boolean;
	enableGpuAcceleration: boolean;
	enableStatusBarHover: boolean;
	enableFoldHover: boolean;
	enableCardHover: boolean;
	enableCheckboxAnimations: boolean;
	enableTabAnimations: boolean;
	enableButtonAnimations: boolean;
	enableLinkAnimations: boolean;
	enableTagAnimations: boolean;
	enableRibbonAnimations: boolean;
	enableImageAnimations: boolean;
	autoHideScrollbars: boolean;
	enableBlockquoteAnimations: boolean;
	enableTooltipAnimations: boolean;
	enableMenuCascadeAnimations: boolean;
}

export const DEFAULT_SETTINGS: EnchantedAnimationsSettings = {
	speed: 0.4,
	easing: "cubic-bezier(0.2, 0, 0, 1)",
	enableSplashScreen: true,
	animateNoteOpen: false,
	enableHeaderAnimations: true,
	enableFormattingAnimations: true,
	enableModalAnimations: true,
	enableNativeAnimations: true,
	enableSmoothScroll: true,
	enableGpuAcceleration: true,
	enableStatusBarHover: true,
	enableFoldHover: true,
	enableCardHover: true,
	enableCheckboxAnimations: true,
	enableTabAnimations: true,
	enableButtonAnimations: true,
	enableLinkAnimations: true,
	enableTagAnimations: true,
	enableRibbonAnimations: true,
	enableImageAnimations: true,
	autoHideScrollbars: false,
	enableBlockquoteAnimations: true,
	enableTooltipAnimations: true,
	enableMenuCascadeAnimations: false,
}

export class EnchantedAnimationsSettingTab extends PluginSettingTab {
	plugin: EnchantedAnimationsPlugin;

	constructor(app: App, plugin: EnchantedAnimationsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.addClass("enchanted-settings");

		new Setting(containerEl)
			.setName("Base settings")
			.setHeading()

		new Setting(containerEl)
			.setName("Animation Flow Rate")
			.setDesc("Set the duration of animations in seconds. Lower is faster, higher is slower.")
			.addSlider(slider => slider
				.setLimits(0.1, 2.0, 0.05)
				.setValue(this.plugin.settings.speed)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.speed = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Motion Style")
			.setDesc("Choose the acceleration curve for all animations.")
			.addDropdown(dropdown => dropdown
				.addOption("cubic-bezier(0.2, 0, 0, 1)", "Google Pixel (Material You) - Default")
				.addOption("cubic-bezier(0.175, 0.885, 0.32, 1.275)", "Bouncy (by Blobob)")
				.addOption("cubic-bezier(0.16, 1, 0.3, 1)", "Enchanted (Silky Smooth)")
				.addOption("cubic-bezier(0.4, 0, 0.2, 1)", "Classic Material (Balanced)")
				.addOption("linear", "Linear (Constant Speed)")
				.setValue(this.plugin.settings.easing)
				.onChange(async (value) => {
					this.plugin.settings.easing = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("UI & Interface Animations")
			.setHeading();

		new Setting(containerEl)
			.setName("Immersive Interface Menus")
			.setDesc("Dynamic scale and slide for dialogs, settings, and menus. Disable if your theme already animates these!")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableModalAnimations)
				.onChange(async (value) => {
					this.plugin.settings.enableModalAnimations = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Staggered Menu Animations")
			.setDesc("Menu items cascade smoothly when a menu opens, accompanied by a premium hover translation effect.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableMenuCascadeAnimations)
				.onChange(async (value) => {
					this.plugin.settings.enableMenuCascadeAnimations = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Deep System Integration")
			.setDesc("Smooths out default Obsidian UI transitions (sidebars, tabs, ribbons). Turn off if your theme handles this better.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableNativeAnimations)
				.onChange(async (value) => {
					this.plugin.settings.enableNativeAnimations = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Native Tab Animations")
			.setDesc("Smooth transitions when switching or closing tabs, keeping the native Obsidian look.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableTabAnimations)
				.onChange(async (value) => {
					this.plugin.settings.enableTabAnimations = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Premium Vault Reveal")
			.setDesc("Smooth workspace reveal animation upon vault launch. Usually safe to leave enabled.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableSplashScreen)
				.onChange(async (value) => {
					this.plugin.settings.enableSplashScreen = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);


		new Setting(containerEl)
			.setName("Editor & Note Animations")
			.setHeading()

		new Setting(containerEl)
			.setName("Cinematic Note Loading (BETA)")
			.setDesc("Smooth fade-in and slide-up effect when opening or switching files. Turned off by default as it might be glitchy on some layouts.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.animateNoteOpen)
				.onChange(async (value) => {
					this.plugin.settings.animateNoteOpen = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Dynamic Header Expansion")
			.setDesc("Slight horizontal shift and animated (#) prefixes on active header lines.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableHeaderAnimations)
				.onChange(async (value) => {
					this.plugin.settings.enableHeaderAnimations = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Fluid Text Formatting")
			.setDesc("Smooth horizontal expansion for bold, italics, and inline code while typing.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableFormattingAnimations)
				.onChange(async (value) => {
					this.plugin.settings.enableFormattingAnimations = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Animated Checkboxes")
			.setDesc("Fluid strikethrough and checkmark animation for task lists.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableCheckboxAnimations)
				.onChange(async (value) => {
					this.plugin.settings.enableCheckboxAnimations = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Fluid Links")
			.setDesc("Water-like underline expansion for links on hover.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableLinkAnimations)
				.onChange(async (value) => {
					this.plugin.settings.enableLinkAnimations = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Blockquote Accents")
			.setDesc("Expanding left border on blockquotes upon hover.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableBlockquoteAnimations)
				.onChange(async (value) => {
					this.plugin.settings.enableBlockquoteAnimations = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Micro-Interactions")
			.setHeading()

		new Setting(containerEl)
			.setName("Smart Status Bar")
			.setDesc("Hides the status bar until you hover over the bottom of the window.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableStatusBarHover)
				.onChange(async (value) => {
					this.plugin.settings.enableStatusBarHover = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Premium Fold Indicators")
			.setDesc("Smoothly scales up heading collapse arrows when you hover over them.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableFoldHover)
				.onChange(async (value) => {
					this.plugin.settings.enableFoldHover = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Floating Cards")
			.setDesc("Lightly scales up Kanban cards and other card elements on hover.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableCardHover)
				.onChange(async (value) => {
					this.plugin.settings.enableCardHover = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Material Buttons")
			.setDesc("Premium click scaling effect for all buttons in the app.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableButtonAnimations)
				.onChange(async (value) => {
					this.plugin.settings.enableButtonAnimations = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Material Tags")
			.setDesc("Smooth hover transition for tags.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableTagAnimations)
				.onChange(async (value) => {
					this.plugin.settings.enableTagAnimations = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Candy Ribbon Icons")
			.setDesc("Premium hover effects (scale, rotate, glow) for left sidebar icons.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableRibbonAnimations)
				.onChange(async (value) => {
					this.plugin.settings.enableRibbonAnimations = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Image Hover Zoom")
			.setDesc("Slightly zoom in images when hovering over them.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableImageAnimations)
				.onChange(async (value) => {
					this.plugin.settings.enableImageAnimations = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Animated Tooltips")
			.setDesc("Material-style fade and slide-up for native tooltip popups.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableTooltipAnimations)
				.onChange(async (value) => {
					this.plugin.settings.enableTooltipAnimations = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl).setName("Performance Tweaks").setHeading();

		new Setting(containerEl)
			.setName("Butter-Smooth Scrolling")
			.setDesc("Enable CSS smooth scrolling across all scrollable containers in the app.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableSmoothScroll)
				.onChange(async (value) => {
					this.plugin.settings.enableSmoothScroll = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Hardware-Accelerated Rendering")
			.setDesc("Force hardware compositing on animated elements to reduce rendering lag (Recommended).")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableGpuAcceleration)
				.onChange(async (value) => {
					this.plugin.settings.enableGpuAcceleration = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl).setName("System").setHeading();

		new Setting(containerEl)
			.setName("Reset Settings")
			.setDesc("Restore all animation values and toggles to their default states.")
			.addButton(button => button
				.setButtonText("Reset to Defaults")
				.setWarning()
				.onClick(async () => {
					this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS);
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
					this.display();
				})
			);
	}
}
