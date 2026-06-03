/**
 * TypeDataModel definitions for Mighty Protectors Actors (v14+)
 *
 * Replaces the legacy template.json Actor block.
 * Each class defines the schema for its actor type's `system` data.
 *
 * Fields are split into two groups:
 *  - Stored fields: persisted to the database (user-editable data)
 *  - Derived fields: computed in prepareDerivedData(), never stored
 *    (declared here so templates can always access them)
 */

const { fields } = foundry.data;

// ─── Shared field builders ────────────────────────────────────────────────────

function resourceField(valueDefault = 4, maxDefault = 4) {
    return new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, initial: valueDefault }),
        max:   new fields.NumberField({ required: true, integer: true, initial: maxDefault })
    });
}

function charField(cpDefault = 10) {
    return new fields.SchemaField({
        cp:    new fields.NumberField({ required: true, integer: true, initial: cpDefault }),
        value: new fields.NumberField({ required: true, integer: true, initial: cpDefault }),
        save:  new fields.NumberField({ required: true, integer: true, initial: 10 })
    });
}

function baseCharacteristicsField() {
    return new fields.SchemaField({
        st: charField(10),
        en: charField(10),
        ag: charField(10),
        in: charField(10),
        cl: charField(10)
    });
}

// ─── CharacterDataModel (character + npc) ────────────────────────────────────

export class CharacterDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            // ── Stored fields ──────────────────────────────────────────────
            hitpts:               resourceField(4, 4),
            power:                resourceField(40, 40),
            basecharacteristics:  baseCharacteristicsField(),

            trueID:       new fields.StringField({ required: true, initial: "" }),
            side:         new fields.StringField({ required: true, initial: "" }),
            birthplace:   new fields.StringField({ required: true, initial: "" }),
            species:      new fields.StringField({ required: true, initial: "" }),
            culture:      new fields.StringField({ required: true, initial: "" }),
            age:          new fields.NumberField({ required: true, integer: true, initial: 0 }),
            gender:       new fields.StringField({ required: true, initial: "" }),
            weight:       new fields.NumberField({ required: true, integer: true, initial: 120 }),
            story:        new fields.StringField({ required: true, initial: "" }),
            motivation:   new fields.StringField({ required: true, initial: "" }),
            wealth:       new fields.StringField({ required: true, initial: "d4" }),
            origintype:   new fields.StringField({ required: true, initial: "" }),
            legalstatus:  new fields.StringField({ required: true, initial: "" }),
            hasclearance: new fields.BooleanField({ required: true, initial: false }),
            base_cp:      new fields.NumberField({ required: true, integer: true, initial: 50 }),
            earned_xp:    new fields.NumberField({ required: true, integer: true, initial: 0 }),

            // ── Derived fields (computed in prepareDerivedData) ────────────
            multiinit:       new fields.BooleanField({ required: false, initial: false }),
            carry:           new fields.StringField({ required: false, nullable: true, initial: null }),
            hth:             new fields.StringField({ required: false, nullable: true, initial: null }),
            mass:            new fields.StringField({ required: false, nullable: true, initial: null }),
            stat_cp:         new fields.NumberField({ required: false, nullable: true, initial: null }),
            ability_cp:      new fields.NumberField({ required: false, nullable: true, initial: null }),
            total_cp:        new fields.NumberField({ required: false, nullable: true, initial: null }),
            avail_ip:        new fields.NumberField({ required: false, nullable: true, initial: null }),
            used_ip:         new fields.NumberField({ required: false, nullable: true, initial: null }),
            spent_xp:        new fields.NumberField({ required: false, nullable: true, initial: null }),
            clearance:       new fields.NumberField({ required: false, nullable: true, initial: null }),
            luck:            new fields.NumberField({ required: false, nullable: true, initial: null }),
            healing:         new fields.NumberField({ required: false, nullable: true, initial: null }),
            physicaldefense: new fields.NumberField({ required: false, nullable: true, initial: null }),
            mentaldefense:   new fields.NumberField({ required: false, nullable: true, initial: null }),
            initiative:      new fields.StringField({ required: false, nullable: true, initial: null }),
            caps:            new fields.ObjectField({ required: false, nullable: true, initial: null }),
            gear:            new fields.ObjectField({ required: false, nullable: true, initial: null })
        };
    }
}

// ─── NPCDataModel (same schema as character) ──────────────────────────────────

export class NPCDataModel extends CharacterDataModel {}

// ─── VehicleDataModel ────────────────────────────────────────────────────────

export class VehicleDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            // ── Stored fields ──────────────────────────────────────────────
            hitpts:              resourceField(4, 4),
            power:               resourceField(40, 40),
            basecharacteristics: baseCharacteristicsField(),

            model:               new fields.StringField({ required: true, initial: "" }),
            operator:            new fields.StringField({ required: true, initial: "" }),
            basic_cost:          new fields.NumberField({ required: true, integer: true, initial: 5 }),
            is_base:             new fields.NumberField({ required: true, integer: true, initial: 0 }),
            techcostadjustment:  new fields.NumberField({ required: true, integer: true, initial: 0 }),
            firstaccel:          new fields.NumberField({ required: true, integer: true, initial: 0 }),
            inchesperhex:        new fields.NumberField({ required: true, integer: true, initial: 0 }),
            defense:             new fields.NumberField({ required: false, nullable: true, initial: null }),
            basetohit:           new fields.NumberField({ required: false, nullable: true, initial: null }),

            // ── Derived fields (computed in prepareDerivedData) ────────────
            spaces:        new fields.NumberField({ required: false, nullable: true, initial: null }),
            weight:        new fields.NumberField({ required: false, nullable: true, initial: null }),
            mass:          new fields.StringField({ required: false, nullable: true, initial: null }),
            profile:       new fields.NumberField({ required: false, nullable: true, initial: null }),
            turnrate:      new fields.NumberField({ required: false, nullable: true, initial: null }),
            explosion:     new fields.StringField({ required: false, nullable: true, initial: null }),
            explosionarea: new fields.NumberField({ required: false, nullable: true, initial: null }),
            handling:      new fields.NumberField({ required: false, nullable: true, initial: null }),
            hth:           new fields.StringField({ required: false, nullable: true, initial: null }),
            initiative:    new fields.StringField({ required: false, nullable: true, initial: null }),
            spacesLeft:    new fields.NumberField({ required: false, nullable: true, initial: null }),
            total_cp:      new fields.NumberField({ required: false, nullable: true, initial: null }),
            travelrates:   new fields.ObjectField({ required: false, nullable: true, initial: null })
        };
    }
}
