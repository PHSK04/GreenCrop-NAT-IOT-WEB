import bpy
import math
from pathlib import Path
from mathutils import Vector


ROOT = Path("/Users/phsk/Documents/GitHub/GreenCrop-NAT-IOT-WEB")
GLB = ROOT / "public/models/greencrop-nat-functional.glb"
BLEND = ROOT / "greencrop-nat-functional.blend"


def mat(name, color, metallic=0.0, roughness=0.35, transmission=0.0, emission=None):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if "Transmission Weight" in bsdf.inputs:
        bsdf.inputs["Transmission Weight"].default_value = transmission
    if emission and "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = emission[0]
        bsdf.inputs["Emission Strength"].default_value = emission[1]
    if color[3] < 1:
        material.surface_render_method = "DITHERED"
    return material


def cube(name, location, scale, material, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    if bevel:
        modifier = obj.modifiers.new("Edge_Radius", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
    return obj


def cylinder(name, location, radius, depth, material, rotation=(0, 0, 0), vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def loop_rotation(obj, axis, end=120, turns=4):
    obj.rotation_mode = "XYZ"
    obj.rotation_euler[axis] = 0
    obj.keyframe_insert("rotation_euler", index=axis, frame=1, group=obj.name)
    obj.rotation_euler[axis] = math.tau * turns
    obj.keyframe_insert("rotation_euler", index=axis, frame=end, group=obj.name)
    action = obj.animation_data.action
    action.name = f"{obj.name}_Loop"


def animate_path(obj, points, start_offset=0, end=120):
    count = len(points)
    for index, point in enumerate(points):
        frame = 1 + start_offset + index * (end - 1) / count
        while frame > end:
            frame -= end - 1
        obj.location = point
        obj.keyframe_insert("location", frame=frame, group="Water_Circulation")
    action = obj.animation_data.action
    action.name = f"{obj.name}_Loop"


# Remove previous generated functional parts only.
for obj in list(bpy.data.objects):
    if obj.name.startswith(("SYS_", "Pump_", "Fan_", "GrowLight_", "Water_")):
        bpy.data.objects.remove(obj, do_unlink=True)

model = bpy.data.objects.get("model")
if not model or model.type != "MESH":
    raise RuntimeError("Expected the imported machine mesh named 'model'")

corners = [model.matrix_world @ Vector(corner) for corner in model.bound_box]
lo = Vector((min(p.x for p in corners), min(p.y for p in corners), min(p.z for p in corners)))
hi = Vector((max(p.x for p in corners), max(p.y for p in corners), max(p.z for p in corners)))
size = hi - lo
center = (lo + hi) * 0.5
s = max(size)

metal = mat("SYS_BrushedSteel", (0.32, 0.38, 0.39, 1), 0.78, 0.24)
dark = mat("SYS_Rubber", (0.012, 0.018, 0.019, 1), 0.18, 0.28)
water_mat = mat("SYS_Water", (0.015, 0.32, 0.48, 0.72), 0.0, 0.08, 0.72)
foam_mat = mat("SYS_WaterFoam", (0.15, 0.82, 1.0, 0.82), 0.0, 0.12, 0.25)
lamp_mat = mat(
    "SYS_GrowLamp", (1.0, 0.76, 0.34, 1), 0.05, 0.16,
    emission=((1.0, 0.52, 0.16, 1), 7.0),
)

# Water volumes sit below the rims: two reservoirs and the upper grow trough.
tank_z = lo.z + size.z * 0.255
for name, x in (("Water_Tank_Left", center.x - size.x * 0.29),
                ("Water_Tank_Right", center.x + size.x * 0.29)):
    water = cube(name, (x, center.y, tank_z),
                 (size.x * 0.105, size.y * 0.23, size.z * 0.012),
                 water_mat, s * 0.006)
    water["system"] = "water"
    water["web_control"] = "water_enabled"

tray = cube("Water_GrowTray", (center.x, center.y, lo.z + size.z * 0.57),
            (size.x * 0.39, size.y * 0.17, size.z * 0.009),
            water_mat, s * 0.004)
tray["system"] = "water"
tray["web_control"] = "water_enabled"

# Real fan assembly attached to the controller side.
fan_center = Vector((hi.x - size.x * 0.055, center.y - size.y * 0.28, lo.z + size.z * 0.40))
housing = cylinder("Fan_Housing", fan_center, s * 0.055, s * 0.025, dark,
                   rotation=(math.pi / 2, 0, 0))
hub = cylinder("Fan_Hub", fan_center + Vector((0, -s * 0.018, 0)), s * 0.014, s * 0.035,
               metal, rotation=(math.pi / 2, 0, 0))
blades = bpy.data.objects.new("Fan_Blades", None)
bpy.context.collection.objects.link(blades)
blades.location = fan_center + Vector((0, -s * 0.039, 0))
for i in range(5):
    angle = i * math.tau / 5
    blade = cube(f"SYS_FanBlade_{i+1}", (0, 0, 0),
                 (s * 0.033, s * 0.006, s * 0.012), metal, s * 0.004)
    blade.parent = blades
    blade.location = (math.cos(angle) * s * 0.028, 0, math.sin(angle) * s * 0.028)
    blade.rotation_euler.y = -angle
blades["system"] = "fan"
blades["web_control"] = "fan_enabled"
loop_rotation(blades, 1, turns=8)

# Two visible pump bodies and independent rotors.
for idx, x in enumerate((center.x - size.x * 0.16, center.x + size.x * 0.16), 1):
    pump_z = lo.z + size.z * 0.18
    cylinder(f"Pump_Housing_{idx:02d}", (x, center.y - size.y * 0.28, pump_z),
             s * 0.038, s * 0.075, dark, rotation=(math.pi / 2, 0, 0))
    rotor = cylinder(f"Pump_Rotor_{idx:02d}", (x, center.y - size.y * 0.325, pump_z),
                     s * 0.022, s * 0.012, metal, rotation=(math.pi / 2, 0, 0), vertices=20)
    rotor["system"] = "pump"
    rotor["web_control"] = "pump_enabled"
    loop_rotation(rotor, 1, turns=6)

# Warm grow-light bars under the roof frame.
for idx, x in enumerate((-0.34, -0.17, 0.0, 0.17, 0.34), 1):
    lamp = cube(f"GrowLight_{idx:02d}",
                (center.x + size.x * x, center.y, hi.z - size.z * 0.055),
                (size.x * 0.065, size.y * 0.075, size.z * 0.010),
                lamp_mat, s * 0.006)
    lamp["system"] = "light"
    lamp["web_control"] = "lights_enabled"

# Animated water packets follow a closed physical loop: tank -> pump -> tray -> return.
path = [
    Vector((center.x - size.x * 0.29, center.y - size.y * 0.30, tank_z)),
    Vector((center.x - size.x * 0.16, center.y - size.y * 0.30, lo.z + size.z * 0.18)),
    Vector((center.x, center.y - size.y * 0.30, lo.z + size.z * 0.18)),
    Vector((center.x + size.x * 0.16, center.y - size.y * 0.30, lo.z + size.z * 0.18)),
    Vector((center.x + size.x * 0.29, center.y - size.y * 0.30, tank_z)),
    Vector((center.x + size.x * 0.36, center.y - size.y * 0.30, lo.z + size.z * 0.57)),
    Vector((center.x, center.y - size.y * 0.30, lo.z + size.z * 0.57)),
    Vector((center.x - size.x * 0.36, center.y - size.y * 0.30, lo.z + size.z * 0.57)),
]
for idx in range(8):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=s * 0.012, location=path[0])
    packet = bpy.context.object
    packet.name = f"Water_Flow_{idx+1:02d}"
    packet.data.materials.append(foam_mat)
    packet["system"] = "water_flow"
    packet["web_control"] = "water_enabled"
    animate_path(packet, path[idx:] + path[:idx], start_offset=idx * 2)

scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = 120
scene.render.fps = 30
scene["web_animation_controls"] = "pump_enabled,fan_enabled,lights_enabled,water_enabled"

# Export product + functional named nodes, excluding studio presentation objects.
bpy.ops.object.select_all(action="DESELECT")
for obj in scene.objects:
    is_product_part = (
        obj == model
        or obj.name.startswith(("SYS_", "Pump_", "Fan_", "GrowLight_", "Water_"))
    )
    if is_product_part and obj.type in {"MESH", "EMPTY"}:
        obj.hide_render = False
        obj.select_set(True)
bpy.context.view_layer.objects.active = model
bpy.ops.export_scene.gltf(
    filepath=str(GLB),
    export_format="GLB",
    use_selection=True,
    export_animations=True,
    export_frame_range=True,
    export_materials="EXPORT",
)
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
scene.frame_set(1)
print(f"FUNCTIONAL_EXPORT_OK:{GLB}")
