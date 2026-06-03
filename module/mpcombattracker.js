const { CombatTracker } = foundry.applications.sidebar.tabs;

/**
 * MPCombatTracker extends the core CombatTracker (ApplicationV2-based in v13+).
 * Uses overrideConfig/static DEFAULT_OPTIONS pattern for AppV2 compatibility.
 */
export default class MPCombatTracker extends CombatTracker {

    /** @override */
    static DEFAULT_OPTIONS = foundry.utils.mergeObject(
        CombatTracker.DEFAULT_OPTIONS ?? {},
        {
            // No additional options needed at this level
        },
        { inplace: false }
    );

    /** @override */
    static PARTS = foundry.utils.mergeObject(
        CombatTracker.PARTS ?? {},
        {
            tracker: {
                template: "systems/mighty-protectors/templates/system/combat-tracker.hbs"
            }
        },
        { inplace: false }
    );

    /** @override */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        if (!context.hasCombat) {
            return context;
        }

        for (let [i, combatant] of context.combat.turns.entries()) {
            if (context.turns[i]) {
                context.turns[i].hasMulti = combatant.getFlag("mighty-protectors", "hasMulti");
            }
        }

        return context;
    }

    /** @override */
    _onRender(context, options) {
        super._onRender(context, options);

        // In AppV2, html is the element itself (not jQuery)
        const html = this.element;
        html.querySelectorAll('.add-initiative').forEach(el => {
            el.addEventListener('click', this._onAddInitiative.bind(this));
        });
    }

    /**
     * Add another initiative entry for a character capable of multiple initiatives (Super Speed).
     * @param {PointerEvent} event
     */
    async _onAddInitiative(event) {
        const btn = event.currentTarget;
        const li = btn.closest(".combatant");
        const c = this.viewed.combatants.get(li.dataset.combatantId);

        await this.viewed.createEmbeddedDocuments("Combatant", [
            { tokenId: c.tokenId, hidden: false }
        ]);
    }
}
