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

    // Declare uniform variables for each light source
    uniform vec3 u_lightDirection0;
    uniform vec3 u_lightColor0;
    uniform float u_lightIntensity0;

    uniform vec3 u_lightDirection1;
    uniform vec3 u_lightColor1;
    uniform float u_lightIntensity1;

    out vec4 outColor;

    void main () {
        vec3 normal = normalize(v_normal);
    
        vec3 surfaceToViewDirection = normalize(v_surfaceToView);
    
        // Initialize final color
        vec3 finalColor = emissive;

        // Calculate contribution from each light source
        vec3 lightContribution = vec3(0.0);
        

        vec3 effectiveDiffuse = diffuse * texture(diffuseMap, v_texcoord).rgb * v_color.rgb;
        float effectiveOpacity = opacity * texture(diffuseMap, v_texcoord).a * v_color.a;
        
        // Calculate contribution from first light source
        vec3 lightDirection0 = normalize(u_lightDirection0);
        float fakeLight0 = dot(lightDirection0, normal) * 0.5 + 0.5;
        vec3 effectiveDiffuse0 = u_lightColor0 * diffuse * texture(diffuseMap, v_texcoord).rgb * v_color.rgb * u_lightIntensity0;
        float effectiveOpacity0 = opacity * texture(diffuseMap, v_texcoord).a * v_color.a;
        float specularLight0 = clamp(dot(normal, normalize(lightDirection0 + surfaceToViewDirection)), 0.0, 1.0);
        vec3 specularContribution0 = specular * pow(specularLight0, shininess);
        
        // Combine diffuse and specular lighting for first light source
        lightContribution += effectiveDiffuse0 * fakeLight0 + specularContribution0;
        
        // Calculate contribution from second light source
        vec3 lightDirection1 = normalize(u_lightDirection1);
        float fakeLight1 = dot(lightDirection1, normal) * 0.5 + 0.5;
        vec3 effectiveDiffuse1 = u_lightColor1 * diffuse * texture(diffuseMap, v_texcoord).rgb * v_color.rgb * u_lightIntensity1;
        float effectiveOpacity1 = opacity * texture(diffuseMap, v_texcoord).a * v_color.a;
        float specularLight1 = clamp(dot(normal, normalize(lightDirection1 + surfaceToViewDirection)), 0.0, 1.0);
        vec3 specularContribution1 = specular * pow(specularLight1, shininess);
        
        // Combine diffuse and specular lighting for second light source
        lightContribution += effectiveDiffuse1 * fakeLight1 + specularContribution1;
        
        // Sum up contributions from all light sources
        finalColor += ambient * lightContribution + effectiveDiffuse0 + effectiveDiffuse1 + specularContribution0 + specularContribution1;
        

        // Output final color
        outColor = vec4(finalColor, effectiveOpacity);
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