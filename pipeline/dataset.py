"""Dataset loader and augmentations for Sen1Floods11 hand-labelled Sentinel-1 chips.

Supports official splits: train (252), valid (89), test (90), bolivia (15).
Computes 3 input channels: VV, VH, and (VV - VH).
Normalizes strictly using statistics derived from the train split.
Masks no-data (-1) label pixels.
"""

from __future__ import annotations

import io
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Callable, List, Tuple

import numpy as np
import requests
import tifffile
import torch
from torch.utils.data import Dataset

SEN1FLOODS11_GCS_BASE = "https://storage.googleapis.com/sen1floods11/v1.1"

# Normalization parameters computed strictly from the train split:
TRAIN_STATS = {
    "vv_mean": -9.6400,
    "vv_std": 2.7252,
    "vh_mean": -15.9661,
    "vh_std": 3.1531,
    "diff_mean": 6.3261,
    "diff_std": 2.8825,
}


def load_split_chips(split_name: str) -> List[Tuple[str, str]]:
    """Download official Sen1Floods11 split file and return list of (s1_chip, label_chip)."""
    split_filename_map = {
        "train": "flood_train_data.csv",
        "valid": "flood_valid_data.csv",
        "test": "flood_test_data.csv",
        "bolivia": "flood_bolivia_data.csv",
    }
    fname = split_filename_map.get(split_name)
    if not fname:
        raise ValueError(f"Unknown split: {split_name}. Expected one of {list(split_filename_map.keys())}")

    url = f"{SEN1FLOODS11_GCS_BASE}/splits/flood_handlabeled/{fname}"
    resp = requests.get(url, timeout=15)
    resp.raise_for_status()

    pairs: List[Tuple[str, str]] = []
    for line in resp.text.strip().split("\n"):
        parts = [p.strip() for p in line.split(",") if p.strip()]
        if len(parts) >= 2:
            pairs.append((parts[0], parts[1]))
    return pairs


class Sen1Floods11Dataset(Dataset):
    """PyTorch Dataset for Sen1Floods11 Hand-Labeled Sentinel-1 chips."""

    def __init__(
        self,
        split: str = "train",
        cache_dir: Path | str = "data/cache/sen1floods11",
        crop_size: int = 256,
        is_train: bool = True,
        max_samples: int | None = None,
    ) -> None:
        self.split = split
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.crop_size = crop_size
        self.is_train = is_train

        self.chip_pairs = load_split_chips(split)
        if max_samples is not None:
            self.chip_pairs = self.chip_pairs[:max_samples]
        self._prefetch_all()

    def _prefetch_file(self, task: Tuple[str, str]) -> None:
        subpath, filename = task
        local_path = self.cache_dir / filename
        if local_path.is_file():
            return
        url = f"{SEN1FLOODS11_GCS_BASE}/data/flood_events/HandLabeled/{subpath}/{filename}"
        try:
            r = requests.get(url, timeout=25)
            if r.status_code == 200:
                with open(local_path, "wb") as f:
                    f.write(r.content)
        except Exception:
            pass

    def _prefetch_all(self) -> None:
        tasks = []
        for s1_name, lbl_name in self.chip_pairs:
            if not (self.cache_dir / s1_name).is_file():
                tasks.append(("S1Hand", s1_name))
            if not (self.cache_dir / lbl_name).is_file():
                tasks.append(("LabelHand", lbl_name))
        if tasks:
            with ThreadPoolExecutor(max_workers=16) as pool:
                list(pool.map(self._prefetch_file, tasks))

    def __len__(self) -> int:
        return len(self.chip_pairs)

    def _fetch_file(self, subpath: str, filename: str) -> bytes:
        """Fetch file from local disk cache or download from GCS public bucket."""
        local_path = self.cache_dir / filename
        if local_path.is_file():
            with open(local_path, "rb") as f:
                return f.read()

        url = f"{SEN1FLOODS11_GCS_BASE}/data/flood_events/HandLabeled/{subpath}/{filename}"
        r = requests.get(url, timeout=20)
        r.raise_for_status()

        with open(local_path, "wb") as f:
            f.write(r.content)
        return r.content

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        s1_name, lbl_name = self.chip_pairs[idx]

        s1_bytes = self._fetch_file("S1Hand", s1_name)
        lbl_bytes = self._fetch_file("LabelHand", lbl_name)

        s1_img = tifffile.imread(io.BytesIO(s1_bytes))  # shape: [2, H, W]
        lbl_img = tifffile.imread(io.BytesIO(lbl_bytes))  # shape: [H, W]

        vv = s1_img[0].astype(np.float32)
        vh = s1_img[1].astype(np.float32)

        # Replace NaNs/Infs with median
        vv_finite = np.isfinite(vv)
        vh_finite = np.isfinite(vh)
        vv_med = float(np.nanmedian(vv[vv_finite])) if np.any(vv_finite) else -10.0
        vh_med = float(np.nanmedian(vh[vh_finite])) if np.any(vh_finite) else -16.0

        vv = np.where(vv_finite, vv, vv_med)
        vh = np.where(vh_finite, vh, vh_med)

        # 3rd input channel: VV - VH difference
        diff = vv - vh

        # Normalize with train split statistics
        vv_norm = (vv - TRAIN_STATS["vv_mean"]) / TRAIN_STATS["vv_std"]
        vh_norm = (vh - TRAIN_STATS["vh_mean"]) / TRAIN_STATS["vh_std"]
        diff_norm = (diff - TRAIN_STATS["diff_mean"]) / TRAIN_STATS["diff_std"]

        # Stack into 3 channels [3, H, W]
        img_stack = np.stack([vv_norm, vh_norm, diff_norm], axis=0)
        lbl_stack = lbl_img.copy()

        # Training augmentations: random crop, flips, rotations
        _, h, w = img_stack.shape
        if self.is_train and h > self.crop_size and w > self.crop_size:
            top = np.random.randint(0, h - self.crop_size)
            left = np.random.randint(0, w - self.crop_size)
            img_stack = img_stack[:, top : top + self.crop_size, left : left + self.crop_size]
            lbl_stack = lbl_stack[top : top + self.crop_size, left : left + self.crop_size]

            # Horizontal flip
            if np.random.rand() > 0.5:
                img_stack = np.flip(img_stack, axis=2).copy()
                lbl_stack = np.flip(lbl_stack, axis=1).copy()

            # Vertical flip
            if np.random.rand() > 0.5:
                img_stack = np.flip(img_stack, axis=1).copy()
                lbl_stack = np.flip(lbl_stack, axis=0).copy()

            # Random 90 deg rotation
            k = np.random.randint(0, 4)
            if k > 0:
                img_stack = np.rot90(img_stack, k=k, axes=(1, 2)).copy()
                lbl_stack = np.rot90(lbl_stack, k=k, axes=(0, 1)).copy()

            # Mild speckle noise on SAR channels
            if np.random.rand() > 0.5:
                noise = np.random.normal(loc=0.0, scale=0.05, size=img_stack.shape).astype(np.float32)
                img_stack = img_stack + noise

        # Mask -1 label pixels (no data)
        valid_mask = (lbl_stack >= 0)
        clean_lbl = np.where(valid_mask, lbl_stack, 0).astype(np.float32)

        image_t = torch.from_numpy(img_stack)
        label_t = torch.from_numpy(clean_lbl).unsqueeze(0)  # [1, H, W]
        valid_t = torch.from_numpy(valid_mask).unsqueeze(0)  # [1, H, W]

        return image_t, label_t, valid_t
