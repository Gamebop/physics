import { EventHandler } from 'playcanvas';

class Component extends EventHandler {
    _accessorsBuilt = false;

    _enabled = true;

    _system = null;

    _entity = null;

    _order = 0;

    constructor(system, entity) {
        super();

        this._system = system;
        this._entity = entity;

        this.on('set', function (name, oldValue, newValue) {
            this.fire('set_' + name, name, oldValue, newValue);
        });

        this.on('set_enabled', this.onSetEnabled, this);
    }

    /**
     * @type {import('playcanvas').Entity | null}
     * @private
     */
    get entity() {
        return this._entity;
    }

    /**
     * @type {import('./body/system.mjs').BodyComponentSystem |
     * import('./char/system.mjs').CharComponentSystem |
     * import('./constraint/system.mjs').ConstraintComponentSystem |
     * import('./shape/system.mjs').ShapeComponentSystem |
     * import('./softbody/system.mjs').SoftBodyComponentSystem | null}
     * @private
     */
    get system() {
        return this._system;
    }

    /**
     * @param {boolean} bool - Whether the component accessor's are built.
     * @private
     */
    set accessorsBuilt(bool) {
        this._accessorsBuilt = bool;
    }

    /**
     * @type {boolean}
     * @private
     */
    get accessorsBuilt() {
        return this._accessorsBuilt;
    }

    /**
     * // TODO
     *
     * @type {number}
     * @private
     */
    get order() {
        return this._order;
    }

    onSetEnabled(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            if (this.entity.enabled) {
                if (newValue) {
                    this.onEnable();
                } else {
                    this.onDisable();
                }
            }
        }
    }

    onEnable() {}

    onDisable() {}

    // PlayCanvas compatibility
    onPostStateChange() {}
}

export { Component };
