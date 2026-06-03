/**
 * TypeDataModel definitions for Mighty Protectors Items (v14+)
 *
 * Replaces the legacy template.json Item block.
 * Each class defines the schema for its item type's `system` data.
 */

const { fields } = foundry.data;

// ─── AbilityDataModel ────────────────────────────────────────────────────────

export class AbilityDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            description:  new fields.StringField({ required: true, initial: "" }),
            cpcost:       new fields.NumberField({ required: true, integer: true, initial: 0 }),
            ipcost:       new fields.NumberField({ required: true, integer: true, initial: 0 }),
            rules:        new fields.StringField({ required: true, initial: "" }),
            stbonus:      new fields.NumberField({ required: true, integer: true, initial: 0 }),
            enbonus:      new fields.NumberField({ required: true, integer: true, initial: 0 }),
            agbonus:      new fields.NumberField({ required: true, integer: true, initial: 0 }),
            inbonus:      new fields.NumberField({ required: true, integer: true, initial: 0 }),
            clbonus:      new fields.NumberField({ required: true, integer: true, initial: 0 }),
            tohitbonus:   new fields.NumberField({ required: true, integer: true, initial: 0 }),
            physdefbonus: new fields.NumberField({ required: true, integer: true, initial: 0 }),
            mentdefbonus: new fields.NumberField({ required: true, integer: true, initial: 0 }),
            powerbonus:   new fields.NumberField({ required: true, integer: true, initial: 0 }),
            hpbonus:      new fields.NumberField({ required: true, integer: true, initial: 0 }),
            initbonus:    new fields.NumberField({ required: true, integer: true, initial: 0 }),
            luckbonus:    new fields.NumberField({ required: true, integer: true, initial: 0 }),
            usescharges:  new fields.BooleanField({ required: true, initial: false }),
            charges:      new fields.NumberField({ required: true, integer: true, initial: 0 }),
            chargesused:  new fields.NumberField({ required: true, integer: true, initial: 0 }),
            isgear:       new fields.BooleanField({ required: true, initial: false }),
            multiinit:    new fields.BooleanField({ required: true, initial: false }),
            ipbonus:      new fields.NumberField({ required: true, integer: true, initial: 0 })
        };
    }
}

// ─── VehicleSystemDataModel ───────────────────────────────────────────────────

export class VehicleSystemDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            // Stored
            description:    new fields.StringField({ required: true, initial: "" }),
            dmg:            new fields.NumberField({ required: true, integer: true, initial: 0 }),
            cost:           new fields.NumberField({ required: true, integer: true, initial: 0 }),
            systemspaces:   new fields.NumberField({ required: true, integer: true, initial: 5 }),
            integral:       new fields.BooleanField({ required: true, initial: false }),
            bulky:          new fields.NumberField({ required: true, integer: true, initial: 0 }),
            delicate:       new fields.NumberField({ required: true, integer: true, initial: 0 }),
            open:           new fields.BooleanField({ required: true, initial: false }),
            stbonus:        new fields.NumberField({ required: true, integer: true, initial: 0 }),
            enbonus:        new fields.NumberField({ required: true, integer: true, initial: 0 }),
            agbonus:        new fields.NumberField({ required: true, integer: true, initial: 0 }),
            inbonus:        new fields.NumberField({ required: true, integer: true, initial: 0 }),
            clbonus:        new fields.NumberField({ required: true, integer: true, initial: 0 }),
            maneuverability: new fields.NumberField({ required: true, integer: true, initial: 0 }),
            usescharges:    new fields.BooleanField({ required: true, initial: false }),
            charges:        new fields.NumberField({ required: true, integer: true, initial: 0 }),
            chargesused:    new fields.NumberField({ required: true, integer: true, initial: 0 }),
            isgear:         new fields.BooleanField({ required: true, initial: false }),
            tohitbonus:     new fields.NumberField({ required: true, integer: true, initial: 0 }),
            hpbonus:        new fields.NumberField({ required: true, integer: true, initial: 0 }),
            powerbonus:     new fields.NumberField({ required: true, integer: true, initial: 0 }),
            indpower:       new fields.BooleanField({ required: true, initial: false }),
            powervalue:     new fields.NumberField({ required: true, integer: true, initial: 0 }),
            powermax:       new fields.NumberField({ required: true, integer: true, initial: 0 }),
            // Derived (set in _prepareDerivedVehicleSystemData)
            profile:        new fields.NumberField({ required: false, nullable: true, initial: null }),
            hits:           new fields.NumberField({ required: false, nullable: true, initial: null }),
            points:         new fields.NumberField({ required: false, nullable: true, initial: null })
        };
    }
}

// ─── AttackDataModel ─────────────────────────────────────────────────────────

export class AttackDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            // Stored
            dmgroll:      new fields.StringField({ required: true, initial: "1d4" }),
            dmgtype:      new fields.StringField({ required: true, initial: "DAMAGE.BluntKinetic" }),
            dmgsubtype:   new fields.StringField({ required: true, initial: "" }),
            knockback:    new fields.StringField({ required: true, initial: "Y" }),
            attribute:    new fields.StringField({ required: true, initial: "AG" }),
            powercost:    new fields.NumberField({ required: true, integer: true, initial: 0 }),
            usecharges:   new fields.BooleanField({ required: true, initial: false }),
            chargesource: new fields.StringField({ required: true, initial: "" }),
            bonusids:     new fields.ArrayField(new fields.StringField(), { required: true, initial: [] }),
            // Derived (set in _prepareDerivedAttackData)
            tohit:        new fields.NumberField({ required: false, nullable: true, initial: null }),
            tohitbonus:   new fields.NumberField({ required: false, nullable: true, initial: null })
        };
    }
}

// ─── VehicleAttackDataModel ───────────────────────────────────────────────────

export class VehicleAttackDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            // Stored
            dmgroll:          new fields.StringField({ required: true, initial: "1d4" }),
            dmgtype:          new fields.StringField({ required: true, initial: "DAMAGE.BluntKinetic" }),
            dmgsubtype:       new fields.StringField({ required: true, initial: "" }),
            knockback:        new fields.StringField({ required: true, initial: "Y" }),
            powercost:        new fields.NumberField({ required: true, integer: true, initial: 0 }),
            usecharges:       new fields.BooleanField({ required: true, initial: false }),
            chargesource:     new fields.StringField({ required: true, initial: "" }),
            indpowersource:   new fields.StringField({ required: false, nullable: true, initial: null }),
            bonusids:         new fields.ArrayField(new fields.StringField(), { required: true, initial: [] }),
            // Derived
            tohit:            new fields.NumberField({ required: false, nullable: true, initial: null }),
            tohitbonus:       new fields.NumberField({ required: false, nullable: true, initial: null })
        };
    }
}

// ─── ProtectionDataModel ─────────────────────────────────────────────────────

export class ProtectionDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            kinetic:   new fields.NumberField({ required: true, integer: true, initial: 0 }),
            energy:    new fields.NumberField({ required: true, integer: true, initial: 0 }),
            bio:       new fields.NumberField({ required: true, integer: true, initial: 0 }),
            entropy:   new fields.NumberField({ required: true, integer: true, initial: 0 }),
            psychic:   new fields.NumberField({ required: true, integer: true, initial: 0 }),
            other:     new fields.NumberField({ required: true, integer: true, initial: 0 }),
            otherdesc: new fields.StringField({ required: true, initial: "" })
        };
    }
}

// ─── MovementDataModel ────────────────────────────────────────────────────────

export class MovementDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            // Stored
            moverate:        new fields.NumberField({ required: true, integer: true, initial: 10 }),
            moveratetype:    new fields.StringField({ required: true, initial: "constant" }),
            accel:           new fields.NumberField({ required: true, integer: true, initial: 0 }),
            top:             new fields.NumberField({ required: true, integer: true, initial: 0 }),
            moverateformula: new fields.StringField({ required: true, initial: "manual" }),
            // Derived (set in _prepareDerivedMovementData)
            calcmoverate:    new fields.NumberField({ required: false, nullable: true, initial: null })
        };
    }
}

// ─── BackgroundDataModel ─────────────────────────────────────────────────────
// template.json has no fields defined for background — empty schema

export class BackgroundDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {};
    }
}
