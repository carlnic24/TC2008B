/*
 * Script to draw a 2D smiley face, and apply trasnformations to it
 *
 * Gilberto Echeverria
 * 2026-07-16
 */

'use strict';

import * as twgl from 'twgl-base.js';
import GUI from 'lil-gui';
import { diamond, smiley } from '../libs/shapes.js';
import { V2, M3, type Vec2, type Mat3 } from '../libs/2d-lib.js';
import { Scene } from '../libs/scene.js';
import { type Color } from '../libs/color.js';

// Import the shaders from external files
import vsGLSL from './vs_matrices_vcolor.glsl?raw';
import fsGLSL from './fs_vertex_color.glsl?raw';

type Step = 'scale' | 'rotation' | 'translation';

// Transformation steps, listed in the order in which they are APPLIED
const ORDERS: Record<string, Step[]> = {
    'scale -> rotation -> translation': ['scale', 'rotation', 'translation'],
    'scale -> translation -> rotation': ['scale', 'translation', 'rotation'],
    'translation -> scale -> rotation': ['translation', 'scale', 'rotation'],
    'rotation -> translation -> scale': ['rotation', 'translation', 'scale'],
    'rotation -> scale -> translation': ['rotation', 'scale', 'translation'],
};

/*
 * Subclass of Scene with the particular objects and settings for this example.
 * Specifies the objects that will be used, and the UI operations available.
 */
class RotationScene extends Scene {
    // Order in which the transformations are applied (selected in the GUI)
    order: string = 'scale -> translation -> rotation';

    constructor(gl: WebGL2RenderingContext) {
        super(gl, vsGLSL, fsGLSL);

        // Create the objects for this scene
        const model = this.addObject('model', smiley(150),
            [ 0.78, 0.6, 0.35, 1 ]);
        // The model starts away from the pivot, to see it rotate around it
        model.transforms.t.x = gl.canvas.width / 2 + 200;
        model.transforms.t.y = gl.canvas.height / 2;

        const pivot = this.addObject('pivot', diamond(30),
            [ 0.6, 0.6, 0.6, 1]);
        pivot.transforms.t.x = gl.canvas.width / 2;
        pivot.transforms.t.y = gl.canvas.height / 2;
    }

    // Method to draw the scene.
    protected render(): void {
        const { gl, programInfo } = this;
        const model = this.getObject('model');
        const pivot = this.getObject('pivot');

        // Vector to the position of the model
        const v2_trans: Vec2 = V2.create(model.transforms.t.x, model.transforms.t.y);
        const v2_scale: Vec2 = V2.create(model.transforms.s.x, model.transforms.s.y);

        // Vector to translate the pivot to the center of the world
        const v2_pivot_to_center: Vec2 = V2.create(-pivot.transforms.t.x,
                                                   -pivot.transforms.t.y);
        // Vector to translate the pivot back to its original position
        const v2_center_to_pivot: Vec2 = V2.create(pivot.transforms.t.x,
                                                   pivot.transforms.t.y);

        // Transform matrices for the model
        const scaleMatrixModel: Mat3 = M3.scale(v2_scale);
        const translateMatrixModel: Mat3 = M3.translation(v2_trans);
        const rotateMatrixModel: Mat3 = M3.rotation(model.transforms.rr.z);

        // Rotation around the pivot: move the pivot to the center,
        // rotate, and move the pivot back to its original position
        const rotateAroundPivot: Mat3 = M3.multiply(
            M3.translation(v2_center_to_pivot),
            M3.multiply(rotateMatrixModel, M3.translation(v2_pivot_to_center)));

        const steps: Record<Step, Mat3> = {
            scale: scaleMatrixModel,
            rotation: rotateAroundPivot,
            translation: translateMatrixModel,
        };

        // Create a composite transform matrix, multiplying the matrices
        // in the order selected in the GUI
        let modelTransforms: Mat3 = M3.identity();
        for (const step of ORDERS[this.order]) {
            modelTransforms = M3.multiply(steps[step], modelTransforms);
        }

        gl.useProgram(programInfo.program);

        let uniforms = {
            u_resolution: [gl.canvas.width, gl.canvas.height],
            u_transforms: modelTransforms,
            u_color: model.color,
        };
        twgl.setUniforms(programInfo, uniforms);
        gl.bindVertexArray(model.vao);
        twgl.drawBufferInfo(gl, model.bufferInfo);

        // Transform matrices for the pivot
        const translateMatrixPivot: Mat3 = M3.translation(v2_center_to_pivot);

        // Composite transform matrix for the pivot (only translation)
        let pivotTransforms: Mat3 = M3.identity();
        pivotTransforms = M3.multiply(translateMatrixPivot, pivotTransforms);

        uniforms = {
            u_resolution: [gl.canvas.width, gl.canvas.height],
            u_transforms: pivotTransforms,
            u_color: pivot.color,
        };
        twgl.setUniforms(programInfo, uniforms);
        gl.bindVertexArray(pivot.vao);
        twgl.drawBufferInfo(gl, pivot.bufferInfo);
    }

    setupUI(): void {
        const { gl } = this;
        const model = this.getObject('model');
        const pivot = this.getObject('pivot');

        const gui = new GUI();

        // Drop-down menu to select the order of the transformations
        gui.add(this, 'order', Object.keys(ORDERS)).name('Order');

        const modelFolder = gui.addFolder('Model');

        const traFolder = modelFolder.addFolder('Translation');
        traFolder.add(model.transforms.t, 'x', 0, gl.canvas.width)
            .onChange((value: number) => {
                model.transforms.t.x = value;
            });
        traFolder.add(model.transforms.t, 'y', 0, gl.canvas.height)
            .onChange((value: number) => {
                model.transforms.t.y = value;
            });

        const rotFolder = modelFolder.addFolder('Rotation');
        rotFolder.add(model.transforms.rr, 'z', 0, Math.PI * 2)
            .onChange((value: number) => {
                model.transforms.rr.z = value;
            });

        const scaFolder = modelFolder.addFolder('Scale');
        scaFolder.add(model.transforms.s, 'x', -5, 5)
            .onChange((value: number) => {
                model.transforms.s.x = value;
            });
        scaFolder.add(model.transforms.s, 'y', -5, 5)
            .onChange((value: number) => {
                model.transforms.s.y = value;
            });

        // The shader uses the color of the vertices, so the body color
        // is changed by updating the color buffer of the model
        const colorFolder = modelFolder.addFolder('Color');
        colorFolder.addColor(model, 'color')
            .onChange((value: Color) => {
                const c = [value[0], value[1], value[2], 1];
                const newArrays = smiley(150, c);
                twgl.setAttribInfoBufferFromArray(
                    gl, model.bufferInfo.attribs!.a_color, newArrays.a_color);
            });

        const pivotFolder = gui.addFolder('Pivot');
        const pivotTraFolder = pivotFolder.addFolder('Translation');
        pivotTraFolder.add(pivot.transforms.t, 'x', 0, gl.canvas.width)
            .onChange((value: number) => {
                pivot.transforms.t.x = value;
            });
        pivotTraFolder.add(pivot.transforms.t, 'y', 0, gl.canvas.height)
            .onChange((value: number) => {
                pivot.transforms.t.y = value;
            });
    }
}

/*
 * Main function to initialize the WebGL context, create the scene, and set up the UI.
 */
function main(): void {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
        throw new Error('No canvas element found in the document');
    }

    const gl = canvas.getContext('webgl2');
    if (!gl) {
        throw new Error('WebGL2 is not supported by this browser');
    }

    const scene = new RotationScene(gl);
    scene.setupUI();
    scene.draw(0);
}

main()