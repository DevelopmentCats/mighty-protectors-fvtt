import {rollMinMax} from './utility.js';

export async function RollForCritFumble(data) {
    const messageTemplate = "systems/mighty-protectors/templates/chatcards/iscritfumble.hbs";
    const rollFormula = "1d20";
    let success = false;
    let showButton = true;

    let roll = await new Roll(rollFormula).evaluate();
    const total = roll.total;

    if (data.targetName && data.targetNum && (data.targetHasDef == "true")) {
        if (data.rollType === "crit") {
            success = roll.total <= data.targetNum;
        }
        else {
            success = roll.total > data.targetNum;
        }
        showButton = success;
    }

    let rollData = {
        formula: rollFormula,
        total: total,
        rolltype: data.rollType,
        rollmessage: (data.rollType === 'crit') ? game.i18n.localize("MP.RollingForCrit") : game.i18n.localize("MP.RollingForFumble"),
        showsuccess: data.showSuccess && data.targetNum && data.targetName && (data.targetHasDef == "true"),
        success: success,
        showbutton: showButton,
        isCrit: (data.rollType === 'crit'),
        owner: data.owner.id
    };

    let cardContent = await foundry.applications.handlebars.renderTemplate(messageTemplate, rollData);

    let messageData = {
        style: CONST.CHAT_MESSAGE_STYLES.ROLL,
        rolls: [roll],
        speaker: ChatMessage.getSpeaker(),
        content: cardContent
    };

    ChatMessage.create(messageData);
}

export async function RollCritFumbleType(data) {
    const tableName = (data.rollType === "crit") ? "Critical Success" : "Critical Failure";
    const table = game.tables.getName(tableName);


    if (table) {
        table.draw();
    }
    else {
        // just roll a d20
        const roll = new Roll("1d20");
        await roll.toMessage({
            style: CONST.CHAT_MESSAGE_STYLES.ROLL,
            speaker: ChatMessage.getSpeaker(),
            flavor: ((data.rollType === "crit") ?  game.i18n.localize("MP.RollsCritSuccess") : game.i18n.localize("MP.RollsCritFailure")) + ":"
        });
    }
}

