const vertexShaderSource = `#version 300 es
    in vec4 a_position;
    in vec3 a_normal;
    in vec2 a_texcoord;
    in vec4 a_color;

    uniform mat4 u_projection;
    uniform mat4 u_view;
    uniform mat4 u_world;
    uniform vec3 u_viewWorldPosition;

    out vec3 v_normal;
    out vec3 v_surfaceToView;
    out vec2 v_texcoord;
    out vec4 v_color;

    void main() {
        vec4 worldPosition = u_world * a_position;
        gl_Position = u_projection * u_view * worldPosition;
        v_surfaceToView = u_viewWorldPosition - worldPosition.xyz;
        v_normal = mat3(u_world) * a_normal;
        v_texcoord = a_texcoord;
        v_color = a_color;
    }
`;

const fragmentShaderSource = `#version 300 es
    precision highp float;

    in vec3 v_normal;
    in vec3 v_surfaceToView;
    in vec2 v_texcoord;
    in vec4 v_color;

    uniform vec3 diffuse;
    uniform sampler2D diffuseMap;
    uniform vec3 ambient;
    uniform vec3 emissive;
    uniform vec3 specular;
    uniform float shininess;
    uniform float opacity;
    uniform vec3 u_lightDirection;
    uniform vec3 u_ambientLight;

    out vec4 outColor;

    void main () {
        vec3 normal = normalize(v_normal);
      
        vec3 surfaceToViewDirection = normalize(v_surfaceToView);
        vec3 halfVector = normalize(u_lightDirection + surfaceToViewDirection);
      
        float fakeLight = dot(u_lightDirection, normal) * .5 + .5;
        float specularLight = clamp(dot(normal, halfVector), 0.0, 1.0);
      
        vec4 diffuseMapColor = texture(diffuseMap, v_texcoord);
        vec3 effectiveDiffuse = diffuse * diffuseMapColor.rgb * v_color.rgb;
        float effectiveOpacity = opacity * diffuseMapColor.a * v_color.a;
      
        outColor = vec4(
            emissive +
            ambient * u_ambientLight +
            effectiveDiffuse * fakeLight +
            specular * pow(specularLight, shininess),
            effectiveOpacity
        );
    }
`;

const initializeWorld = () => {
    const canvas = document.querySelector("#canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) {
        return;
    }

    twgl.setAttributePrefix("a_");
    const meshProgramInfo = twgl.createProgramInfo(gl, [
        vertexShaderSource,
        fragmentShaderSource,
    ]);

    return {
        gl,
        meshProgramInfo,
    };
};