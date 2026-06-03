import { MP } from "./config.js";
import * as Chat from "./chat.js";
import MightyProtectorsItemSheet from "./sheets/MightyProtectorsItemSheet.js";
import MightyProtectorsCharacterSheet from "./sheets/MightyProtectorsCharacterSheet.js";
import MPItem from './mpitem.js';
import MPActor from './mpactor.js';
import MPCombat from './mpcombat.js';
import MPCombatant from './mpcombatant.js';
import MPCombatTracker from './mpcombattracker.js';
import * as Macros from './macros.js';
import { CharacterDataModel, NPCDataModel, VehicleDataModel } from './models/actor-models.js';
import {
    AbilityDataModel, VehicleSystemDataModel, AttackDataModel, VehicleAttackDataModel,
    ProtectionDataModel, MovementDataModel, BackgroundDataModel
} from './models/item-models.js';

Hooks.once("init", function() {
    console.log("***** MP initializing   *********");

    CONFIG.MP = MP;

    checkDsNSetting();
    registerSystemSettings();

    // Register TypeDataModels (v14+ — replaces template.json)
    CONFIG.Actor.dataModels = {
        character: CharacterDataModel,
        npc:       NPCDataModel,
        vehicle:   VehicleDataModel
    };
    CONFIG.Item.dataModels = {
        ability:        AbilityDataModel,
        vehiclesystem:  VehicleSystemDataModel,
        attack:         AttackDataModel,
        vehicleattack:  VehicleAttackDataModel,
        protection:     ProtectionDataModel,
        movement:       MovementDataModel,
        background:     BackgroundDataModel
    };

    CONFIG.Item.documentClass = MPItem;
    CONFIG.Actor.documentClass = MPActor;
    CONFIG.Combat.documentClass = MPCombat;
    CONFIG.Combatant.documentClass = MPCombatant;
    CONFIG.ui.combat = MPCombatTracker;

    game.mp = {
        macros: Macros,
        rollItemMacro: Macros.rollItemMacro,
        rollSaveMacro: Macros.rollSaveMacro,
        rollOtherStat: Macros.rollOtherMacro
    }

    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet(game.system.id, MightyProtectorsItemSheet, {makeDefault: true });

    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet(game.system.id, MightyProtectorsCharacterSheet, {makeDefault: true });
});

Hooks.once("ready", function() {
    // one-time-only - set recommended setting for multi-rolling if Dice So Nice is in use
    if(!game.settings.get(game.system.id, "dsnSettingInit")){
        game.settings.set("dice-so-nice","enabledSimultaneousRollForMessage",false);
        game.settings.set(game.system.id, "dsnSettingInit",true);
    }

    Hooks.on("hotbarDrop", (bar, data, slot) => Macros.createRollItemMacro(data, slot));

    checkRollTables();

});

Hooks.on("renderChatLog", (app, html, data) => Chat.addChatListeners(html));
Hooks.on("renderChatMessage", (app, html, data) => Chat.hideCritFumble(app, html, data));


function checkDsNSetting() {
    game.settings.register(game.system.id, "dsnSettingInit", {
        name: "Flag for Dice So Nice settings init",
        scope: "world",
        config: false,
        type: Boolean,
        default: false
    });
}

async function checkRollTables() {
    // crit & fumble rolltables need to be imported for auto crit rolls to work
    // so auto-import them at startup if not already present

    let pack = await game.packs.get("mighty-protectors.mighty-protectors-rolltables");
    
    for (let tbl of pack.index)
    {
        if (!game.tables.find(t => t.name === tbl.name)) {
            game.tables.importFromCompendium(pack, tbl._id, {options: {keepId: true}});
        }
    }
}

function registerSystemSettings() {
    game.settings.register(game.system.id, "autoDecrementPowerOnAttack", {
        config: true,
        scope: "world",
        name: "SETTINGS.autoDecrementPowerOnAttack.name",
        hint: "SETTINGS.autoDecrementPowerOnAttack.label",
        type: String,
        choices: {
            "always": "MP.Always",
            "choose": "MP.Choose",
            "never": "MP.Never"
        },
        default: "choose"
    });

    game.settings.register(game.system.id, "autoDecrementChargesOnAttack", {
        config: true,
        scope: "world",
        name: "SETTINGS.autoDecrementChargesOnAttack.name",
        hint: "SETTINGS.autoDecrementChargesOnAttack.label",
        type: String,
        choices: {
            "always": "MP.Always",
            "choose": "MP.Choose",
            "never": "MP.Never"
        },
        default: "choose"
    });
    
    game.settings.register(game.system.id, "checkPowerOnAttack", {
        config: true,
        scope: "world",
        name: "SETTINGS.checkPowerOnAttack.name",
        hint: "SETTINGS.checkPowerOnAttack.label",
        type: Boolean,
        default: true
    });


    game.settings.register(game.system.id, "showSaveTargetNumbers", {
        config: true,
        scope: "world",
        name: "SETTINGS.showSaveTargetNumbers.name",
        hint: "SETTINGS.showSaveTargetNumbers.label",
        type: Boolean,
        default: true
    });
    
    game.settings.register(game.system.id, "showAttackTargetNumbers", {
        config: true,
        scope: "world",
        name: "SETTINGS.showAttackTargetNumbers.name",
        hint: "SETTINGS.showAttackTargetNumbers.label",
        type: Boolean,
        default: true
    });

    game.settings.register(game.system.id, "showCanRollWithChar", {
        config: true,
        scope: "world",
        name: "SETTINGS.showCanRollWithChar.name",
        hint: "SETTINGS.showCanRollWithChar.label",
        type: Boolean,
        default: true
    });

    game.settings.register(game.system.id, "showCanRollWithNPC", {
        config: true,
        scope: "world",
        name: "SETTINGS.showCanRollWithNPC.name",
        hint: "SETTINGS.showCanRollWithNPC.label",
        type: String,
        choices: {
            "always": "MP.Always",
            "gmonly": "MP.GMOnly",
            "never": "MP.Never"
        },
        default: "always"
    });

    game.settings.register(game.system.id, "showCritRollButtons", {
        config: true,
        scope: "world",
        name: "SETTINGS.showCritRollButtons.name",
        hint: "SETTINGS.showCritRollButtons.label",
        type: Boolean,
        default: true
    });

}

Handlebars.registerHelper('ismoveconstant', function (value) {
    return value == "constant";
});

Handlebars.registerHelper('isformulamanual', function (value) {
    return value == "manual";
});