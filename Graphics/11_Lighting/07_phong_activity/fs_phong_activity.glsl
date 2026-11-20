#version 300 es
precision highp float;

in vec3 v_normal;
in vec3 v_surfaceToLight;
in vec3 v_surfaceToView;

uniform vec4 u_ambientLight;
uniform vec4 u_diffuseLight;
uniform vec4 u_specularLight;

uniform vec4 u_ambientColor;
uniform vec4 u_diffuseColor;
uniform vec4 u_specularColor;
uniform float u_shininess;

out vec4 outColor;

void main() {
    vec3 normal = normalize(v_normal);

    vec3 surfToLightDirection = normalize(v_surfaceToLight);
    vec3 surfToViewDirection = normalize(v_surfaceToView);

    // TODO 1: Ambient term
    //         The light contribution that reaches the surface no matter
    //         its orientation. Combines the material colors with the light.
    vec4 ambientColor = u_ambientLight * u_ambientColor;

    // TODO 2: Diffuse term (Lambert's law)
    //         The light absorbed and re-emitted by the surface, based on
    //         how directly the normal faces the light. A surface facing
    //         away from the light contributes nothing (negative values
    //         are not physical).
    vec4 diffuseColor = vec4(0.0);

    // TODO 3: Reflection vector
    //         The direction in which a ray of light bouncing off this
    //         surface would leave it (see the references in README.md).
    vec3 reflectionVector = normal;

    // TODO 4: Specular term (Phong reflection)
    //         The light that bounces directly toward the eye: larger
    //         when the view direction is close to the reflection
    //         direction, and sharpened by the material's shininess.
    //         Typically only meaningful when the surface faces the light.
    vec4 specularColor = vec4(0.0);

    // TODO 5: Final color
    //         The three terms above are independent contributions of the
    //         same light: combine them into the color of the fragment.
    outColor = ambientColor;
    outColor.a = 1.0;
};

