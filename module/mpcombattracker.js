/**
 * MPCombatTracker extends the core CombatTracker (ApplicationV2/HandlebarsApplicationMixin in v13+).
 *
 * Key v14 AppV2 patterns used:
 *  - static PARTS: override only the tracker template, preserving parent header/footer parts and
 *    the tracker part's scrollable config via foundry.utils.mergeObject with recursive merge.
 *  - _prepareTrackerContext: the correct hook for injecting per-combatant data in v14's CombatTracker.
 *    (Not _prepareContext — that is the generic AppV2 entrypoint; CombatTracker delegates turn
 *    rendering to _prepareTrackerContext → _prepareTurnContext.)
 *  - _onRender: plain DOM querySelectorAll/addEventListener (no jQuery).
 */
export default class MPCombatTracker extends foundry.applications.sidebar.tabs.CombatTracker {

    /** @override — replace only the tracker part template; preserve header, footer, and scrollable. */
    static PARTS = foundry.utils.mergeObject(
        foundry.utils.deepClone(foundry.applications.sidebar.tabs.CombatTracker.PARTS),
        {
            tracker: {
                template: "systems/mighty-protectors/templates/system/combat-tracker.hbs"
            }
        },
        { inplace: false, recursive: true }
    );

    /**
     * @override
     * Inject hasMulti flag into each turn entry.
     * _prepareTrackerContext is the correct override point in v14's CombatTracker —
     * it populates context.turns, which we then augment.
     */
    async _prepareTrackerContext(context, options) {
        await super._prepareTrackerContext(context, options);

        if (!context.combat) return;

        for (const [i, combatant] of context.combat.turns.entries()) {
            if (context.turns[i]) {
                context.turns[i].hasMulti = combatant.getFlag("mighty-protectors", "hasMulti") ?? false;
            }
        }
    }

    /** @override — wire up the add-initiative button using plain DOM (AppV2, no jQuery). */
    async _onRender(context, options) {
        await super._onRender(context, options);

        this.element.querySelectorAll(".add-initiative").forEach(el => {
            el.addEventListener("click", this._onAddInitiative.bind(this));
        });
    }

    /**
     * Add another initiative entry for a character capable of multiple initiatives (Super Speed).
     * @param {PointerEvent} event
     */
    async _onAddInitiative(event) {
        const li = event.currentTarget.closest(".combatant");
        const combatant = this.viewed.combatants.get(li.dataset.combatantId);
        if (!combatant) return;

        await this.viewed.createEmbeddedDocuments("Combatant", [
            { tokenId: combatant.tokenId, hidden: false }
        ]);
    }
}
