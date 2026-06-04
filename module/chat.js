import * as Crit from './crit.js';

// In V14 ApplicationV2, renderChatLog/renderChatMessage pass an HTMLElement.
// Use event delegation on the element directly.

export function addChatListeners(html) {
    const el = html instanceof HTMLElement ? html : html[0];
    el.addEventListener('click', event => {
        if (event.target.closest('button.rollforcritfumble')) onRollForCrit(event);
        if (event.target.closest('button.rollforcritfumbletype')) onRollCritFumbleType(event);
    });
}

function onRollForCrit(event) {
    const card = event.currentTarget.closest(".critroller");
    const data = {
        owner: game.actors.get(card.dataset.ownerId),
        targetName: card.dataset.targetName,
        targetNum: card.dataset.targetNum,
        rollType: card.dataset.rollType,
        showSuccess: card.dataset.showSuccess,
        targetHasDef: card.dataset.targetHasDef
    };
    Crit.RollForCritFumble(data);
}

function onRollCritFumbleType(event) {
    const card = event.currentTarget.closest(".crittype");
    const data = {
        owner: game.actors.get(card.dataset.ownerId),
        rollType: card.dataset.rollType
    };
    Crit.RollCritFumbleType(data);
}

export const hideCritFumble = function(app, html, data) {
    const el = html instanceof HTMLElement ? html : html[0];
    if (!el) return;

    const chatCard = el.querySelector(".critshowhide");
    if (!chatCard) return;

    const actor = game.actors.get(chatCard.dataset.ownerId);
    if (actor && !actor.isOwner) {
        chatCard.querySelectorAll(".critshowhidebutton").forEach(btn => {
            btn.style.display = "none";
        });
    }

    return chatCard;
};
