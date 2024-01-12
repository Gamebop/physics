import { buildAccessors } from "../../../util.mjs";
import { BodyComponentSystem } from "../body/system.mjs";
import { CMD_CREATE_SOFT_BODY, OPERATOR_CREATOR } from "../constants.mjs";
import { SoftBodyComponent } from "./component.mjs";

const schema = [
    // Component
    'enabled',
    'debugDraw',
    'renderAsset',
    'meshes',
    'useEntityScale',

    // Soft Body
	'position',
	'rotation',
	'objectLayer',
	'collisionGroup',
    'subGroup',
	'numIterations',
	'linearDamping',
	'maxLinearVelocity',
	'restitution',
	'friction',
	'pressure',
	'gravityFactor',
	'updatePosition',
	'makeRotationIdentity',
    'allowSleeping',

    // Shape Data
    'width',
    'length',
    'fixedIndices',
    'compliance'
];

class SoftBodyComponentSystem extends BodyComponentSystem {
    constructor(app, manager, id) {
        super(app, manager);

        this.id = 'softbody';
        this.schema = schema;
        this.ComponentType = SoftBodyComponent;

        manager.systems.set(id, this);

        buildAccessors(this, this.schema);
    }

    createBody(component) {
        const cb = this._manager.commandsBuffer;

        cb.writeOperator(OPERATOR_CREATOR);
        cb.writeCommand(CMD_CREATE_SOFT_BODY);

        component.writeComponentData(cb);
    }
}

export { SoftBodyComponentSystem };