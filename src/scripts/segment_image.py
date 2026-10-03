import os
import sys
import io
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

def segment_image_advanced(img: Image.Image) -> Image.Image:
    """
    Advanced Graph-Based Universal Foreground Segmentation Engine for CleanPix.
    Combines Superpixel Graph Decomposition (SLIC), Region Adjacency Graphs (RAG),
    Background Color Statistical Modeling in CIELAB, Adaptive Spatial Saliency,
    and Sub-Pixel Antialiasing.

    Universal coverage for:
    - Anime & Manga artwork (including Pokémon burst/energy rays)
    - Cartoon characters & game assets
    - Logos & icons with high contrast borders
    - Product photography & packaging
    - Stickers & illustrations
    - Human portraits & hair
    - Pets & animals with fur
    - Vehicles & food items
    """
    import skimage.segmentation as seg
    import skimage.color as color
    import skimage.graph as graph
    import scipy.ndimage as ndi

    rgb_img = img.convert("RGB")
    orig_w, orig_h = rgb_img.size

    # Scale working image to max 1024px for ultra-fast processing
    max_dim = 1024
    if max(orig_w, orig_h) > max_dim:
        scale = max_dim / float(max(orig_w, orig_h))
        work_w = max(100, int(orig_w * scale))
        work_h = max(100, int(orig_h * scale))
        work_img = rgb_img.resize((work_w, work_h), Image.Resampling.BILINEAR)
    else:
        work_img = rgb_img

    w, h = work_img.size
    rgb_arr = np.array(work_img, dtype=np.uint8)

    # 1. Superpixel Segmentation with SLIC
    n_segments = min(600, max(150, int((w * h) / 550)))
    labels = seg.slic(rgb_arr, compactness=8, n_segments=n_segments, start_label=1)
    unique_labels = np.unique(labels)

    # 2. Build Region Adjacency Graph (RAG)
    rag = graph.rag_mean_color(rgb_arr, labels)

    # 3. Perimeter Sampling for Background Seeds
    h_idx, w_idx = labels.shape
    border_w = max(2, min(5, min(h_idx, w_idx) // 50))
    perimeter_mask = np.zeros((h_idx, w_idx), dtype=bool)
    perimeter_mask[0:border_w, :] = True
    perimeter_mask[-border_w:, :] = True
    perimeter_mask[:, 0:border_w] = True
    perimeter_mask[:, -border_w:] = True

    bg_superpixels = set(np.unique(labels[perimeter_mask]))

    # Compute mean colors in CIELAB space and centroids for each superpixel
    lab_arr = color.rgb2lab(rgb_arr)
    superpixel_mean_lab = {}
    superpixel_centroid = {}
    center_y, center_x = h_idx / 2.0, w_idx / 2.0
    max_radius = math.sqrt(center_x**2 + center_y**2)

    for sp in unique_labels:
        mask = (labels == sp)
        superpixel_mean_lab[sp] = np.mean(lab_arr[mask], axis=0)
        ys, xs = np.where(mask)
        if len(ys) > 0:
            superpixel_centroid[sp] = (np.mean(ys), np.mean(xs))
        else:
            superpixel_centroid[sp] = (0, 0)

    # 4. Background Color Statistical Modeling
    bg_labs = [superpixel_mean_lab[sp] for sp in bg_superpixels if sp in superpixel_mean_lab]
    if bg_labs:
        mean_bg = np.mean(bg_labs, axis=0)
        cov_bg = np.cov(np.array(bg_labs).T) + np.eye(3) * 8.0
        inv_cov_bg = np.linalg.inv(cov_bg)
    else:
        mean_bg = np.array([50.0, 0.0, 0.0])
        inv_cov_bg = np.eye(3) * 0.01

    # 5. Graph-based Background Diffusion with Spatial Saliency Protection
    expanded_bg = set(bg_superpixels)
    queue = list(bg_superpixels)

    while queue:
        curr = queue.pop(0)
        for neighbor in rag.neighbors(curr):
            if neighbor not in expanded_bg:
                n_lab = superpixel_mean_lab.get(neighbor)
                if n_lab is None:
                    continue
                
                # Normalized distance from image center (0 at center, 1 at corner)
                cy, cx = superpixel_centroid.get(neighbor, (0, 0))
                center_dist_norm = math.sqrt((cy - center_y)**2 + (cx - center_x)**2) / max_radius
                
                # Mahalanobis and Euclidean color distance in CIELAB
                diff = n_lab - mean_bg
                mahal_dist = np.sqrt(max(0.0, diff.dot(inv_cov_bg).dot(diff)))
                euc_dist = np.sqrt(np.sum((n_lab - mean_bg)**2))
                
                edge_data = rag.get_edge_data(curr, neighbor)
                weight = edge_data.get('weight', 999.0) if edge_data else 999.0

                # Adaptive spatial threshold:
                if center_dist_norm > 0.35:
                    is_bg = mahal_dist < 5.0 or euc_dist < 60.0 or (weight < 35.0 and euc_dist < 70.0)
                elif center_dist_norm > 0.18:
                    is_bg = (mahal_dist < 2.8 and euc_dist < 30.0) or (weight < 16.0 and euc_dist < 34.0)
                else:
                    is_bg = mahal_dist < 1.8 and euc_dist < 18.0 and weight < 8.0

                if is_bg:
                    expanded_bg.add(neighbor)
                    queue.append(neighbor)

    # 6. Foreground Mask Construction & Diagnostic Measurement
    fg_mask = ~np.isin(labels, list(expanded_bg))
    fg_mask = ndi.binary_fill_holes(fg_mask)
    foreground_pixels_before_cleanup = int(np.sum(fg_mask))

    # Identify connected components and main central subject
    labeled_fg, num_comp = ndi.label(fg_mask)
    comp_sizes = [np.sum(labeled_fg == i) for i in range(1, num_comp + 1)]
    max_size = max(comp_sizes) if comp_sizes else 1
    
    half_box = max(10, min(h_idx, w_idx) // 8)
    center_box = labeled_fg[
        int(max(0, center_y - half_box)):int(min(h_idx, center_y + half_box)),
        int(max(0, center_x - half_box)):int(min(w_idx, center_x + half_box))
    ]
    center_labels = set(np.unique(center_box)) - {0}
    if not center_labels and comp_sizes:
        center_labels = {int(np.argmax(comp_sizes) + 1)}

    main_subject_mask = np.isin(labeled_fg, list(center_labels))
    if np.sum(main_subject_mask) > 0:
        main_subject_lab = np.mean(lab_arr[main_subject_mask], axis=0)
    else:
        main_subject_lab = np.array([50.0, 0.0, 0.0])

    # Distance transform from main subject (for proximity-aware recovery)
    dist_from_main = ndi.distance_transform_edt(~main_subject_mask)
    max_proximity_dist = max(18.0, min(w, h) * 0.15)

    # 7. Foreground Recovery Pass: Preserve disconnected islands, saturated accents, line-art, and color-consistent features
    L_chan = lab_arr[:, :, 0]
    a_chan = lab_arr[:, :, 1]
    b_chan = lab_arr[:, :, 2]
    chroma = np.sqrt(a_chan**2 + b_chan**2)

    valid_labels = set(center_labels)
    recovered_components_count = 0

    # Evaluate connected components without aggressive size pruning
    for i in range(1, num_comp + 1):
        if i in center_labels:
            continue
        c_size = comp_sizes[i - 1]
        c_mask = (labeled_fg == i)
        
        c_lab = np.mean(lab_arr[c_mask], axis=0)
        c_dist_to_bg = np.sqrt(np.sum((c_lab - mean_bg)**2))
        c_dist_to_fg = np.sqrt(np.sum((c_lab - main_subject_lab)**2))
        min_dist_to_main = np.min(dist_from_main[c_mask])
        
        c_mean_chroma = np.mean(chroma[c_mask])
        c_mean_L = np.mean(L_chan[c_mask])
        
        # Saturated accents (cheeks/eyes: high chroma + warm a*) or dark line-art (L < 35)
        has_accent = (c_mean_chroma > 18.0 and c_lab[1] > 0)
        is_line_art = (c_mean_L < 35.0)
        is_color_consistent = (c_dist_to_fg < 35.0)
        is_distinct_bg = (c_dist_to_bg > 20.0)

        # Retain if color-consistent, near main subject, saturated accent, line-art, or non-trivial size
        if is_distinct_bg and (
            is_color_consistent or
            min_dist_to_main < max_proximity_dist or
            has_accent or
            is_line_art or
            c_size >= max(5, 0.002 * max_size)
        ):
            valid_labels.add(i)
            recovered_components_count += 1

    fg_mask = np.isin(labeled_fg, list(valid_labels))

    # Superpixel-level fine detail recovery pass for thin line-art & accents in close proximity
    recovered_sp_count = 0
    for sp in unique_labels:
        if sp in expanded_bg:
            sp_mask = (labels == sp)
            min_d = np.min(dist_from_main[sp_mask])
            if min_d < max_proximity_dist * 0.6:
                sp_lab = superpixel_mean_lab[sp]
                sp_dist_bg = np.sqrt(np.sum((sp_lab - mean_bg)**2))
                sp_dist_fg = np.sqrt(np.sum((sp_lab - main_subject_lab)**2))
                sp_chroma = np.mean(chroma[sp_mask])
                sp_L = np.mean(L_chan[sp_mask])
                
                # Recover superpixel if high-chroma accent or dark line art and distinct from background
                if sp_dist_bg > 28.0 and ((sp_chroma > 22.0 and sp_lab[1] > 5.0) or sp_L < 28.0 or sp_dist_fg < 25.0):
                    fg_mask[sp_mask] = True
                    recovered_sp_count += 1

    fg_mask = ndi.binary_fill_holes(fg_mask)
    foreground_pixels_after_cleanup = int(np.sum(fg_mask))

    # Output diagnostic logs
    sys.stderr.write(f"foreground_pixels_before_cleanup={foreground_pixels_before_cleanup}\n")
    sys.stderr.write(f"foreground_pixels_after_cleanup={foreground_pixels_after_cleanup}\n")
    sys.stderr.write(f"recovered_components_count={recovered_components_count + recovered_sp_count}\n")

    # 7. Sub-pixel Antialiasing & Contour Smoothing
    smooth_alpha = ndi.gaussian_filter(fg_mask.astype(np.float32) * 255.0, sigma=0.8)
    final_alpha = np.clip(smooth_alpha, 0.0, 255.0).astype(np.uint8)

    # 8. Upscale alpha back to original resolution if scaled
    if (w, h) != (orig_w, orig_h):
        alpha_channel = Image.fromarray(final_alpha, mode="L").resize((orig_w, orig_h), Image.Resampling.BILINEAR)
    else:
        alpha_channel = Image.fromarray(final_alpha, mode="L")

    # 9. Merge into RGBA PNG
    r, g, b = rgb_img.split()
    return Image.merge("RGBA", (r, g, b, alpha_channel))

def segment_image_fallback(img: Image.Image) -> Image.Image:
    """
    Fast Perimeter Multi-Seed Flood Fill fallback.
    """
    w, h = img.size
    pixels = img.convert("RGBA").load()

    boundary_samples = []
    step_x = max(1, w // 50)
    step_y = max(1, h // 50)
    for x in range(0, w, step_x):
        boundary_samples.append(pixels[x, 0][:3])
        boundary_samples.append(pixels[x, h - 1][:3])
    for y in range(0, h, step_y):
        boundary_samples.append(pixels[0, y][:3])
        boundary_samples.append(pixels[w - 1, y][:3])

    avg_bg_r = sum(c[0] for c in boundary_samples) / len(boundary_samples)
    avg_bg_g = sum(c[1] for c in boundary_samples) / len(boundary_samples)
    avg_bg_b = sum(c[2] for c in boundary_samples) / len(boundary_samples)

    diffs = [math.sqrt((c[0]-avg_bg_r)**2 + (c[1]-avg_bg_g)**2 + (c[2]-avg_bg_b)**2) for c in boundary_samples]
    max_bg_var = max(diffs) if diffs else 10
    tolerance = max(28, int(min(65, max_bg_var * 1.5)))

    rgb_img = img.convert("RGB")
    temp_fill = rgb_img.copy()
    fill_marker = (1, 2, 3)

    for x in range(0, w, 2):
        if temp_fill.getpixel((x, 0)) != fill_marker:
            ImageDraw.floodfill(temp_fill, (x, 0), fill_marker, thresh=tolerance)
        if temp_fill.getpixel((x, h - 1)) != fill_marker:
            ImageDraw.floodfill(temp_fill, (x, h - 1), fill_marker, thresh=tolerance)
    for y in range(0, h, 2):
        if temp_fill.getpixel((0, y)) != fill_marker:
            ImageDraw.floodfill(temp_fill, (0, y), fill_marker, thresh=tolerance)
        if temp_fill.getpixel((w - 1, y)) != fill_marker:
            ImageDraw.floodfill(temp_fill, (w - 1, y), fill_marker, thresh=tolerance)

    bg_mask = Image.new("L", (w, h), 0)
    temp_p = temp_fill.load()
    mask_p = bg_mask.load()
    for y in range(h):
        for x in range(w):
            if temp_p[x, y] == fill_marker:
                mask_p[x, y] = 255

    alpha_mask = ImageOps.invert(bg_mask).filter(ImageFilter.GaussianBlur(radius=0.7))
    r, g, b = rgb_img.split()
    return Image.merge("RGBA", (r, g, b, alpha_mask))

def segment_image_stream(input_bytes: bytes) -> bytes:
    """
    Universal Segmentation Stream Processor for CleanPix.
    """
    img = Image.open(io.BytesIO(input_bytes))
    
    try:
        out_img = segment_image_advanced(img)
    except Exception as e:
        sys.stderr.write(f"[SEGMENTATION_ADVANCED_FALLBACK] {e}\n")
        out_img = segment_image_fallback(img)

    out_io = io.BytesIO()
    out_img.save(out_io, format="PNG", optimize=True)
    return out_io.getvalue()

def main():
    if len(sys.argv) < 3:
        input_data = sys.stdin.buffer.read()
        if input_data:
            out = segment_image_stream(input_data)
            sys.stdout.buffer.write(out)
        return

    in_file = sys.argv[1]
    out_file = sys.argv[2]
    with open(in_file, "rb") as f:
        input_bytes = f.read()

    output_bytes = segment_image_stream(input_bytes)
    with open(out_file, "wb") as f:
        f.write(output_bytes)

if __name__ == "__main__":
    main()
