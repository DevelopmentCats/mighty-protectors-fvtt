
/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
export function createRollItemMacro(data, slot) {
    if (data.type === "Item") {
        addRollItemMacro(data, slot);
        return false;
    }
}

async function addRollItemMacro(data, slot) {
    const item = await fromUuid(data.uuid);

    if (item.type == "attack" || item.type == "vehicleattack") {
        // Create the macro command
        const command = `game.mp.rollItemMacro("${item.name}");`;
        let macro = game.macros.find(m => (m.name === item.name) && (m.command === command));

        if (!macro) {
            macro = await Macro.create({
                name: item.name,
                type: "script",
                img: item.img,
                command: command,
                flags: { "mp.itemMacro": true }
            });
        }
        game.user.assignHotbarMacro(macro, slot);

    }
    return false;
}


/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemName
 * @returns {Promise}
 */
export function rollItemMacro(itemName) {
    const speaker = ChatMessage.getSpeaker();
    let actor;
    if (speaker.token) actor = canvas.tokens.get(speaker.token)?.actor;
    if (!actor) actor = game.actors.get(speaker.actor);

    if (!actor) { return ui.notifications.warn(game.i18n.localize("Warnings.NoActorSelected")); }
    // Get matching items
    const items = actor ? actor.items.filter(i => (i.name === itemName && (i.type === "attack" || i.type === "vehicleattack"))) : [];
    if (items.length > 1) {
        ui.notifications.warn(game.i18n.localize("Warnings.MultipleItems1") + `${actor.name}` 
            + game.i18n.localize("Warnings.MultipleItems2") + `${itemName}` + game.i18n.localize("Warnings.MultipleItems3"));
    } else if (items.length === 0) {
        return ui.notifications.warn(game.i18n.localize("Warnings.ItemNotExist") + `${itemName}` + ".");
    }
    const item = items[0];

    // Trigger the item roll
    return item.rollAttack();
}


export function rollSaveMacro(stat) {
    const speaker = ChatMessage.getSpeaker();
    let actor;
    if (speaker.token) actor = canvas.tokens.get(speaker.token)?.actor;
    if (!actor) actor = game.actors.get(speaker.actor);

    if (!actor) { return ui.notifications.warn(game.i18n.localize("Warnings.NoActorSelected")); }

    let rollStat = "";
    let rollTarget = "";

    switch(stat) {
        case game.i18n.localize("BC.Agility.fullname"):
        case game.i18n.localize("BC.Agility.abbr"):
            rollStat = game.i18n.localize("BC.Agility.fullname");
            rollTarget = actor.system.basecharacteristics.ag.save;
            break;
        case game.i18n.localize("BC.Endurance.fullname"):
        case game.i18n.localize("BC.Endurance.abbr"):
            rollStat = game.i18n.localize("BC.Endurance.fullname");
            rollTarget = actor.system.basecharacteristics.en.save;
            break;
        case game.i18n.localize("BC.Intelligence.fullname"):
        case game.i18n.localize("BC.Intelligence.abbr"):
            rollStat = game.i18n.localize("BC.Intelligence.fullname");
            rollTarget = actor.system.basecharacteristics.in.save;
            break;
        case game.i18n.localize("BC.Cool.fullname"):
        case game.i18n.localize("BC.Cool.abbr"):
            rollStat = game.i18n.localize("BC.Cool.fullname");
            rollTarget = actor.system.basecharacteristics.cl.save;
            break;
        case game.i18n.localize("MP.Luck"):
            rollStat = game.i18n.localize("MP.Luck");
            rollTarget = actor.system.luck;
            break;
        default:
            return ui.notifications.warn(`Invalid stat ${stat}`);              
    }


    const dataset = {
        roll: "d20",
        stat: rollStat,
        target: rollTarget
    };

    actor.rollSave(dataset);
    return;
}

export function rollOtherMacro(stat) {
    const speaker = ChatMessage.getSpeaker();
    let actor;
    if (speaker.token) actor = canvas.tokens.get(speaker.token)?.actor;
    if (!actor) actor = game.actors.get(speaker.actor);

    if (!actor) { return ui.notifications.warn(game.i18n.localize("Warnings.NoActorSelected")); }

    let rollStat = stat;
    let roll = "";

    switch(stat) {
        case game.i18n.localize("MP.Abbreviations.HandToHand"):
            roll = actor.system.hth;
            break;
        case game.i18n.localize("MP.Mass"):
            roll = actor.system.mass;
            break;
        case game.i18n.localize("MP.Luck"):
            return rollSaveMacro("Luck");
        case game.i18n.localize("MP.Wealth"):
            roll = actor.system.wealth;
            break;
        default:
            return ui.notifications.warn(`Invalid stat ${stat}`);              
    }


    const dataset = {
        roll: roll,
        stat: rollStat
    };

    actor.rollGeneric(dataset);
    return;

}