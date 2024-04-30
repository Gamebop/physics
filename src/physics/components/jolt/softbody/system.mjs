import { BodyComponentSystem } from "../body/system.mjs";
import { BUFFER_READ_FLOAT32, BUFFER_READ_UINT32, CMD_CREATE_SOFT_BODY, CMD_REPORT_TRANSFORMS, OPERATOR_CREATOR } from "../constants.mjs";
import { SoftBodyComponent } from "./component.mjs";

const schema = [
    // Component
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

const vec = new pc.Vec3();
const quat = new pc.Quat()
const positions = [];
const indices = [];

class SoftBodyComponentSystem extends BodyComponentSystem {

    constructor(app, manager, id) {
        super(app, manager);

        this._schema = [ ...this._schema, ...schema ];

        manager.systems.set(id, this);
    }

    get id() {
        return 'softbody';
    }
    
    get ComponentType() {
        return SoftBodyComponent;
    }

    createBody(component) {
        const cb = this._manager.commandsBuffer;

        cb.writeOperator(OPERATOR_CREATOR);
        cb.writeCommand(CMD_CREATE_SOFT_BODY);

        component.writeComponentData(cb);
    }

    processCommands(cb) {
        const command = cb.readCommand();

        switch (command) {
            case CMD_REPORT_TRANSFORMS:
                this._updateVertices(cb);
            break;
        }
    }

    _updateVertices(cb) {
        const index = cb.read(BUFFER_READ_UINT32);
        const count = cb.read(BUFFER_READ_UINT32);

        const entity = this.entityMap.get(index);

        positions.length = 0;
        indices.length = 0;

        const component = entity?.c.softbody;
        const mesh = component?.meshes[0];
        if (!mesh) {
            return;
        }

        mesh.getIndices(indices);

        let sx = 1;
        let sy = 1;
        let sz = 1;
        
        if (component.useEntityScale ) {
            const s = entity.getLocalScale();
            sx = s.x || 1; sy = s.y || 1; sz = s.z || 1;
        }

        quat.copy(entity.getRotation()).invert();

        for (let i = 0; i < count; i++) {
            vec.set(
                cb.read(BUFFER_READ_FLOAT32) / sx,
                cb.read(BUFFER_READ_FLOAT32) / sy,
                cb.read(BUFFER_READ_FLOAT32) / sz
            );

            quat.transformVector(vec, vec);

            positions.push(vec.x, vec.y, vec.z);
        }

        mesh.setNormals(pc.calculateNormals(positions, indices));
        mesh.setPositions(positions);
        mesh.update();
    }
}

export { SoftBodyComponentSystem };