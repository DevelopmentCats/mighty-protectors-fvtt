const TextEditor = foundry.applications.ux.TextEditor.implementation;

/**
 * ItemSheetV2 implementation for Mighty Protectors items.
 * @extends {foundry.applications.sheets.ItemSheetV2}
 */
export default class MightyProtectorsItemSheet extends foundry.applications.sheets.ItemSheetV2 {

    static DEFAULT_OPTIONS = {
        classes: ["mightyprotectors", "sheet", "item"],
        position: {
            width: 480,
            height: 350
        },
        form: {
            submitOnChange: true
        },
        window: {
            resizable: true
        }
    };

    static PARTS = {
        ability: { template: "systems/mighty-protectors/templates/sheets/ability-sheet.hbs" },
        attack: { template: "systems/mighty-protectors/templates/sheets/attack-sheet.hbs" },
        background: { template: "systems/mighty-protectors/templates/sheets/background-sheet.hbs" },
        movement: { template: "systems/mighty-protectors/templates/sheets/movement-sheet.hbs" },
        protection: { template: "systems/mighty-protectors/templates/sheets/protection-sheet.hbs" },
        vehicleattack: { template: "systems/mighty-protectors/templates/sheets/vehicleattack-sheet.hbs" },
        vehiclesystem: { template: "systems/mighty-protectors/templates/sheets/vehiclesystem-sheet.hbs" }
    };

    static TABS = {
        sheet: {
            description: { id: "description", group: "sheet", label: "MP.Description" },
            details: { id: "details", group: "sheet", label: "MP.Details" }
        }
    };

    /** @override */
    _configureRenderOptions(options) {
        super._configureRenderOptions(options);
        // Only render the part for this item type
        options.parts = [this.item.type];
    }

    /** @override */
    _initializeApplicationOptions(options) {
        options = super._initializeApplicationOptions(options);

        // Expand default size for attack and vehicleattack item types
        if (this.document.type === "attack" || this.document.type === "vehicleattack") {
            options.position = { ...options.position, width: 600, height: 420 };
        } else if (this.document.type === "vehiclesystem") {
            options.position = { ...options.position, height: 420 };
        }

        return options;
    }

    /** @override */
    tabGroups = {
        sheet: "description"
    };

    /** @override */
    async _prepareContext(options) {
        const isOwned = this.item.actor !== null;

        const context = {
            // Standard item sheet data
            item: this.item,
            system: this.item.system,
            source: this.item.system._source,
            editable: this.isEditable,
            owner: this.item.isOwner,
            limited: this.item.limited,
            options: this.options,
            cssClass: this.item.isOwner ? "editable" : "locked",
            isowned: isOwned,

            // Config reference
            config: CONFIG.MP,

            // Localized item type
            itemType: game.i18n.localize(`ITEM.Type${this.item.type.titleCase()}`),

            // Enriched content
            enrichedRules: await TextEditor.enrichHTML(this.item.system.rules ?? ""),

            // Tabs
            tabs: this._getTabs()
        };

        // Prepare ability/system lists for attacks if owned
        if (isOwned) {
            this._prepareItems(context, this.item.actor.items);
        }

        return context;
    }

    /** @override */
    _onRender(context, options) {
        super._onRender(context, options);

        if (!this.isEditable) return;

        const html = this.element;

        // Bind event listeners for bonus management (preserving original template selectors)
        html.querySelectorAll('.apply-bonus').forEach(el => {
            el.addEventListener('click', this._onApplyBonus.bind(this));
        });

        html.querySelectorAll('.remove-bonus').forEach(el => {
            el.addEventListener('click', this._onRemoveBonus.bind(this));
        });
    }

    /**
     * Prepare tab data for the template
     * @returns {object}
     */
    _getTabs() {
        const tabs = {};
        for (const [groupId, group] of Object.entries(MightyProtectorsItemSheet.TABS)) {
            tabs[groupId] = {};
            for (const [tabId, tab] of Object.entries(group)) {
                tabs[groupId][tabId] = {
                    ...tab,
                    active: this.tabGroups[groupId] === tabId,
                    cssClass: this.tabGroups[groupId] === tabId ? "active" : ""
                };
            }
        }
        return tabs;
    }

    /**
     * Prepare related item lists (abilities with bonuses, charge sources, etc.)
     * @param {object} context - The render context
     * @param {Collection} items - The actor's items collection
     */
    _prepareItems(context, items) {
        const appliedabilities = [];
        const availabilities = [];
        const chargesources = [];
        const indpowersources = [];
        const bonusids = this.item.system.bonusids ?? [];
        const appliedsystems = [];
        const availsystems = [];

        for (const item of items) {
            // Character abilities with tohit bonus
            if (item.type === "ability" && item.system.tohitbonus) {
                const entry = {
                    id: item.id,
                    name: item.name,
                    bonus: item.system.tohitbonus
                };
                if (bonusids.includes(item.id)) {
                    appliedabilities.push(entry);
                } else {
                    availabilities.push(entry);
                }
            }

            // Vehicle systems with tohit bonus
            if (item.type === "vehiclesystem" && item.system.tohitbonus) {
                const entry = {
                    id: item.id,
                    name: item.name,
                    bonus: item.system.tohitbonus
                };
                if (bonusids.includes(item.id)) {
                    appliedsystems.push(entry);
                } else {
                    availsystems.push(entry);
                }
            }

            // Charge sources (abilities or vehicle systems with usescharges)
            if ((item.type === "ability" || item.type === "vehiclesystem") && item.system.usescharges) {
                chargesources.push({
                    id: item.id,
                    name: item.name
                });
            }

            // Independent power sources (vehicle systems only)
            if (item.type === "vehiclesystem" && item.system.indpower) {
                indpowersources.push({
                    id: item.id,
                    name: item.name
                });
            }
        }

        context.availabilities = availabilities;
        context.appliedabilities = appliedabilities;
        context.chargesources = chargesources;
        context.indpowersources = indpowersources;
        context.appliedsystems = appliedsystems;
        context.availsystems = availsystems;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Event Handlers (instance methods bound in _onRender)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Handle applying a bonus from an ability/system to this attack
     * @param {Event} event
     */
    async _onApplyBonus(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const dataset = element.dataset;
        let bonusids = [...(this.item.system.bonusids ?? [])];

        if (!bonusids.includes(dataset.itemid)) {
            bonusids.push(dataset.itemid);
            await this.item.update({ 'system.bonusids': bonusids });
        }
    }

    /**
     * Handle removing a bonus from an ability/system from this attack
     * @param {Event} event
     */
    async _onRemoveBonus(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const dataset = element.dataset;
        let bonusids = [...(this.item.system.bonusids ?? [])];

        if (bonusids.includes(dataset.itemid)) {
            bonusids = bonusids.filter(id => id !== dataset.itemid);
            await this.item.update({ 'system.bonusids': bonusids });
        }
    }
}
