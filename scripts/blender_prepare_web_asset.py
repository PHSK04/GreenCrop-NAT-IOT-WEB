import bpy
import math
from collections import deque
from mathutils import Vector
from pathlib import Path


ROOT = Path("/Users/phsk/Documents/GitHub/GreenCrop-NAT-IOT-WEB")
OUTPUT_DIR = ROOT / "src" / "assets" / "images" / "generated"
PUBLIC_MODEL = ROOT / "public" / "models" / "greencrop-nat-realistic.glb"
BLEND_FILE = ROOT / "greencrop-nat-web-ready.blend"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
PUBLIC_MODEL.parent.mkdir(parents=True, exist_ok=True)

# In headless mode, build from the website's current GLB. In the interactive
# Blender session, preserve and enhance the model already open on screen.
if bpy.app.background:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(ROOT / "public" / "models" / "greencrop-nat-01.glb"))


def material(name, base, metallic=0.0, roughness=0.45):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*base, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    return mat


def aim_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def area_light(name, location, energy, color, size, target):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.color = color
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    aim_at(obj, target)
    return obj


# Remove only presentation objects from previous runs.
for obj in list(bpy.data.objects):
    if obj.name.startswith("WEB_"):
        bpy.data.objects.remove(obj, do_unlink=True)

all_meshes = [o for o in bpy.context.scene.objects if o.type == "MESH" and not o.name.startswith("WEB_")]
named_model = bpy.data.objects.get("model")
meshes = [named_model] if named_model and named_model.type == "MESH" else all_meshes
if not meshes:
    raise RuntimeError("No mesh objects found in the current Blender scene")
for obj in all_meshes:
    if obj not in meshes:
        obj.hide_render = True

# Bounds of the imported machine.
corners = [o.matrix_world @ Vector(corner) for o in meshes for corner in o.bound_box]
mins = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
maxs = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
center = (mins + maxs) * 0.5
size = maxs - mins
span = max(size.x, size.y, size.z)

aluminum = material("GC_Brushed_Aluminum", (0.48, 0.55, 0.56), metallic=0.82, roughness=0.24)
graphite = material("GC_Graphite", (0.025, 0.035, 0.033), metallic=0.58, roughness=0.27)
off_white = material("GC_Off_White_Plastic", (0.78, 0.81, 0.78), metallic=0.04, roughness=0.32)
light_material = material("GC_Grow_Light", (0.95, 0.89, 0.68), metallic=0.02, roughness=0.18)
light_shader = light_material.node_tree.nodes.get("Principled BSDF")
if "Emission Color" in light_shader.inputs:
    light_shader.inputs["Emission Color"].default_value = (1.0, 0.72, 0.28, 1.0)
    light_shader.inputs["Emission Strength"].default_value = 3.2
floor_mat = material("GC_Studio_Floor", (0.018, 0.024, 0.022), metallic=0.08, roughness=0.31)


def colorize_connected_parts(obj):
    mesh = obj.data
    mesh.materials.clear()
    for mat in (aluminum, off_white, graphite, light_material):
        mesh.materials.append(mat)

    face_neighbors = [[] for _ in mesh.polygons]
    edge_faces = {}
    for poly in mesh.polygons:
        for edge_key in poly.edge_keys:
            edge_faces.setdefault(edge_key, []).append(poly.index)
    for linked in edge_faces.values():
        for face_index in linked:
            face_neighbors[face_index].extend(i for i in linked if i != face_index)

    visited = set()
    object_min = Vector((
        min(v.co.x for v in mesh.vertices),
        min(v.co.y for v in mesh.vertices),
        min(v.co.z for v in mesh.vertices),
    ))
    object_max = Vector((
        max(v.co.x for v in mesh.vertices),
        max(v.co.y for v in mesh.vertices),
        max(v.co.z for v in mesh.vertices),
    ))
    object_size = object_max - object_min
    overall = max(object_size)

    for start in range(len(mesh.polygons)):
        if start in visited:
            continue
        queue = deque([start])
        visited.add(start)
        island_faces = []
        vertex_indices = set()
        while queue:
            face_index = queue.popleft()
            island_faces.append(face_index)
            vertex_indices.update(mesh.polygons[face_index].vertices)
            for neighbor in face_neighbors[face_index]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)

        coords = [mesh.vertices[index].co for index in vertex_indices]
        lo = Vector((min(v.x for v in coords), min(v.y for v in coords), min(v.z for v in coords)))
        hi = Vector((max(v.x for v in coords), max(v.y for v in coords), max(v.z for v in coords)))
        dims = hi - lo
        center_local = (lo + hi) * 0.5
        normalized_z = (center_local.z - object_min.z) / max(object_size.z, 1e-6)
        ordered_dims = sorted((dims.x, dims.y, dims.z), reverse=True)
        material_index = 0

        # Broad volumetric islands: reservoirs, grow trough and controller case.
        if ordered_dims[1] > overall * 0.11 and ordered_dims[2] > overall * 0.055:
            material_index = 1

        # Compact fittings and pump housings.
        if ordered_dims[0] < overall * 0.22 and ordered_dims[1] > overall * 0.025 and normalized_z < 0.72:
            material_index = 2

        # Thin roof-mounted fixtures: warm grow lights.
        if normalized_z > 0.86 and ordered_dims[0] > overall * 0.16 and ordered_dims[1] < overall * 0.055:
            material_index = 3

        for face_index in island_faces:
            mesh.polygons[face_index].material_index = material_index


# Make the imported geometry read as a manufactured product.
for i, obj in enumerate(meshes):
    colorize_connected_parts(obj)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    if len(obj.data.polygons) < 250000 and not any(m.type == "BEVEL" for m in obj.modifiers):
        bevel = obj.modifiers.new("WEB_Micro_Bevel", "BEVEL")
        bevel.width = max(span * 0.0022, 0.001)
        bevel.segments = 3
        bevel.limit_method = "ANGLE"
        bevel.angle_limit = math.radians(32)

# Studio floor with a large soft bevel.
bpy.ops.mesh.primitive_cube_add(
    location=(center.x, center.y, mins.z - span * 0.045),
    scale=(span * 1.55, span * 1.55, span * 0.035),
)
floor = bpy.context.object
floor.name = "WEB_Studio_Floor"
floor.data.materials.append(floor_mat)
floor_bevel = floor.modifiers.new("WEB_Floor_Bevel", "BEVEL")
floor_bevel.width = span * 0.05
floor_bevel.segments = 8

# Camera: slightly elevated three-quarter product angle.
cam_data = bpy.data.cameras.new("WEB_Camera")
camera = bpy.data.objects.new("WEB_Camera", cam_data)
bpy.context.collection.objects.link(camera)
camera.location = (
    center.x + span * 2.35,
    center.y - span * 3.05,
    center.z + span * 1.28,
)
aim_at(camera, (center.x, center.y, center.z + size.z * 0.04))
cam_data.lens = 58
cam_data.sensor_width = 36
bpy.context.scene.camera = camera

# Large softbox setup: key, fill, rim and top light.
area_light(
    "WEB_Key",
    (center.x - span * 1.8, center.y - span * 2.1, center.z + span * 2.6),
    1550,
    (0.90, 1.0, 0.94),
    span * 2.0,
    center,
)
area_light(
    "WEB_Fill",
    (center.x + span * 2.3, center.y - span * 0.9, center.z + span * 1.15),
    920,
    (0.66, 0.83, 1.0),
    span * 1.5,
    center,
)
area_light(
    "WEB_Rim",
    (center.x - span * 1.2, center.y + span * 2.0, center.z + span * 1.8),
    1850,
    (0.25, 1.0, 0.56),
    span * 1.0,
    center,
)
area_light(
    "WEB_Top",
    (center.x, center.y, center.z + span * 3.1),
    1250,
    (1.0, 0.91, 0.74),
    span * 1.3,
    center,
)

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1400
scene.render.resolution_y = 1400
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.film_transparent = False
scene.render.image_settings.color_depth = "8"
scene.render.resolution_percentage = 100
scene.view_settings.look = "AgX - Medium High Contrast"

world = scene.world or bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.006, 0.010, 0.009, 1.0)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.17

# Opaque studio render.
scene.render.filepath = str(OUTPUT_DIR / "greencrop_nat_realistic_studio.png")
bpy.ops.render.render(write_still=True)

# Transparent web hero render.
floor.hide_render = True
scene.render.film_transparent = True
scene.render.filepath = str(OUTPUT_DIR / "greencrop_nat_realistic_transparent.png")
bpy.ops.render.render(write_still=True)
floor.hide_render = False
scene.render.film_transparent = False

# Export only product geometry, excluding presentation lights/camera/floor.
bpy.ops.object.select_all(action="DESELECT")
for obj in meshes:
    if obj.type == "MESH":
        obj.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.export_scene.gltf(
    filepath=str(PUBLIC_MODEL),
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_materials="EXPORT",
    export_yup=True,
)

bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_FILE))
print("WEB_ASSET_READY", BLEND_FILE, PUBLIC_MODEL)
